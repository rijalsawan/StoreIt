const checkStorageLimit = async (req, res, next) => {
  try {
    const user = req.user;
    const fileSize = req.file ? req.file.size : 0;
    
    // Check if user has enough storage space
    const newStorageUsed = BigInt(user.storageUsed) + BigInt(fileSize);
    
    if (newStorageUsed > BigInt(user.storageLimit)) {
      return res.status(413).json({ 
        error: 'Storage limit exceeded',
        message: 'Upgrade your plan to get more storage space',
        storageUsed: user.storageUsed.toString(),
        storageLimit: user.storageLimit.toString()
      });
    }
    
    req.newStorageUsed = newStorageUsed;
    next();
  } catch (error) {
    console.error('Storage check error:', error);
    res.status(500).json({ error: 'Failed to check storage limit' });
  }
};

const checkSubscriptionFeatures = (requiredPlan = 'FREE') => {
  return (req, res, next) => {
    const user = req.user;
    const userPlan = user.subscription?.plan || 'FREE';
    
    const planHierarchy = {
      'FREE': 0,
      'PRO': 1,
      'PREMIUM': 2
    };
    
    if (planHierarchy[userPlan] < planHierarchy[requiredPlan]) {
      return res.status(403).json({
        error: 'Subscription required',
        message: `This feature requires a ${requiredPlan} subscription or higher`,
        currentPlan: userPlan,
        requiredPlan
      });
    }
    
    next();
  };
};

module.exports = { checkStorageLimit, checkSubscriptionFeatures };
