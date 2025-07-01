const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Storage limits in bytes
const STORAGE_LIMITS = {
  FREE: 524288000,        // 500MB
  PRO: 107374182400,      // 100GB  
  BUSINESS: 1099511627776 // 1TB
};

// File upload limits in bytes
const UPLOAD_LIMITS = {
  FREE: 107374182,        // 100MB per file
  PRO: 1073741824,        // 1GB per file
  BUSINESS: 5368709120    // 5GB per file
};

const formatBytes = (bytes) => {
  // Handle edge cases
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '0 Bytes';
  
  // Ensure non-negative
  const safeBytes = Math.max(0, Number(bytes));
  
  if (safeBytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(safeBytes) / Math.log(k));
  
  return parseFloat((safeBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const updateUserStorage = async (userId, sizeChange) => {
  try {
    // Get current storage to prevent negative values
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true }
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    // Convert current storage to number safely
    const currentStorageUsed = typeof currentUser.storageUsed === 'bigint' 
      ? Number(currentUser.storageUsed) 
      : Number(currentUser.storageUsed || 0);

    // Calculate new storage and ensure it doesn't go negative
    const newStorageUsed = Math.max(0, currentStorageUsed + sizeChange);
    
    console.log(`Storage update for user ${userId}:`, {
      currentStorageUsed,
      sizeChange,
      newStorageUsed,
      wouldGoNegative: (currentStorageUsed + sizeChange) < 0
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        storageUsed: BigInt(newStorageUsed)
      }
    });
    return user;
  } catch (error) {
    console.error('Error updating user storage:', error);
    throw error;
  }
};

const getUserUploadLimit = async (userId) => {
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

    const userPlan = user.subscription?.plan || 'FREE';
    const subscriptionStatus = user.subscription?.status || 'NONE';
    const uploadLimit = UPLOAD_LIMITS[userPlan] || UPLOAD_LIMITS.FREE;

    console.log(`📤 Upload limit for user ${user.email}:`, {
      userPlan,
      subscriptionStatus,
      uploadLimit,
      uploadLimitFormatted: formatBytes(uploadLimit),
      hasActiveSubscription: !!(user.subscription && user.subscription.status === 'ACTIVE')
    });

    return {
      uploadLimit,
      uploadLimitFormatted: formatBytes(uploadLimit),
      plan: userPlan
    };
  } catch (error) {
    console.error('Error getting user upload limit:', error);
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
    
    // Determine correct storage limit based on subscription plan
    const userPlan = user.subscription?.plan || 'FREE';
    const correctStorageLimit = STORAGE_LIMITS[userPlan] || STORAGE_LIMITS.FREE;
    
    // Use the correct limit based on plan, not the potentially outdated database value
    const storageLimit = correctStorageLimit;
    
    // Update user's storageLimit in database if it doesn't match the correct plan limit
    if (user.storageLimit !== BigInt(correctStorageLimit)) {
      console.log(`Updating storage limit for user ${userId} from ${user.storageLimit} to ${correctStorageLimit} (plan: ${userPlan})`);
      await prisma.user.update({
        where: { id: userId },
        data: { storageLimit: BigInt(correctStorageLimit) }
      });
    }
    
    // Extra safety check for NaN values and clamp negative values to 0
    const safeStorageUsed = Math.max(0, isNaN(storageUsed) ? 0 : storageUsed);
    const safeStorageLimit = storageLimit;
    
    const storagePercentage = safeStorageLimit > 0 ? (safeStorageUsed / safeStorageLimit) * 100 : 0;

    console.log(`Storage info for user ${userId}:`, {
      rawStorageUsed: user.storageUsed,
      rawStorageLimit: user.storageLimit,
      userPlan: userPlan,
      correctStorageLimit: correctStorageLimit,
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
  UPLOAD_LIMITS,
  formatBytes,
  updateUserStorage,
  getUserStorageInfo,
  getUserUploadLimit
};
