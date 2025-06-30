// Updated File Routes with External Storage Support
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { checkStorageLimit } = require('../middleware/subscription');
const { updateUserStorage, formatBytes } = require('../utils/storage');
const { FileStorageService, configureMulter } = require('../services/fileStorage');

const router = express.Router();
const prisma = new PrismaClient();
const fileStorage = new FileStorageService();
const upload = configureMulter();

// Upload file with external storage
router.post('/upload', authenticateToken, upload.single('file'), checkStorageLimit, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { folderId } = req.body;
    const userId = req.user.id;

    // Upload to external storage
    const storageResult = await fileStorage.uploadFile(req.file, userId);

    // Create file record in database with storage reference
    const file = await prisma.file.create({
      data: {
        filename: storageResult.key, // Storage key instead of local filename
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: BigInt(req.file.size),
        path: storageResult.key, // Storage key for compatibility
        storageKey: storageResult.key, // Explicit storage reference
        storageProvider: storageResult.provider,
        storageUrl: storageResult.url,
        userId: userId,
        folderId: folderId || null
      }
    });

    // Update user storage
    await updateUserStorage(userId, req.file.size);

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
    
    // If database operation failed but file was uploaded, clean up
    if (storageResult?.key) {
      try {
        await fileStorage.deleteFile(storageResult.key);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to upload file' 
    });
  }
});

// Download file with signed URLs
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

    // For external storage, generate signed URL
    if (file.storageProvider && file.storageProvider !== 'LOCAL') {
      const signedUrl = await fileStorage.getSignedDownloadUrl(
        file.storageKey || file.path,
        3600 // 1 hour expiration
      );

      return res.json({
        downloadUrl: signedUrl,
        fileName: file.originalName,
        expiresIn: 3600
      });
    }

    // For local files, stream directly (legacy support)
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.isAbsolute(file.path) 
      ? file.path 
      : path.join(process.cwd(), '..', 'uploads', file.path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Delete file from both database and storage
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
    if (file.storageProvider && file.storageProvider !== 'LOCAL') {
      try {
        await fileStorage.deleteFile(file.storageKey || file.path);
      } catch (storageError) {
        console.error('Failed to delete from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    } else {
      // Delete local file (legacy support)
      try {
        const fs = require('fs').promises;
        const path = require('path');
        
        const filePath = path.isAbsolute(file.path) 
          ? file.path 
          : path.join(process.cwd(), '..', 'uploads', file.path);
          
        await fs.unlink(filePath);
      } catch (fsError) {
        console.log('Local file not found on disk, continuing with database deletion');
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

// Get user files with pagination
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
      storageProvider: file.storageProvider || 'LOCAL',
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

// Share file (generate public link with signed URL)
router.post('/:id/share', authenticateToken, async (req, res) => {
  try {
    const { expiresIn = 24 } = req.body; // hours
    
    const file = await prisma.file.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const { v4: uuidv4 } = require('uuid');
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);

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

// Access shared file
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const sharedFile = await prisma.sharedFile.findUnique({
      where: { token },
      include: {
        file: true,
        user: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!sharedFile) {
      return res.status(404).json({ error: 'Shared file not found' });
    }

    if (sharedFile.expiresAt && new Date() > sharedFile.expiresAt) {
      return res.status(410).json({ error: 'Shared link has expired' });
    }

    const file = sharedFile.file;

    // Generate download URL
    let downloadUrl;
    if (file.storageProvider && file.storageProvider !== 'LOCAL') {
      downloadUrl = await fileStorage.getSignedDownloadUrl(
        file.storageKey || file.path,
        3600 // 1 hour
      );
    } else {
      downloadUrl = `/api/files/shared/${token}/download`;
    }

    res.json({
      file: {
        id: file.id,
        originalName: file.originalName,
        size: file.size.toString(),
        sizeFormatted: formatBytes(Number(file.size)),
        mimetype: file.mimetype,
        createdAt: file.createdAt,
        downloadUrl
      },
      sharedBy: `${sharedFile.user.firstName} ${sharedFile.user.lastName}`,
      expiresAt: sharedFile.expiresAt
    });
  } catch (error) {
    console.error('Shared file access error:', error);
    res.status(500).json({ error: 'Failed to access shared file' });
  }
});

// Download shared file
router.get('/shared/:token/download', async (req, res) => {
  try {
    const { token } = req.params;

    const sharedFile = await prisma.sharedFile.findUnique({
      where: { token },
      include: { file: true }
    });

    if (!sharedFile) {
      return res.status(404).json({ error: 'Shared file not found' });
    }

    if (sharedFile.expiresAt && new Date() > sharedFile.expiresAt) {
      return res.status(410).json({ error: 'Shared link has expired' });
    }

    const file = sharedFile.file;

    // For external storage, redirect to signed URL
    if (file.storageProvider && file.storageProvider !== 'LOCAL') {
      const signedUrl = await fileStorage.getSignedDownloadUrl(
        file.storageKey || file.path,
        300 // 5 minutes for direct download
      );
      return res.redirect(signedUrl);
    }

    // For local files, stream directly
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.isAbsolute(file.path) 
      ? file.path 
      : path.join(process.cwd(), '..', 'uploads', file.path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Shared file download error:', error);
    res.status(500).json({ error: 'Failed to download shared file' });
  }
});

module.exports = router;
