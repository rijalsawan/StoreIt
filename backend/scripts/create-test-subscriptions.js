const { PrismaClient } = require('@prisma/client');
const { STORAGE_LIMITS } = require('../utils/storage');

const prisma = new PrismaClient();

async function createTestSubscriptions() {
  console.log('🧪 Creating Test Subscriptions for PRO and BUSINESS Plans');
  console.log('='.repeat(60));
  
  try {
    // Find users without subscriptions to upgrade
    const freeUsers = await prisma.user.findMany({
      where: {
        subscription: null,
        email: {
          in: ['test@gmail.com', 'pwnrijal@gmail.com']
        }
      }
    });
    
    console.log(`📋 Found ${freeUsers.length} users to upgrade`);
    
    if (freeUsers.length >= 1) {
      // Make first user PRO
      const proUser = freeUsers[0];
      console.log(`\n💎 Upgrading ${proUser.email} to PRO plan...`);
      
      await prisma.user.update({
        where: { id: proUser.id },
        data: {
          storageLimit: BigInt(STORAGE_LIMITS.PRO),
          subscription: {
            create: {
              stripeSubId: 'test_pro_' + Date.now(),
              status: 'ACTIVE',
              plan: 'PRO',
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              cancelAtPeriodEnd: false
            }
          }
        }
      });
      
      console.log(`✅ ${proUser.email} is now PRO with 100GB storage and 1GB upload limit`);
    }
    
    if (freeUsers.length >= 2) {
      // Make second user BUSINESS
      const businessUser = freeUsers[1];
      console.log(`\n🏢 Upgrading ${businessUser.email} to BUSINESS plan...`);
      
      await prisma.user.update({
        where: { id: businessUser.id },
        data: {
          storageLimit: BigInt(STORAGE_LIMITS.BUSINESS),
          subscription: {
            create: {
              stripeSubId: 'test_business_' + Date.now(),
              status: 'ACTIVE',
              plan: 'BUSINESS',
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              cancelAtPeriodEnd: false
            }
          }
        }
      });
      
      console.log(`✅ ${businessUser.email} is now BUSINESS with 1TB storage and 5GB upload limit`);
    }
    
    // Show final status
    console.log('\n📊 Final User Status:');
    console.log('-'.repeat(40));
    
    const allUsers = await prisma.user.findMany({
      include: { subscription: true }
    });
    
    for (const user of allUsers) {
      const plan = user.subscription?.plan || 'FREE';
      const status = user.subscription?.status || 'None';
      console.log(`${user.email}: ${plan} (${status})`);
    }
    
    console.log('\n🎉 Test subscriptions created! Now test upload limits in the frontend.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSubscriptions();
