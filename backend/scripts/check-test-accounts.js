const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTestAccounts() {
    console.log('🔍 Checking Test Accounts Status');
    console.log('==================================');
    
    // First, let's see all users in the database
    const allUsers = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
        }
    });
    
    console.log('\n📋 All Users in Database:');
    console.log('---------------------------');
    allUsers.forEach(user => {
        console.log(`- ${user.email} (${user.firstName} ${user.lastName})`);
    });
    
    // Actual test emails from the database
    const testEmails = [
        'rijalsawan@gmail.com',  // sawan rijal
        'jhon@gmail.com',        // jhon doe  
        'test@gmail.com',        // test test
        'pwnrijal@gmail.com'     // Pawan Rijal
    ];
    
    for (const email of testEmails) {
        console.log(`\n📋 Checking: ${email}`);
        console.log('------------------');
        
        try {
            // Get user info
            const user = await prisma.user.findUnique({
                where: { email },
                include: {
                    subscription: true
                }
            });
            
            if (!user) {
                console.log('❌ User not found');
                continue;
            }
            
            console.log(`✅ User ID: ${user.id}`);
            console.log(`📧 Email: ${user.email}`);
            console.log(`� Name: ${user.firstName} ${user.lastName}`);
            console.log(`�💾 Storage Used: ${(Number(user.storageUsed) / (1024 * 1024)).toFixed(2)} MB`);
            console.log(`📊 Storage Limit: ${(Number(user.storageLimit) / (1024 * 1024)).toFixed(2)} MB`);
            
            // Check active subscription
            const activeSubscription = user.subscription;
            if (activeSubscription && activeSubscription.status === 'ACTIVE') {
                console.log(`📋 Plan: ${activeSubscription.plan}`);
                console.log(`🎯 Status: ${activeSubscription.status}`);
                console.log(`📅 End Date: ${activeSubscription.currentPeriodEnd.toISOString()}`);
            } else {
                console.log('📋 Plan: FREE (no active subscription)');
            }
            
            // Calculate expected limits
            const plan = (activeSubscription && activeSubscription.status === 'ACTIVE') ? activeSubscription.plan : 'FREE';
            let expectedStorageLimit, expectedUploadLimit;
            
            switch (plan) {
                case 'PRO':
                    expectedStorageLimit = 100 * 1024 * 1024 * 1024; // 100GB
                    expectedUploadLimit = 1024 * 1024 * 1024; // 1GB
                    break;
                case 'BUSINESS':
                    expectedStorageLimit = 1024 * 1024 * 1024 * 1024; // 1TB
                    expectedUploadLimit = 5 * 1024 * 1024 * 1024; // 5GB
                    break;
                default: // FREE
                    expectedStorageLimit = 500 * 1024 * 1024; // 500MB
                    expectedUploadLimit = 100 * 1024 * 1024; // 100MB
            }
            
            console.log(`🎯 Expected Storage Limit: ${(expectedStorageLimit / (1024 * 1024)).toFixed(2)} MB`);
            console.log(`🎯 Expected Upload Limit: ${(expectedUploadLimit / (1024 * 1024)).toFixed(2)} MB`);
            
            // Check if limits match
            const storageMatch = Number(user.storageLimit) === expectedStorageLimit;
            console.log(`${storageMatch ? '✅' : '❌'} Storage Limit Match: ${storageMatch}`);
            
        } catch (error) {
            console.error(`❌ Error checking user ${email}:`, error.message);
        }
    }
    
    console.log('\n🎯 Summary Complete');
}

checkTestAccounts()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
