const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const archiver = require('archiver');
const { authenticateToken } = require('../middleware/auth');
const { getUserStorageInfo } = require('../utils/storage');
const { FileStorageService } = require('../services/fileStorage');

const router = express.Router();
const prisma = new PrismaClient();
const fileStorage = new FileStorageService();

// Get user dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get storage info
    const storageInfo = await getUserStorageInfo(userId);

    // Get file counts
    const [totalFiles, totalFolders, recentFiles] = await Promise.all([
      prisma.file.count({ where: { userId } }),
      prisma.folder.count({ where: { userId } }),
      prisma.file.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          originalName: true,
          size: true,
          mimetype: true,
          createdAt: true
        }
      })
    ]);

    res.json({
      storageInfo,
      stats: {
        totalFiles,
        totalFolders,
        recentFiles: recentFiles.map(file => ({
          ...file,
          size: file.size.toString()
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Create folder
router.post('/folders', authenticateToken, async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    // Check if folder with same name exists in the same parent
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name,
        parentId: parentId || null,
        userId: req.user.id
      }
    });

    if (existingFolder) {
      return res.status(400).json({ error: 'Folder with this name already exists' });
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId || null,
        userId: req.user.id
      }
    });

    res.status(201).json({
      message: 'Folder created successfully',
      folder
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Get folders
router.get('/folders', authenticateToken, async (req, res) => {
  try {
    const { parentId } = req.query;

    const folders = await prisma.folder.findMany({
      where: {
        userId: req.user.id,
        parentId: parentId || null
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            files: true,
            children: true
          }
        }
      }
    });

    res.json({ folders });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: 'Failed to get folders' });
  }
});

