const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixNegativeStorageValues() {
  try {
    console.log('🔍 Checking for users with negative storage values...');
    
    // Get all users to check their storage values
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        storageUsed: true,
        storageLimit: true
      }
    });

    console.log(`📊 Found ${allUsers.length} users total.`);
    
    // Filter users with negative or null storage values
    const usersWithNegativeStorage = allUsers.filter(user => {
      const storageUsed = user.storageUsed ? Number(user.storageUsed) : 0;
      return storageUsed < 0 || user.storageUsed === null;
    });

    if (usersWithNegativeStorage.length === 0) {
      console.log('✅ No users found with negative storage values.');
      return;
    }

    console.log(`🔧 Found ${usersWithNegativeStorage.length} users with negative or null storage values:`);
    
    for (const user of usersWithNegativeStorage) {
      const storageUsedNumber = user.storageUsed ? Number(user.storageUsed) : 0;
      console.log(`  - User ${user.email}: ${storageUsedNumber} bytes`);
    }

    // Calculate actual storage usage for each user
    console.log('\n🔢 Calculating actual storage usage for each user...');
    
    for (const user of usersWithNegativeStorage) {
      // Sum up all file sizes for this user
      const filesSum = await prisma.file.aggregate({
        where: {
          userId: user.id
        },
        _sum: {
          size: true
        }
      });

      const actualStorageUsed = filesSum._sum.size ? Number(filesSum._sum.size) : 0;
      
      console.log(`  - User ${user.email}: Current: ${user.storageUsed ? Number(user.storageUsed) : 0}, Actual: ${actualStorageUsed}`);

      // Update the user's storage to the correct value
      await prisma.user.update({
        where: { id: user.id },
        data: {
          storageUsed: BigInt(actualStorageUsed)
        }
      });

      console.log(`    ✅ Updated user ${user.email} storageUsed to ${actualStorageUsed}`);
    }

    console.log('\n✅ All negative storage values have been fixed!');
    
    // Verify the fix
    const updatedUsers = await prisma.user.findMany({
      select: {
        email: true,
        storageUsed: true
      }
    });
    
    const stillNegativeUsers = updatedUsers.filter(user => {
      const storageUsed = user.storageUsed ? Number(user.storageUsed) : 0;
      return storageUsed < 0;
    });

    console.log(`🔍 Verification: ${stillNegativeUsers.length} users still have negative storage values.`);
    
  } catch (error) {
    console.error('❌ Error fixing negative storage values:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  fixNegativeStorageValues();
}

module.exports = { fixNegativeStorageValues };
