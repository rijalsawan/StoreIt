# Large File Upload Implementation

## Overview

The StoreIt application now supports uploading files up to 1GB in size, leveraging Backblaze B2's capabilities for large file handling.

## Key Improvements

### Backend Enhancements

1. **Increased File Size Limits**
   - Maximum file size: 1GB (previously 50MB)
   - Updated environment variable: `MAX_FILE_SIZE=1073741824`
   - Multiple file upload support (up to 10 files concurrently)

2. **Optimized Storage Strategy**
   - Switched from memory storage to disk storage for large files
   - Temporary files are created during upload and cleaned up afterward
   - Reduced memory usage for large file processing

3. **Enhanced Upload Handling**
   - 30-minute timeout for large file uploads
   - Separate rate limiting for uploads (20 uploads per 15 minutes)
   - Proper error handling and cleanup of temporary files

4. **Storage Provider Integration**
   - Backblaze B2 supports files up to 10GB
   - Efficient streaming to external storage
   - Metadata preservation during upload

### Frontend Enhancements

1. **Improved Upload UI**
   - Updated drag-and-drop component for 1GB files
   - Better error messages for file size limits
   - Enhanced progress indicators

2. **Advanced Progress Tracking**
   - Real-time upload speed calculation
   - Estimated time remaining (ETA)
   - Visual progress indicators with file size information

3. **User Experience**
   - Multiple file upload support
   - Concurrent upload processing
   - Auto-cleanup of completed uploads

## Technical Specifications

### File Size Limits by Plan

- **Free Plan**: 500MB storage total, 1GB max file size
- **Pro Plan**: 10GB storage total, 1GB max file size  
- **Business Plan**: 1TB storage total, 1GB max file size

### Upload Specifications

- **Maximum file size**: 1GB per file
- **Maximum concurrent uploads**: 10 files
- **Supported file types**: All file types
- **Upload timeout**: 30 minutes
- **Rate limit**: 20 uploads per 15-minute window

### B2 Storage Capabilities

- **Maximum file size**: 10GB (we limit to 1GB for web uploads)
- **Concurrent uploads**: Supported
- **Multipart uploads**: Automatically handled for large files
- **Storage classes**: Standard (hot) storage

## Usage Examples

### Testing Large File Uploads

1. **Generate Test Files**:
   ```bash
   node generate-test-files.js
   ```
   This creates test files from 1MB to 1GB in the `test-files/` directory.

2. **Upload via Web Interface**:
   - Drag and drop files onto the upload area
   - Select multiple files (up to 10)
   - Monitor progress with speed and ETA indicators

3. **Monitor Upload Progress**:
   - Real-time progress bars
   - Transfer speed (MB/s)
   - Estimated time remaining
   - File size and completion status

### API Usage

**Upload Endpoint**: `POST /api/files/upload`

```javascript
const formData = new FormData();
formData.append('file', largeFile);
formData.append('folderId', 'optional-folder-id');

const response = await fetch('/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

## Performance Considerations

### Backend Optimizations

1. **Memory Management**
   - Disk-based temporary storage prevents memory overload
   - Automatic cleanup of temporary files
   - Stream-based processing for large files

2. **Network Efficiency**
   - Direct streaming to B2 storage
   - No intermediate file copies
   - Optimized buffer sizes

3. **Error Handling**
   - Graceful failure recovery
   - Temporary file cleanup on errors
   - Detailed error reporting

### Frontend Optimizations

1. **Progress Tracking**
   - Efficient progress calculation
   - Minimal DOM updates
   - Background processing

2. **User Feedback**
   - Real-time speed indicators
   - Visual progress representation
   - Clear error messaging

## Security Measures

1. **File Validation**
   - Size limit enforcement
   - Rate limiting for uploads
   - Authentication required

2. **Storage Security**
   - Private file storage by default
   - Signed URLs for downloads
   - Metadata encryption

3. **Resource Protection**
   - Request timeouts
   - Memory usage limits
   - Concurrent upload limits

## Troubleshooting

### Common Issues

1. **Upload Timeout**
   - Increase timeout settings if needed
   - Check network connectivity
   - Retry with smaller files first

2. **Memory Issues**
   - Ensure sufficient disk space for temp files
   - Monitor server memory usage
   - Adjust concurrent upload limits

3. **Rate Limiting**
   - Wait for rate limit reset (15 minutes)
   - Reduce concurrent uploads
   - Check IP-based restrictions

### Error Messages

- **"File too large"**: File exceeds 1GB limit
- **"Upload timeout"**: Upload took longer than 30 minutes
- **"Storage limit exceeded"**: User's storage quota is full
- **"Too many uploads"**: Rate limit exceeded

## Future Enhancements

1. **Resume Uploads**: Support for pausing and resuming large uploads
2. **Chunk Uploads**: Break large files into smaller chunks
3. **Background Uploads**: Continue uploads when browser is closed
4. **Upload Queue**: Queue system for managing multiple large uploads
5. **Compression**: Automatic file compression for certain file types

## Monitoring and Analytics

### Upload Metrics

- Upload success/failure rates
- Average upload speeds
- File size distributions
- Popular file types
- Storage usage patterns

### Performance Monitoring

- Server resource usage during uploads
- B2 storage API response times
- Database query performance
- Error rates and types

This implementation provides a robust foundation for handling large file uploads while maintaining good user experience and system performance.
