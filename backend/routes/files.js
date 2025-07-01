const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { checkStorageLimit } = require('../middleware/subscription');
const { updateUserStorage, formatBytes, getUserUploadLimit } = require('../utils/storage');
const { FileStorageService } = require('../services/fileStorage');

const router = express.Router();
const prisma = new PrismaClient();
const fileStorage = new FileStorageService();

// Configure multer for file uploads
// Use disk storage for large files to avoid memory issues
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../temp-uploads');
    require('fs').mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 1073741824, // Default 1GB (will be overridden dynamically)
    files: 10 // Allow up to 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Add file type restrictions if needed
    // For now, allow all file types
    cb(null, true);
  }
});

// Middleware to check user's upload limit before processing
const checkUploadLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const uploadInfo = await getUserUploadLimit(req.user.id);
    
    // Store upload limit in request for use by multer error handler
    req.userUploadLimit = uploadInfo.uploadLimit;
    req.userPlan = uploadInfo.plan;
    
    console.log(`Upload limit for user ${req.user.id} (${uploadInfo.plan}):`, {
      limit: uploadInfo.uploadLimitFormatted,
      bytes: uploadInfo.uploadLimit
    });
    
    next();
  } catch (error) {
    console.error('Error checking upload limit:', error);
    res.status(500).json({ error: 'Failed to check upload limit' });
  }
};

// Custom multer error handler with dynamic limits
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    
    const userUploadLimit = req.userUploadLimit || parseInt(process.env.MAX_FILE_SIZE) || 1073741824;
    const userPlan = req.userPlan || 'FREE';
    
    console.log('Upload limits:', {
      userPlan,
      userUploadLimit: formatBytes(userUploadLimit),
      globalMaxFileSize: process.env.MAX_FILE_SIZE
    });
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: `File size exceeds the ${formatBytes(userUploadLimit)} limit for ${userPlan} plan`,
        maxSize: userUploadLimit,
        maxSizeFormatted: formatBytes(userUploadLimit),
        plan: userPlan,
        code: 'LIMIT_FILE_SIZE'
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        error: 'Too many files',
        message: 'Maximum of 10 files allowed per upload',
        code: 'LIMIT_FILE_COUNT'
      });
    }
    
    return res.status(400).json({
      error: 'Upload error',
      message: err.message,
      code: err.code
    });
  }
  
  next(err);
};

// Dynamic upload middleware that checks user's file size limit
const dynamicUpload = async (req, res, next) => {
  try {
    // First check user's upload limit
    const uploadInfo = await getUserUploadLimit(req.user.id);
    
    // Store upload limit in request for use by multer error handler
    req.userUploadLimit = uploadInfo.uploadLimit;
    req.userPlan = uploadInfo.plan;
    
    console.log(`Upload attempt by user ${req.user.id} (${uploadInfo.plan}):`, {
      limit: uploadInfo.uploadLimitFormatted,
      bytes: uploadInfo.uploadLimit
    });
    
    // Create a custom multer instance with user-specific limits
    const userUpload = multer({
      storage: storage,
      limits: {
        fileSize: uploadInfo.uploadLimit,
        files: 10
      },
      fileFilter: (req, file, cb) => {
        cb(null, true);
      }
    });
    
    // Use the custom multer instance
    userUpload.single('file')(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
    
  } catch (error) {
    console.error('Error in dynamic upload middleware:', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
};

// Upload file
router.post('/upload', authenticateToken, dynamicUpload, checkStorageLimit, async (req, res) => {
  let tempFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { folderId } = req.body;
    tempFilePath = req.file.path;

    console.log(`🔄 Processing upload: ${req.file.originalname} (${req.file.size} bytes)`);

    // Read file for upload to external storage
    const fileBuffer = await fs.readFile(req.file.path);

    // Upload to external storage
    const uploadResult = await fileStorage.uploadFile(
      {
        originalname: req.file.originalname,
        buffer: fileBuffer,
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

    // Clean up temporary file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log(`🗑️  Cleaned up temp file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }

    // Update user storage
    await updateUserStorage(req.user.id, req.file.size);

    console.log(`✅ File uploaded successfully: ${req.file.originalname}`);

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
    
    // Clean up temporary file on error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log(`🗑️  Cleaned up temp file after error: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file after error:', cleanupError);
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

    // Update user storage - handle BigInt properly
    const fileSizeNumber = typeof file.size === 'bigint' ? Number(file.size) : Number(file.size || 0);
    console.log(`Updating storage: removing ${fileSizeNumber} bytes for user ${req.user.id}`);
    await updateUserStorage(req.user.id, -fileSizeNumber);

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

// Debug endpoint to check upload configuration
router.get('/upload-config', authenticateToken, async (req, res) => {
  try {
    const uploadInfo = await getUserUploadLimit(req.user.id);
    
    res.json({
      // User-specific limits
      userPlan: uploadInfo.plan,
      userMaxFileSize: uploadInfo.uploadLimit,
      userMaxFileSizeFormatted: uploadInfo.uploadLimitFormatted,
      
      // Global configuration
      globalMaxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 1073741824,
      maxFileSizeFormatted: formatBytes(parseInt(process.env.MAX_FILE_SIZE) || 1073741824),
      maxFiles: 10,
      
      // Environment info
      storageProvider: process.env.STORAGE_PROVIDER,
      environment: process.env.NODE_ENV,
      railwayEnvironment: process.env.RAILWAY_ENVIRONMENT || 'not-railway'
    });
  } catch (error) {
    console.error('Error getting upload config:', error);
    res.status(500).json({ error: 'Failed to get upload configuration' });
  }
});

module.exports = router;
