const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignTestPlans() {
    console.log('🎯 Assigning Test Plans to Accounts');
    console.log('===================================');
    
    const assignments = [
        {
            email: 'rijalsawan@gmail.com',
            name: 'sawan rijal',
            plan: 'FREE',
            description: 'Keep as FREE user for testing'
        },
        {
            email: 'jhon@gmail.com', 
            name: 'jhon doe',
            plan: 'PRO',
            description: 'Assign PRO plan for testing'
        },
        {
            email: 'test@gmail.com',
            name: 'test test', 
            plan: 'BUSINESS',
            description: 'Assign BUSINESS plan for testing'
        },
        {
            email: 'pwnrijal@gmail.com',
            name: 'Pawan Rijal',
            plan: 'FREE',
            description: 'Reset to FREE plan'
        }
    ];
    
    for (const assignment of assignments) {
        console.log(`\n📋 Processing: ${assignment.name} (${assignment.email})`);
        console.log(`🎯 Target Plan: ${assignment.plan}`);
        console.log(`📝 Description: ${assignment.description}`);
        
        try {
            const user = await prisma.user.findUnique({
                where: { email: assignment.email },
                include: { subscription: true }
            });
            
            if (!user) {
                console.log('❌ User not found');
                continue;
            }
            
            // Remove existing subscription if any
            if (user.subscription) {
                console.log('🗑️ Removing existing subscription...');
                await prisma.subscription.delete({
                    where: { id: user.subscription.id }
                });
            }
            
            if (assignment.plan === 'FREE') {
                // For FREE plan, just update storage limit to correct value
                console.log('✅ Setting up FREE plan...');
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        storageLimit: BigInt(500 * 1024 * 1024), // 500MB
                        subscriptionId: null
                    }
                });
                console.log('✅ FREE plan configured');
            } else {
                // Create subscription for PRO or BUSINESS
                console.log(`✅ Creating ${assignment.plan} subscription...`);
                
                const subscription = await prisma.subscription.create({
                    data: {
                        userId: user.id,
                        stripeSubId: `test_${assignment.plan.toLowerCase()}_${Date.now()}`,
                        status: 'ACTIVE',
                        plan: assignment.plan,
                        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                        cancelAtPeriodEnd: false
                    }
                });
                
                // Update user storage limit based on plan
                let storageLimit;
                if (assignment.plan === 'PRO') {
                    storageLimit = BigInt(100 * 1024 * 1024 * 1024); // 100GB
                } else if (assignment.plan === 'BUSINESS') {
                    storageLimit = BigInt(1024 * 1024 * 1024 * 1024); // 1TB
                }
                
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        storageLimit: storageLimit,
                        subscriptionId: subscription.id
                    }
                });
                
                console.log(`✅ ${assignment.plan} plan configured`);
            }
            
        } catch (error) {
            console.error(`❌ Error processing ${assignment.email}:`, error.message);
        }
    }
    
    console.log('\n🎯 Assignment Complete! Running verification...');
    
    // Verify assignments
    console.log('\n🔍 Verification Results:');
    console.log('========================');
    
    for (const assignment of assignments) {
        const user = await prisma.user.findUnique({
            where: { email: assignment.email },
            include: { subscription: true }
        });
        
        if (user) {
            const actualPlan = (user.subscription && user.subscription.status === 'ACTIVE') 
                ? user.subscription.plan 
                : 'FREE';
            const match = actualPlan === assignment.plan;
            
            console.log(`${match ? '✅' : '❌'} ${assignment.name}: ${actualPlan} (Expected: ${assignment.plan})`);
            if (!match) {
                console.log(`   Storage Limit: ${(Number(user.storageLimit) / (1024 * 1024)).toFixed(2)} MB`);
            }
        }
    }
}

assignTestPlans()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
