#!/usr/bin/env node

/**
 * Railway Environment Variable Update Script
 * This script helps you update environment variables on Railway
 */

console.log('🚀 Railway Environment Variable Update Guide\n');

console.log('To fix the file upload size limit on Railway, you need to update the MAX_FILE_SIZE environment variable.\n');

console.log('📋 Steps to update Railway environment variables:\n');

console.log('1. Install Railway CLI (if not already installed):');
console.log('   npm install -g @railway/cli\n');

console.log('2. Login to Railway:');
console.log('   railway login\n');

console.log('3. Connect to your project:');
console.log('   railway link\n');

console.log('4. Set the MAX_FILE_SIZE variable:');
console.log('   railway variables set MAX_FILE_SIZE=1073741824\n');

console.log('5. Verify the variable was set:');
console.log('   railway variables\n');

console.log('6. Redeploy your application:');
console.log('   railway up\n');

console.log('🔧 Alternative method using Railway Dashboard:\n');

console.log('1. Go to https://railway.app/dashboard');
console.log('2. Select your StoreIt project');
console.log('3. Go to Variables tab');
console.log('4. Add or update: MAX_FILE_SIZE = 1073741824');
console.log('5. Redeploy the service\n');

console.log('📊 Current local configuration:');
console.log(`   MAX_FILE_SIZE: ${process.env.MAX_FILE_SIZE || 'Not set'}`);
console.log(`   File size limit: ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 52428800) / 1024 / 1024)}MB\n`);

console.log('🧪 Testing endpoints after update:');
console.log('   1. Check config: GET https://web-production-87ed5.up.railway.app/api/files/upload-config');
console.log('   2. Test upload: POST https://web-production-87ed5.up.railway.app/api/files/upload\n');

console.log('💡 Common Railway deployment issues:');
console.log('   - Environment variables not propagated after update');
console.log('   - Service needs manual redeploy after variable changes');
console.log('   - Check Railway service logs for detailed error messages');
console.log('   - Verify all required environment variables are set\n');

console.log('🔍 Debugging steps:');
console.log('   1. Check Railway service logs for the actual MAX_FILE_SIZE value');
console.log('   2. Use the /upload-config endpoint to verify current settings');
console.log('   3. Test with different file sizes to confirm the limit');
console.log('   4. Check if other size limits (body parser, proxy) might interfere\n');

// If running in Railway environment, show current config
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('🚂 Railway Environment Detected:');
  console.log(`   Environment: ${process.env.RAILWAY_ENVIRONMENT}`);
  console.log(`   MAX_FILE_SIZE: ${process.env.MAX_FILE_SIZE || 'NOT SET'}`);
  console.log(`   Current limit: ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 52428800) / 1024 / 1024)}MB`);
}
