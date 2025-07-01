# File Upload Size Limit Fix for Railway Deployment

## Problem
Getting "File too large" error when uploading files to Railway deployment:
```
{error: "Something went wrong!", message: "File too large"}
```

## Root Cause
The Railway deployment doesn't have the updated `MAX_FILE_SIZE` environment variable set to 1GB (1073741824 bytes).

## Solution Steps

### 1. Update Railway Environment Variables

**Option A: Using Railway Dashboard**
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your StoreIt project
3. Navigate to the "Variables" tab
4. Add or update the variable:
   - **Key**: `MAX_FILE_SIZE`
   - **Value**: `1073741824`
5. Click "Deploy" to redeploy with new variables

**Option B: Using Railway CLI**
```bash
# Install CLI if not already installed
npm install -g @railway/cli

# Login and link to project
railway login
railway link

# Set the environment variable
railway variables set MAX_FILE_SIZE=1073741824

# Verify it was set
railway variables

# Redeploy
railway up
```

### 2. Verify the Fix

**Test the configuration endpoint:**
```bash
curl https://web-production-87ed5.up.railway.app/api/files/upload-config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "maxFileSize": 1073741824,
  "maxFileSizeMB": 1024,
  "maxFiles": 10,
  "storageProvider": "B2",
  "environment": "production"
}
```

**Use the PowerShell test script:**
```powershell
.\test-railway-config.ps1
```

### 3. Test File Upload

Try uploading a file larger than 50MB but smaller than 1GB to verify the fix.

## Code Changes Made

### 1. Enhanced Error Handling
- Added detailed multer error handling with specific error codes
- Better error messages showing actual file size limits
- Debugging information in server logs

### 2. Configuration Logging
- Server startup now logs current file upload configuration
- Shows MAX_FILE_SIZE value and computed limits
- Displays Railway environment detection

### 3. Body Parser Fix
- Bypassed JSON body parsing for file upload routes
- Increased general body parser limits to 50MB
- Let multer handle file upload body parsing exclusively

### 4. Debug Endpoint
- Added `/api/files/upload-config` endpoint to check current settings
- Shows all relevant upload configuration values
- Helps verify environment variable propagation

## Verification Checklist

- [ ] MAX_FILE_SIZE environment variable set to 1073741824 on Railway
- [ ] Railway service redeployed after environment variable update
- [ ] Upload config endpoint returns maxFileSizeMB: 1024
- [ ] Test upload with file between 50MB and 1GB succeeds
- [ ] Server logs show correct file size limit on startup

## Common Issues

1. **Environment variables not propagated**: Railway requires manual redeploy after variable changes
2. **Body parser interference**: Fixed by bypassing JSON parsing for uploads
3. **Rate limiting**: Upload rate limits are more restrictive (20 uploads per 15 minutes)
4. **Temporary file cleanup**: Ensured proper cleanup of disk-based temp files

## Testing Files
Use the test file generator to create files of various sizes:
```bash
node generate-test-files.js
```

This creates test files from 1MB to 1GB in the `test-files/` directory.

## Additional Configuration

All environment variables that should be set on Railway:
```
MAX_FILE_SIZE=1073741824
STORAGE_PROVIDER=B2
B2_ACCESS_KEY_ID=your_b2_key
B2_SECRET_ACCESS_KEY=your_b2_secret
B2_BUCKET_NAME=storeit
B2_REGION=us-east-005
B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
```

The fix should resolve the "File too large" error and allow uploads up to 1GB as intended.
