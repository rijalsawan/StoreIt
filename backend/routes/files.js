const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { checkStorageLimit } = require('../middleware/subscription');
const { updateUserStorage, formatBytes } = require('../utils/storage');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), '..', 'uploads', req.user.id);
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 // 50MB default
  },
  fileFilter: (req, file, cb) => {
    // Add file type restrictions if needed
    cb(null, true);
  }
});

// Upload file
router.post('/upload', authenticateToken, upload.single('file'), checkStorageLimit, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { folderId } = req.body;

    // Create file record in database
    const file = await prisma.file.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: BigInt(req.file.size),
        path: req.file.path,
        userId: req.user.id,
        folderId: folderId || null
      }
    });

    // Update user storage
    await updateUserStorage(req.user.id, req.file.size);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: file.id,
        originalName: file.originalName,
        size: file.size.toString(),
        sizeFormatted: formatBytes(Number(file.size)),
        mimetype: file.mimetype,
        createdAt: file.createdAt
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up file if database operation failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError);
      }
    }
    
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get user files
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { folderId, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {
      userId: req.user.id,
      folderId: folderId || null
    };

    if (search) {
      where.originalName = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const [files, totalCount] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit),
        include: {
          folder: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.file.count({ where })
    ]);

    const formattedFiles = files.map(file => ({
      id: file.id,
      originalName: file.originalName,
      size: file.size.toString(),
      sizeFormatted: formatBytes(Number(file.size)),
      mimetype: file.mimetype,
      isPublic: file.isPublic,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      folder: file.folder
    }));

    res.json({
      files: formattedFiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// Download file
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if file exists on filesystem
    try {
      await fs.access(file.path);
    } catch (error) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    
    const fileStream = require('fs').createReadStream(file.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Delete file
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const file = await prisma.file.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.log('File not found on disk, continuing with database deletion');
    }

    // Delete from database
    await prisma.file.delete({
      where: { id: file.id }
    });

    // Update user storage
    await updateUserStorage(req.user.id, -Number(file.size));

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Share file (generate public link)
router.post('/:id/share', authenticateToken, async (req, res) => {
  try {
    const { expiresIn } = req.body; // hours
    
    const file = await prisma.file.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const token = uuidv4();
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000) : null;

    const sharedFile = await prisma.sharedFile.create({
      data: {
        fileId: file.id,
        userId: req.user.id,
        token,
        expiresAt
      }
    });

    res.json({
      message: 'File shared successfully',
      shareUrl: `${process.env.CLIENT_URL}/shared/${token}`,
      token,
      expiresAt
    });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Failed to share file' });
  }
});

module.exports = router;
