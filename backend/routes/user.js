const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const { getUserStorageInfo } = require('../utils/storage');

const router = express.Router();
const prisma = new PrismaClient();

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
      },
      include: {
        files: true,
        children: true
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check if folder has files or subfolders
    if (folder.files.length > 0 || folder.children.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete folder that contains files or subfolders' 
      });
    }

    await prisma.folder.delete({
      where: { id: folder.id }
    });

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const userId = req.user.id;

    // Check if email is already taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email is already taken' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        subscriptionTier: true,
        storageUsed: true,
        storageLimit: true,
        createdAt: true
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

    // Delete user data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete files (file system cleanup should be handled separately)
      await tx.file.deleteMany({ where: { userId } });
      
      // Delete folders
      await tx.folder.deleteMany({ where: { userId } });
      
      // Delete user settings
      await tx.userSettings.deleteMany({ where: { userId } });
      
      // Delete user
      await tx.user.delete({ where: { id: userId } });
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
