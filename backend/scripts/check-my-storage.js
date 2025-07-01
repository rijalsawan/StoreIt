const { PrismaClient } = require('@prisma/client');
const { STORAGE_LIMITS, formatBytes } = require('../utils/storage');

const prisma = new PrismaClient();

async function checkMyStorageLimit() {
  console.log('🔍 Checking Your Current Storage Limit...\n');
  
  try {
    // Check your specific user (replace with your email)
    const userEmail = 'rijalsawan@gmail.com';
    
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        subscription: true
      }
    });

    if (!user) {
      console.log(`❌ User not found: ${userEmail}`);
      return;
    }

    const userPlan = user.subscription?.plan || 'FREE';
    const currentStorageLimit = Number(user.storageLimit);
    const expectedStorageLimit = STORAGE_LIMITS[userPlan] || STORAGE_LIMITS.FREE;
    const storageUsed = Number(user.storageUsed);

    console.log('👤 User Information:');
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   📊 Plan: ${userPlan}`);
    console.log(`   📅 Created: ${user.createdAt.toLocaleDateString()}`);
    
    console.log('\n💾 Storage Information:');
    console.log(`   📏 Current Limit: ${formatBytes(currentStorageLimit)} (${currentStorageLimit} bytes)`);
    console.log(`   📐 Expected Limit: ${formatBytes(expectedStorageLimit)} (${expectedStorageLimit} bytes)`);
    console.log(`   📊 Used: ${formatBytes(storageUsed)} (${storageUsed} bytes)`);
    console.log(`   📈 Usage: ${((storageUsed / currentStorageLimit) * 100).toFixed(2)}%`);

    if (user.subscription) {
      console.log('\n💳 Subscription Details:');
      console.log(`   🏷️  Plan: ${user.subscription.plan}`);
      console.log(`   📅 Status: ${user.subscription.status}`);
      console.log(`   🔄 Period End: ${user.subscription.currentPeriodEnd.toLocaleDateString()}`);
      console.log(`   ⏹️  Cancel at End: ${user.subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}`);
    } else {
      console.log('\n💳 Subscription: None (FREE plan)');
    }

    console.log('\n🔍 Validation Results:');
    
    if (currentStorageLimit === expectedStorageLimit) {
      console.log('   ✅ Storage limit is CORRECT for your plan!');
    } else {
      console.log('   ❌ Storage limit MISMATCH detected!');
      console.log(`      Expected: ${formatBytes(expectedStorageLimit)}`);
      console.log(`      Current:  ${formatBytes(currentStorageLimit)}`);
      console.log('\n   💡 To fix this, run: node scripts/fix-storage-limits.js');
    }

    // Check if close to limit
    const usagePercentage = (storageUsed / currentStorageLimit) * 100;
    if (usagePercentage > 90) {
      console.log('   ⚠️  WARNING: You are using over 90% of your storage!');
    } else if (usagePercentage > 75) {
      console.log('   ⚠️  NOTICE: You are using over 75% of your storage.');
    } else {
      console.log('   ✅ Storage usage is within normal limits.');
    }

  } catch (error) {
    console.error('❌ Error checking storage limit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Allow customizing the email via command line argument
const customEmail = process.argv[2];
if (customEmail) {
  console.log(`🔍 Checking storage limit for: ${customEmail}\n`);
  // You would need to modify the function to accept email parameter
}

if (require.main === module) {
  checkMyStorageLimit()
    .then(() => {
      console.log('\n✅ Storage limit check completed!');
    })
    .catch((error) => {
      console.error('\n❌ Check failed:', error);
    });
}

module.exports = { checkMyStorageLimit };
