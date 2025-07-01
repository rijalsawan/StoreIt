# Dynamic Upload Limits Implementation

## Overview
The StoreIt application now enforces different file upload limits based on the user's subscription plan, providing a better user experience and encouraging plan upgrades.

## Upload Limits by Plan

| Plan     | Upload Limit per File | Storage Limit | Description |
|----------|----------------------|---------------|-------------|
| FREE     | 100MB                | 500MB         | Basic plan for casual users |
| PRO      | 1GB                  | 100GB         | Professional plan for power users |
| BUSINESS | 5GB                  | 1TB           | Enterprise plan for large files |

## Implementation Details

### Backend Changes

#### 1. Storage Utility (`backend/utils/storage.js`)
- Added `UPLOAD_LIMITS` constants for each plan
- Created `getUserUploadLimit(userId)` function to get user-specific limits
- Updated module exports to include upload limit functionality

#### 2. File Upload Route (`backend/routes/files.js`)
- Created `dynamicUpload` middleware that fetches user's plan and sets appropriate limits
- Updated `handleMulterError` to show plan-specific error messages
- Modified `/upload-config` endpoint to return user-specific limits

#### 3. Dynamic Multer Configuration
- Each upload request creates a multer instance with user-specific file size limits
- File size limits are enforced at the server level before processing
- Proper error messages indicate the user's plan and allowed file size

### Frontend Changes

#### 1. FileUpload Component (`frontend/src/components/FileUpload.js`)
- Added upload config fetching on component mount
- Updated dropzone configuration to use dynamic `maxSize`
- Enhanced error messages to show plan-specific limits
- Updated UI text to display current plan's upload limit

#### 2. User Experience Improvements
- Upload limits are displayed in the file upload interface
- Error messages clearly indicate the user's plan and limits
- Plan badge shown for PRO/BUSINESS users in upload area

## Code Examples

### Backend: Getting User Upload Limit
```javascript
const uploadInfo = await getUserUploadLimit(userId);
// Returns: { uploadLimit: 1073741824, uploadLimitFormatted: "1 GB", plan: "PRO" }
```

### Frontend: Upload Config API Response
```javascript
GET /api/files/upload-config
{
  "userPlan": "PRO",
  "userMaxFileSize": 1073741824,
  "userMaxFileSizeFormatted": "1 GB",
  "globalMaxFileSize": 1073741824,
  "maxFiles": 10
}
```

### Dynamic Multer Configuration
```javascript
const userUpload = multer({
  storage: storage,
  limits: {
    fileSize: uploadInfo.uploadLimit, // User-specific limit
    files: 10
  }
});
```

## Error Handling

### Plan-Specific Error Messages
- **FREE Users**: "File too large. Maximum file size for FREE plan is 100MB."
- **PRO Users**: "File too large. Maximum file size for PRO plan is 1GB."
- **BUSINESS Users**: "File too large. Maximum file size for BUSINESS plan is 5GB."

### Frontend Validation
- Dropzone validates file size before upload attempt
- Users see immediate feedback without server round-trip
- Error messages include plan information and upgrade suggestions

## Testing

### Test Scripts
1. **Upload Limits Test**: `node scripts/test-upload-limits.js`
   - Verifies upload limits for each plan
   - Tests file size scenarios
   - Simulates API responses

2. **Storage Validation**: `node scripts/check-my-storage.js`
   - Checks individual user's current limits
   - Validates plan alignment

### Manual Testing
1. **FREE Plan Test**:
   - Try uploading 150MB file → Should be rejected
   - Try uploading 50MB file → Should be accepted
   - Verify error message mentions "FREE plan" and "100MB"

2. **PRO Plan Test**:
   - Try uploading 800MB file → Should be accepted
   - Try uploading 2GB file → Should be rejected
   - Verify error message mentions "PRO plan" and "1GB"

3. **BUSINESS Plan Test**:
   - Try uploading 3GB file → Should be accepted
   - Try uploading 6GB file → Should be rejected
   - Verify error message mentions "BUSINESS plan" and "5GB"

## Configuration

### Environment Variables
```env
MAX_FILE_SIZE=1073741824  # Global fallback limit (1GB)
```

### Upload Limits Constants
```javascript
const UPLOAD_LIMITS = {
  FREE: 107374182,        // 100MB per file
  PRO: 1073741824,        // 1GB per file
  BUSINESS: 5368709120    // 5GB per file
};
```

## Benefits

### User Experience
- Clear understanding of plan limitations
- Immediate feedback on file size restrictions
- Encouragement to upgrade for larger file support

### Business Value
- Natural upgrade path from FREE → PRO → BUSINESS
- Differentiated value proposition for each plan
- Reduced server load from oversized file attempts

### Technical Benefits
- Server-side enforcement prevents resource abuse
- Dynamic limits adapt to subscription changes
- Consistent error handling across the application

## Monitoring & Analytics

### Metrics to Track
- Upload attempts by plan type
- File size distribution by plan
- Rejection rates due to size limits
- Plan upgrade conversions after size rejections

### Logging
- Upload limit checks are logged with user plan information
- Failed uploads include plan context
- Multer errors include detailed size and plan information

## Future Enhancements

### Potential Improvements
1. **Temporary Upload Boost**: Allow occasional larger uploads for FREE users
2. **Progressive Upload**: Support resumable uploads for large files
3. **Plan-Specific File Types**: Restrict certain file types by plan
4. **Upload Analytics**: Show users their upload patterns and plan usage
5. **Smart Suggestions**: Recommend optimal plan based on upload behavior

### Subscription Integration
- Automatic limit updates when plans change
- Webhook support for real-time plan changes
- Grace period handling for plan downgrades