// Delete folder
router.delete('/folders/:id', authenticateToken, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Recursive function to delete all files and subfolders
    const deleteRecursively = async (folderId) => {
      // Get all files in this folder
      const files = await prisma.file.findMany({
        where: {
          userId: req.user.id,
          folderId: folderId
        }
      });

      // Delete all files from storage and database
      for (const file of files) {
        try {
          console.log(`🔍 Processing file for deletion: ${file.originalName} (${file.storageKey})`);
          
          // Delete from external storage (B2)
          if (file.storageKey) {
            console.log(`🗑️  Deleting from B2: ${file.storageKey}`);
            await fileStorage.deleteFile(file.storageKey);
          } else {
            console.log(`⚠️  No storage key found for file: ${file.originalName}`);
          }
          
          // Delete from database
          await prisma.file.delete({
            where: { id: file.id }
          });

          // Update user storage (subtract file size)
          const { updateUserStorage } = require('../utils/storage');
          await updateUserStorage(req.user.id, -Number(file.size));
          
          console.log(`✅ File deleted successfully: ${file.originalName}`);
        } catch (error) {
          console.error(`❌ Failed to delete file ${file.originalName}:`, error);
          // Continue with other files even if one fails
        }
      }

      // Get all subfolders
      const subFolders = await prisma.folder.findMany({
        where: {
          userId: req.user.id,
          parentId: folderId
        }
      });

      // Recursively delete all subfolders
      for (const subFolder of subFolders) {
        await deleteRecursively(subFolder.id);
      }

      // Finally, delete the folder itself
      await prisma.folder.delete({
        where: { id: folderId }
      });
    };

    // Start recursive deletion
    await deleteRecursively(folder.id);

    res.json({ message: 'Folder and all contents deleted successfully' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Update user profile (only firstName and lastName)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        storageUsed: true,
        storageLimit: true,
        createdAt: true,
        subscription: {
          select: {
            plan: true,
            status: true
          }
        }
      }
    });

    // Convert BigInt to string for JSON serialization
    const user = {
      ...updatedUser,
      storageUsed: updatedUser.storageUsed.toString(),
      storageLimit: updatedUser.storageLimit.toString()
    };

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get user settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user settings from database or return defaults
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    const defaultSettings = {
      notifications: {
        email: true,
        push: true,
        fileSharing: true,
        storageAlerts: true,
        securityAlerts: true
      },
      privacy: {
        profileVisibility: 'private',
        shareAnalytics: false,
        twoFactorAuth: false
      },
      appearance: {
        theme: 'system',
        language: 'en'
      },
      storage: {
        autoDelete: false,
        deleteAfterDays: 30,
        compressionEnabled: true
      }
    };

    const settings = userSettings ? JSON.parse(userSettings.settings) : defaultSettings;

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update user settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;

    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        settings: JSON.stringify(settings)
      },
      create: {
        userId,
        settings: JSON.stringify(settings)
      }
    });

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Export user data
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user data
    const [user, files, folders] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          subscriptionTier: true,
          createdAt: true
        }
      }),
      prisma.file.findMany({
        where: { userId },
        select: {
          id: true,
          originalName: true,
          size: true,
          mimetype: true,
          createdAt: true,
          folder: {
            select: { name: true }
          }
        }
      }),
      prisma.folder.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          createdAt: true
        }
      })
    ]);

    const exportData = {
      user,
      files: files.map(file => ({
        ...file,
        size: file.size.toString()
      })),
      folders,
      exportDate: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="storeit-data.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all user files to delete from storage
    const userFiles = await prisma.file.findMany({
      where: { userId },
      select: {
        id: true,
        storageKey: true,
        originalName: true
      }
    });

    // Delete user data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete files from database first
      await tx.file.deleteMany({ where: { userId } });
      
      // Delete folders
      await tx.folder.deleteMany({ where: { userId } });
      
      // Delete user settings
      await tx.userSettings.deleteMany({ where: { userId } });
      
      // Delete user
      await tx.user.delete({ where: { id: userId } });
    });

    // Delete files from external storage (B2) after database cleanup
    // Do this after transaction to avoid issues if storage deletion fails
    for (const file of userFiles) {
      try {
        if (file.storageKey) {
          await fileStorage.deleteFile(file.storageKey);
        }
      } catch (error) {
        console.error(`Failed to delete file ${file.originalName} from storage:`, error);
        // Continue with other files - don't fail the entire account deletion
      }
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Share folder
router.post('/folders/:id/share', authenticateToken, async (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.id;
    const { shareType, email } = req.body;

    // Get folder info
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: userId
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (shareType === 'public') {
      // Create a public share link
      const shareToken = require('crypto').randomBytes(32).toString('hex');
      const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/shared/folder/${shareToken}`;
      
      // In a real app, you'd save this share token to database
      // For now, just return a mock URL
      res.json({ 
        shareUrl,
        message: 'Public share link created'
      });
    } else if (shareType === 'private' && email) {
      // For private sharing, you'd typically send an email invitation
      // For now, just return success
      res.json({ 
        message: `Folder shared privately with ${email}`
      });
    } else {
      res.status(400).json({ error: 'Invalid share type or missing email for private share' });
    }

  } catch (error) {
    console.error('Share folder error:', error);
    res.status(500).json({ error: 'Failed to share folder' });
  }
});

// Download folder as ZIP
router.get('/folders/:id/download', authenticateToken, async (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.id;

    // Get folder info
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: userId
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Get all files in this folder recursively
    const getAllFilesInFolder = async (currentFolderId, folderPath = '') => {
      const files = await prisma.file.findMany({
        where: {
          userId: userId,
          folderId: currentFolderId
        },
        select: {
          id: true,
          originalName: true,
          storageKey: true,
          mimetype: true
        }
      });

      const subFolders = await prisma.folder.findMany({
        where: {
          userId: userId,
          parentId: currentFolderId
        },
        select: {
          id: true,
          name: true
        }
      });

      let allFiles = files.map(file => ({
        ...file,
        folderPath
      }));

      // Recursively get files from subfolders
      for (const subFolder of subFolders) {
        const subFolderPath = folderPath ? `${folderPath}/${subFolder.name}` : subFolder.name;
        const subFiles = await getAllFilesInFolder(subFolder.id, subFolderPath);
        allFiles = allFiles.concat(subFiles);
      }

      return allFiles;
    };

    const allFiles = await getAllFilesInFolder(folderId);

    if (allFiles.length === 0) {
      return res.status(400).json({ error: 'Folder is empty' });
    }

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add files to archive
    for (const file of allFiles) {
      try {
        // Download file from storage
        const fileStream = await fileStorage.getFileStream(file.storageKey);
        
        // Convert stream to buffer for archiver
        const chunks = [];
        for await (const chunk of fileStream) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);
        
        // Add to archive with proper path
        const archivePath = file.folderPath 
          ? `${file.folderPath}/${file.originalName}`
          : file.originalName;
        
        archive.append(fileBuffer, { name: archivePath });
      } catch (error) {
        console.error(`Failed to add file ${file.originalName} to archive:`, error);
        // Continue with other files
      }
    }

    // Finalize the archive
    await archive.finalize();

  } catch (error) {
    console.error('Download folder error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download folder' });
    }
  }
});

// Get folder path for breadcrumb navigation
router.get('/folders/:id/path', authenticateToken, async (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.id;

    // Build path from root to current folder
    const buildPath = async (currentId, path = []) => {
      if (!currentId) return path;

      const folder = await prisma.folder.findFirst({
        where: {
          id: currentId,
          userId: userId
        },
        select: {
          id: true,
          name: true,
          parentId: true
        }
      });

      if (!folder) return path;

      // Add current folder to beginning of path
      path.unshift(folder);

      // Recursively build path to root
      if (folder.parentId) {
        return await buildPath(folder.parentId, path);
      }

      return path;
    };

    const path = await buildPath(folderId);

    res.json({ path });
  } catch (error) {
    console.error('Get folder path error:', error);
    res.status(500).json({ error: 'Failed to get folder path' });
  }
});

module.exports = router;
