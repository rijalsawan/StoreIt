const { PrismaClient } = require('@prisma/client');
const { getUserUploadLimit } = require('../utils/storage');

const prisma = new PrismaClient();

async function debugUploadLimits() {
  console.log('🔍 Debugging Upload Limits for All Users');
  console.log('='.repeat(50));
  
  try {
    const users = await prisma.user.findMany({
      include: { subscription: true }
    });
    
    for (const user of users) {
      console.log(`\n👤 ${user.email}`);
      console.log(`   Subscription:`, user.subscription ? {
        plan: user.subscription.plan,
        status: user.subscription.status,
        periodEnd: user.subscription.currentPeriodEnd?.toISOString()?.split('T')[0],
        isActive: user.subscription.status === 'ACTIVE'
      } : 'None');
      
      // Test the getUserUploadLimit function
      try {
        const uploadInfo = await getUserUploadLimit(user.id);
        console.log(`   Upload Limit:`, uploadInfo);
        console.log(`   Expected:`, user.subscription?.status === 'ACTIVE' ? 
          `${user.subscription.plan} limits` : 'FREE limits (100MB)');
      } catch (error) {
        console.log(`   ❌ Error getting upload limit:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUploadLimits();
