const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Storage limits in bytes
const STORAGE_LIMITS = {
  FREE: 524288000,    // 500MB
  PRO: 10737418240,   // 10GB
  PREMIUM: 107374182400 // 100GB
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const updateUserStorage = async (userId, sizeChange) => {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        storageUsed: {
          increment: sizeChange
        }
      }
    });
    return user;
  } catch (error) {
    console.error('Error updating user storage:', error);
    throw error;
  }
};

const getUserStorageInfo = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const storageUsed = Number(user.storageUsed);
    const storageLimit = Number(user.storageLimit);
    const storagePercentage = (storageUsed / storageLimit) * 100;

    return {
      storageUsed: storageUsed,
      storageLimit: storageLimit,
      storageUsedFormatted: formatBytes(storageUsed),
      storageLimitFormatted: formatBytes(storageLimit),
      storagePercentage: Math.round(storagePercentage * 100) / 100,
      plan: user.subscription?.plan || 'FREE'
    };
  } catch (error) {
    console.error('Error getting user storage info:', error);
    throw error;
  }
};

module.exports = {
  STORAGE_LIMITS,
  formatBytes,
  updateUserStorage,
  getUserStorageInfo
};
