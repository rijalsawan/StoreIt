const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { checkStorageLimit } = require('../middleware/subscription');
const { updateUserStorage, formatBytes } = require('../utils/storage');
const { FileStorageService } = require('../services/fileStorage');

const router = express.Router();
const prisma = new PrismaClient();
const fileStorage = new FileStorageService();

// Configure multer for temporary file uploads (to memory)
const upload = multer({
  storage: multer.memoryStorage(),
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

    // Upload to external storage
    const uploadResult = await fileStorage.uploadFile(
      {
        originalname: req.file.originalname,
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        size: req.file.size
      },
      req.user.id
    );

    // Create file record in database
    const file = await prisma.file.create({
      data: {
        filename: req.file.originalname, // Use original name as filename
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: BigInt(req.file.size),
        path: uploadResult.key, // Store the storage key as path
        storageProvider: process.env.STORAGE_PROVIDER || 'B2',
        storageKey: uploadResult.key,
        storageUrl: uploadResult.url,
        storageMetadata: JSON.stringify({
          etag: uploadResult.etag,
          versionId: uploadResult.versionId,
          uploadedAt: new Date().toISOString()
        }),
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

    // Handle external storage
    if (file.storageProvider && file.storageKey) {
      try {
        const downloadUrl = await fileStorage.getDownloadUrl(file.storageKey);
        
        // For direct download, we can either redirect or stream
        if (process.env.STORAGE_DIRECT_DOWNLOAD === 'true') {
          // Redirect to the storage URL for direct download
          return res.redirect(downloadUrl);
        } else {
          // Stream the file through our server
          const fileStream = await fileStorage.getFileStream(file.storageKey);
          
          res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
          res.setHeader('Content-Type', file.mimetype);
          
          fileStream.pipe(res);
          return;
        }
      } catch (error) {
        console.error('External storage download error:', error);
        return res.status(404).json({ error: 'File not found in storage' });
      }
    }

    // Fallback to local file system (for backward compatibility)
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

    // Delete from external storage
    if (file.storageProvider && file.storageKey) {
      try {
        console.log(`🔍 Deleting file from external storage - Provider: ${file.storageProvider}, Key: ${file.storageKey}`);
        await fileStorage.deleteFile(file.storageKey);
        console.log(`✅ File deleted from external storage: ${file.originalName}`);
      } catch (error) {
        console.error('❌ External storage deletion error:', error);
        // Continue with database deletion even if external storage fails
      }
    } else {
      console.log(`⚠️  File missing storage info - Provider: ${file.storageProvider}, Key: ${file.storageKey}`);
      // Delete from local filesystem (fallback)
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.log('File not found on disk, continuing with database deletion');
      }
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
