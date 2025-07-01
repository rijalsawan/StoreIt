const { PrismaClient } = require('@prisma/client');
const { STORAGE_LIMITS } = require('../utils/storage');

const prisma = new PrismaClient();

async function fixStorageLimits() {
  console.log('🔧 Starting storage limit fix...');
  
  try {
    // Get all users with their subscriptions
    const users = await prisma.user.findMany({
      include: {
        subscription: true
      }
    });

    console.log(`📊 Found ${users.length} users to check`);

    let fixedCount = 0;

    for (const user of users) {
      // Determine the correct plan
      const userPlan = user.subscription?.plan || 'FREE';
      const correctStorageLimit = STORAGE_LIMITS[userPlan] || STORAGE_LIMITS.FREE;
      
      // Check if the user's storage limit is incorrect
      const currentStorageLimit = typeof user.storageLimit === 'bigint' 
        ? Number(user.storageLimit) 
        : Number(user.storageLimit);

      if (currentStorageLimit !== correctStorageLimit) {
        console.log(`👤 User ${user.id} (${user.email}):`, {
          plan: userPlan,
          currentLimit: currentStorageLimit,
          correctLimit: correctStorageLimit,
          needsFix: true
        });

        // Update the user's storage limit
        await prisma.user.update({
          where: { id: user.id },
          data: {
            storageLimit: BigInt(correctStorageLimit)
          }
        });

        fixedCount++;
      } else {
        console.log(`✅ User ${user.id} (${user.email}): Storage limit correct (${userPlan} - ${correctStorageLimit} bytes)`);
      }
    }

    console.log(`🎉 Storage limit fix completed!`);
    console.log(`   - Total users checked: ${users.length}`);
    console.log(`   - Users fixed: ${fixedCount}`);
    console.log(`   - Users already correct: ${users.length - fixedCount}`);

  } catch (error) {
    console.error('❌ Error fixing storage limits:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixStorageLimits()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixStorageLimits };
