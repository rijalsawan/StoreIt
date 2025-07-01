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

    // Handle BigInt conversion safely
    const storageUsed = typeof user.storageUsed === 'bigint' 
      ? Number(user.storageUsed) 
      : Number(user.storageUsed || 0);
    
    const storageLimit = typeof user.storageLimit === 'bigint' 
      ? Number(user.storageLimit) 
      : Number(user.storageLimit || 1073741824); // Default 1GB
    
    // Extra safety check for NaN values
    const safeStorageUsed = isNaN(storageUsed) ? 0 : storageUsed;
    const safeStorageLimit = isNaN(storageLimit) ? 1073741824 : storageLimit;
    
    const storagePercentage = safeStorageLimit > 0 ? (safeStorageUsed / safeStorageLimit) * 100 : 0;

    console.log(`Storage info for user ${userId}:`, {
      rawStorageUsed: user.storageUsed,
      rawStorageLimit: user.storageLimit,
      rawTypes: `used: ${typeof user.storageUsed}, limit: ${typeof user.storageLimit}`,
      processedStorageUsed: safeStorageUsed,
      processedStorageLimit: safeStorageLimit,
      percentage: storagePercentage
    });

    return {
      storageUsed: safeStorageUsed,
      storageLimit: safeStorageLimit,
      storageUsedFormatted: formatBytes(safeStorageUsed),
      storageLimitFormatted: formatBytes(safeStorageLimit),
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
