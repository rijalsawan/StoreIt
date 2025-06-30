// File Storage Service - Production-Ready Implementation
// Supports S3, Backblaze B2, Cloudflare R2, and other S3-compatible services

const AWS = require('aws-sdk');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class FileStorageService {
  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 'LOCAL'; // S3, B2, R2, LOCAL
    console.log(`🔧 FileStorageService initializing with provider: ${this.provider}`);
    this.initializeClient();
  }

  initializeClient() {
    console.log(`🔧 Initializing client for provider: ${this.provider}`);
    
    if (this.provider === 'LOCAL') {
      console.log(`📁 Using local filesystem storage`);
      return; // Use local filesystem for development
    }

    // Configure for different providers
    const config = {
      accessKeyId: process.env.STORAGE_ACCESS_KEY,
      secretAccessKey: process.env.STORAGE_SECRET_KEY,
      region: process.env.STORAGE_REGION || 'us-east-1',
    };

    console.log(`🔧 Base config:`, {
      accessKeyId: config.accessKeyId ? '***SET***' : 'NOT SET',
      secretAccessKey: config.secretAccessKey ? '***SET***' : 'NOT SET',
      region: config.region
    });

    // Provider-specific configurations
    switch (this.provider) {
      case 'S3':
        console.log(`🔧 Configuring for AWS S3`);
        // AWS S3 - no additional config needed
        break;
      
      case 'B2': // Backblaze B2
        console.log(`🔧 Configuring for Backblaze B2`);
        config.endpoint = process.env.STORAGE_ENDPOINT || process.env.B2_ENDPOINT || 'https://s3.us-west-002.backblazeb2.com';
        config.s3ForcePathStyle = true;
        config.signatureVersion = 'v4';
        config.s3DisableBodySigning = false;
        console.log(`🔧 B2 Config:`, {
          endpoint: config.endpoint,
          s3ForcePathStyle: config.s3ForcePathStyle
        });
        break;
      
      case 'R2': // Cloudflare R2
        console.log(`🔧 Configuring for Cloudflare R2`);
        config.endpoint = process.env.R2_ENDPOINT;
        config.s3ForcePathStyle = true;
        break;
      
      case 'MINIO': // Self-hosted MinIO
        console.log(`🔧 Configuring for MinIO`);
        config.endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
        config.s3ForcePathStyle = true;
        config.signatureVersion = 'v4';
        break;
    }

    this.client = new AWS.S3(config);
    this.bucketName = process.env.STORAGE_BUCKET_NAME;
    console.log(`✅ S3 client initialized. Bucket: ${this.bucketName}`);
  }

  // Generate unique file key
  generateFileKey(userId, originalName) {
    const timestamp = Date.now();
    const random = uuidv4().split('-')[0];
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext).toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    return `users/${userId}/${timestamp}-${random}-${baseName}${ext}`;
  }

  // Upload file to storage
  async uploadFile(file, userId, options = {}) {
    try {
      console.log(`📤 Attempting to upload file: ${file.originalname} using provider: ${this.provider}`);
      console.log(`🔧 Bucket: ${this.bucketName}, UserId: ${userId}`);
      
      if (this.provider === 'LOCAL') {
        console.log(`📁 Using local storage for: ${file.originalname}`);
        return this.uploadFileLocal(file, userId);
      }

      const fileKey = this.generateFileKey(userId, file.originalname);
      console.log(`🔑 Generated file key: ${fileKey}`);
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
        // Optional: Add metadata
        Metadata: {
          userId: userId,
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
        // Optional: Set ACL (be careful with public access)
        ACL: options.isPublic ? 'public-read' : 'private',
      };

      console.log(`🚀 Uploading to B2 with params:`, {
        bucket: uploadParams.Bucket,
        key: uploadParams.Key,
        contentType: uploadParams.ContentType,
        size: file.buffer.length
      });

      const result = await this.client.upload(uploadParams).promise();
      console.log(`✅ File uploaded successfully to B2:`, {
        key: fileKey,
        location: result.Location,
        etag: result.ETag
      });
      
      return {
        key: fileKey,
        url: result.Location,
        etag: result.ETag,
        provider: this.provider,
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  // Local file upload (for development)
  async uploadFileLocal(file, userId) {
    const fs = require('fs').promises;
    const uploadDir = path.join(process.cwd(), '..', 'uploads', userId);
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filename = this.generateFileKey(userId, file.originalname);
    const filepath = path.join(uploadDir, filename);
    
    await fs.writeFile(filepath, file.buffer);
    
    return {
      key: filename,
      url: `/uploads/${userId}/${filename}`,
      provider: 'LOCAL',
    };
  }

  // Generate signed URL for secure downloads
  async getSignedDownloadUrl(fileKey, expiresIn = 3600) {
    try {
      if (this.provider === 'LOCAL') {
        // For local files, return direct URL (implement your own auth)
        return `/api/files/download/${fileKey}`;
      }

      const params = {
        Bucket: this.bucketName,
        Key: fileKey,
        Expires: expiresIn, // 1 hour default
      };

      return this.client.getSignedUrl('getObject', params);
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }
  }

  // Alias for getSignedDownloadUrl for backward compatibility
  async getDownloadUrl(fileKey, expiresIn = 3600) {
    return this.getSignedDownloadUrl(fileKey, expiresIn);
  }

  // Get file stream for streaming downloads
  async getFileStream(fileKey) {
    try {
      if (this.provider === 'LOCAL') {
        const fs = require('fs');
        const filepath = path.join(process.cwd(), '..', 'uploads', fileKey);
        return fs.createReadStream(filepath);
      }

      const params = {
        Bucket: this.bucketName,
        Key: fileKey,
      };

      return this.client.getObject(params).createReadStream();
    } catch (error) {
      console.error('Error getting file stream:', error);
      throw new Error(`Failed to get file stream: ${error.message}`);
    }
  }

  // Delete file from storage
  async deleteFile(fileKey) {
    try {
      console.log(`🗑️  Attempting to delete file: ${fileKey} using provider: ${this.provider}`);
      
      if (this.provider === 'LOCAL') {
        const fs = require('fs').promises;
        const filepath = path.join(process.cwd(), '..', 'uploads', fileKey);
        await fs.unlink(filepath);
        console.log(`✅ File deleted from local storage: ${fileKey}`);
        return;
      }

      const params = {
        Bucket: this.bucketName,
        Key: fileKey,
      };

      console.log(`🔧 Deleting from B2 with params:`, { bucket: this.bucketName, key: fileKey });
      await this.client.deleteObject(params).promise();
      console.log(`✅ File deleted from B2 storage: ${fileKey}`);
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  // Get file metadata
  async getFileMetadata(fileKey) {
    try {
      if (this.provider === 'LOCAL') {
        const fs = require('fs').promises;
        const filepath = path.join(process.cwd(), '..', 'uploads', fileKey);
        const stats = await fs.stat(filepath);
        return {
          size: stats.size,
          lastModified: stats.mtime,
          exists: true,
        };
      }

      const params = {
        Bucket: this.bucketName,
        Key: fileKey,
      };

      const metadata = await this.client.headObject(params).promise();
      return {
        size: metadata.ContentLength,
        lastModified: metadata.LastModified,
        contentType: metadata.ContentType,
        etag: metadata.ETag,
        exists: true,
      };
    } catch (error) {
      if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
        return { exists: false };
      }
      throw error;
    }
  }

  // Copy file (useful for file versioning)
  async copyFile(sourceKey, destinationKey) {
    try {
      if (this.provider === 'LOCAL') {
        const fs = require('fs').promises;
        const sourcePath = path.join(process.cwd(), '..', 'uploads', sourceKey);
        const destPath = path.join(process.cwd(), '..', 'uploads', destinationKey);
        await fs.copyFile(sourcePath, destPath);
        return;
      }

      const params = {
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey,
      };

      await this.client.copyObject(params).promise();
    } catch (error) {
      console.error('Error copying file:', error);
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  // List files (useful for admin/debugging)
  async listFiles(userId, prefix = '', maxKeys = 1000) {
    try {
      if (this.provider === 'LOCAL') {
        const fs = require('fs').promises;
        const uploadDir = path.join(process.cwd(), '..', 'uploads', userId);
        const files = await fs.readdir(uploadDir);
        return files.filter(f => f.startsWith(prefix));
      }

      const params = {
        Bucket: this.bucketName,
        Prefix: `users/${userId}/${prefix}`,
        MaxKeys: maxKeys,
      };

      const result = await this.client.listObjectsV2(params).promise();
      return result.Contents || [];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }
}

// Configure multer for memory storage (don't save to disk first)
const configureMulter = () => {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
    },
    fileFilter: (req, file, cb) => {
      // Add file type restrictions if needed
      const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [];
      
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return cb(new Error('File type not allowed'), false);
      }
      
      cb(null, true);
    },
  });
};

module.exports = {
  FileStorageService,
  configureMulter,
};
