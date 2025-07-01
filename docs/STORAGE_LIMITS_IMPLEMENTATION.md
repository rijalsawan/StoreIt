# Storage Limits Implementation Guide

## Overview
This document explains how storage limits are implemented and enforced in the StoreIt application for different subscription plans.

## Storage Limits by Plan

| Plan     | Storage Limit | Bytes Value     | Description |
|----------|---------------|-----------------|-------------|
| FREE     | 500MB         | 524,288,000     | Default plan for all new users |
| PRO      | 100GB         | 107,374,182,400 | Premium plan with expanded storage |
| BUSINESS | 1TB           | 1,099,511,627,776 | Enterprise plan with maximum storage |

## Implementation Details

### 1. Storage Constants (`backend/utils/storage.js`)
```javascript
const STORAGE_LIMITS = {
  FREE: 524288000,        // 500MB
  PRO: 107374182400,      // 100GB  
  BUSINESS: 1099511627776 // 1TB
};
```

### 2. Database Schema (`backend/prisma/schema.prisma`)
- `User.storageUsed`: BigInt field tracking current storage usage
- `User.storageLimit`: BigInt field with default value of 524,288,000 (500MB)
- `Subscription.plan`: Enum field ('FREE', 'PRO', 'BUSINESS')

### 3. Dynamic Storage Limit Enforcement

The system dynamically determines storage limits based on the user's current subscription:

#### User Registration
- New users automatically get FREE plan with 500MB limit
- Storage limit is set explicitly during user creation

#### Subscription Changes
Storage limits are updated automatically when:
- User subscribes to a paid plan (Stripe webhook: `customer.subscription.created`)
- User changes their plan (Stripe webhook: `customer.subscription.updated`)
- User cancels subscription (Stripe webhook: `customer.subscription.deleted`)
- Subscription is paused/resumed

#### Real-time Limit Checking
The `getUserStorageInfo()` function:
1. Fetches user's current subscription status
2. Determines correct storage limit based on plan
3. Auto-corrects database if storage limit is outdated
4. Returns accurate storage information

## Key Functions

### `getUserStorageInfo(userId)`
- **Purpose**: Gets current storage usage and enforces correct limits
- **Auto-correction**: Updates database if storage limit doesn't match plan
- **Returns**: Storage usage, limit, percentage, and formatted values

### `updateUserStorage(userId, sizeChange)`
- **Purpose**: Safely updates storage usage (prevents negative values)
- **Safety**: Clamps values to non-negative numbers
- **Logging**: Detailed logs for debugging storage calculations

### `fixStorageLimits()` (Script)
- **Purpose**: One-time fix for users with incorrect storage limits
- **Usage**: `node scripts/fix-storage-limits.js`
- **Safe**: Only updates users with incorrect limits

## Webhook Handlers

### Subscription Created
```javascript
// Sets storage limit based on new plan
await prisma.user.update({
  where: { id: userId },
  data: { storageLimit: STORAGE_LIMITS[planType] }
});
```

### Subscription Updated
```javascript
// Updates storage limit if plan changed
if (plan) {
  await prisma.user.update({
    where: { id: user.id },
    data: { storageLimit: STORAGE_LIMITS[planType] }
  });
}
```

### Subscription Deleted/Paused
```javascript
// Resets to FREE plan limits
await prisma.user.update({
  where: { id: user.id },
  data: { storageLimit: STORAGE_LIMITS.FREE }
});
```

## Frontend Integration

### Dashboard Component
- Displays current storage usage with progress bar
- Shows formatted storage values (e.g., "250MB of 500MB")
- Updates in real-time after file operations

### File Upload Component
- Checks available storage before upload
- Prevents uploads that would exceed limit
- Shows appropriate error messages

## Testing & Verification

### Automated Testing
Run the test script to verify storage limits:
```bash
cd backend
node scripts/test-storage-limits.js
```

### Manual Testing Steps
1. **FREE User Test**:
   - Remove any active subscription
   - Check dashboard shows 500MB limit
   - Verify API returns correct limit

2. **Subscription Test**:
   - Subscribe to PRO plan
   - Verify limit updates to 100GB
   - Cancel subscription
   - Verify limit reverts to 500MB

3. **Database Verification**:
   ```sql
   SELECT 
     email, 
     storageLimit, 
     subscription.plan 
   FROM users 
   LEFT JOIN subscriptions ON users.id = subscriptions.userId;
   ```

## Troubleshooting

### Common Issues

1. **User still sees old storage limit after subscription change**
   - **Cause**: Webhook may not have been processed
   - **Fix**: Run `fix-storage-limits.js` script
   - **Prevention**: Check webhook endpoint configuration

2. **Negative storage values**
   - **Cause**: File deletion issues or corrupted data
   - **Fix**: `updateUserStorage()` automatically clamps to 0
   - **Prevention**: Robust error handling in file operations

3. **Storage limit not updating in real-time**
   - **Cause**: Frontend caching or API issues
   - **Fix**: `getUserStorageInfo()` auto-corrects on each call
   - **Prevention**: Refresh dashboard data after subscription changes

### Debug Endpoints

#### Check Storage Configuration
```
GET /api/files/upload-config
```
Returns current file upload and storage configuration.

#### Manual Storage Fix
```bash
cd backend
node scripts/fix-storage-limits.js
```

## Environment Variables

Ensure these are set correctly:
```env
FREE_STORAGE_LIMIT=524288000  # 500MB
MAX_FILE_SIZE=1073741824      # 1GB max file size
```

## Migration Notes

When updating storage limits:
1. Update `STORAGE_LIMITS` constants
2. Run `fix-storage-limits.js` script
3. Test with different user types
4. Monitor webhook processing
5. Verify frontend displays correct values

## Security Considerations

- Storage limits are enforced server-side
- Frontend validation is for UX only
- Webhook signatures are verified
- File uploads check limits before processing
- Database constraints prevent invalid values

## Performance Considerations

- Storage calculations use BigInt for precision
- Auto-correction only runs when needed
- Efficient database queries with proper indexing
- Caching considerations for high-traffic scenarios

## Monitoring & Alerts

Consider setting up monitoring for:
- Users approaching storage limits
- Failed webhook processing
- Storage calculation errors
- Unusual storage usage patterns
