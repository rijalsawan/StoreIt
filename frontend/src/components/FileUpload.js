import React, { useCallback, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Cloud, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';

// Create a context for upload progress
const UploadContext = React.createContext();

export const UploadProvider = ({ children }) => {
  const [uploads, setUploads] = React.useState({});

  const addUpload = (fileName, fileSize) => {
    setUploads(prev => ({
      ...prev,
      [fileName]: {
        progress: 0,
        size: fileSize,
        status: 'uploading'
      }
    }));
  };

  const updateUpload = (fileName, progress, status = 'uploading') => {
    setUploads(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        progress,
        status
      }
    }));
  };

  const setUploadError = (fileName, error) => {
    setUploads(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        status: 'error',
        error
      }
    }));
  };

  const removeUpload = (fileName) => {
    setUploads(prev => {
      const newUploads = { ...prev };
      delete newUploads[fileName];
      return newUploads;
    });
  };

  return (
    <UploadContext.Provider value={{
      uploads,
      addUpload,
      updateUpload,
      setUploadError,
      removeUpload
    }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

const FileUpload = ({ onUploadComplete, folderId = null }) => {
  const [uploading, setUploading] = React.useState(false);
  const [uploadConfig, setUploadConfig] = React.useState(null);
  const [configLoading, setConfigLoading] = React.useState(true);
  const [configFetchKey, setConfigFetchKey] = React.useState(0);
  const uploadContext = useUpload();

  // Fetch upload configuration on component mount and when user changes
  React.useEffect(() => {
    const fetchUploadConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('⚠️ No auth token found, skipping upload config fetch');
          setConfigLoading(false);
          return;
        }

        setConfigLoading(true);
        console.log('🔄 Fetching upload config...');
        // Add cache-busting parameter
        const response = await api.get(`/files/upload-config?t=${Date.now()}`);
        console.log('✅ Upload config loaded:', response.data);
        setUploadConfig(response.data);
      } catch (error) {
        console.error('❌ Failed to fetch upload config:', error);
        console.error('Error details:', error.response?.data || error.message);
        // Fallback to default values
        setUploadConfig({
          userMaxFileSize: 107374182, // 100MB for FREE
          userMaxFileSizeFormatted: '102.4 MB',
          userPlan: 'FREE'
        });
      } finally {
        setConfigLoading(false);
      }
    };

    fetchUploadConfig();
  }, [configFetchKey]); // Re-fetch when configFetchKey changes

  // Function to force refresh upload config (can be called externally)
  const refreshUploadConfig = React.useCallback(() => {
    console.log('🔄 Force refreshing upload config...');
    setConfigFetchKey(prev => prev + 1);
  }, []);

  // Remove the problematic useImperativeHandle for now
  // React.useImperativeHandle(React.forwardRef(() => null), () => ({
  //   refreshUploadConfig
  // }), [refreshUploadConfig]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    
    // Add all files to upload tracking
    acceptedFiles.forEach(file => {
      uploadContext.addUpload(file.name, file.size);
    });

    // Upload files concurrently with a limit
    const uploadPromises = acceptedFiles.map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) {
          formData.append('folderId', folderId);
        }

        const response = await api.post('/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            uploadContext.updateUpload(file.name, percentCompleted);
          }
        });

        // Mark as completed
        uploadContext.updateUpload(file.name, 100, 'success');

        if (onUploadComplete) {
          onUploadComplete(response.data.file);
        }

        return { success: true, file: file.name };
      } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = error.response?.data?.error || 'Upload failed';
        uploadContext.setUploadError(file.name, errorMessage);
        toast.error(`Failed to upload ${file.name}`);
        return { success: false, file: file.name, error: errorMessage };
      }
    });

    // Wait for all uploads to complete
    const results = await Promise.allSettled(uploadPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failCount = results.length - successCount;

    if (successCount > 0) {
      toast.success(
        successCount === 1 
          ? '1 file uploaded successfully!'
          : `${successCount} files uploaded successfully!`
      );
    }

    if (failCount > 0) {
      toast.error(
        failCount === 1
          ? '1 file failed to upload'
          : `${failCount} files failed to upload`
      );
    }
    
    setUploading(false);
  }, [folderId, onUploadComplete, uploadContext]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject
  } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: uploadConfig?.userMaxFileSize || 107374182, // Default to 100MB for FREE
    disabled: !uploadConfig || configLoading || uploading, // Disable until config is loaded
    onDropRejected: (fileRejections) => {
      const maxSizeFormatted = uploadConfig?.userMaxFileSizeFormatted || '102.4 MB';
      const userPlan = uploadConfig?.userPlan || 'FREE';
      
      console.log('📋 File rejected. Config:', { uploadConfig, maxSizeFormatted, userPlan });
      
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          console.log('File rejection error:', error.code, error.message);
          if (error.code === 'file-too-large') {
            toast.error(`${file.name} is too large. Maximum file size for ${userPlan} plan is ${maxSizeFormatted}.`);
          } else if (error.code === 'file-invalid-type') {
            toast.error(`${file.name} has an invalid file type.`);
          } else {
            toast.error(`Error with ${file.name}: ${error.message}`);
          }
        });
      });
    }
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative group p-12 text-center cursor-pointer transition-all duration-300 rounded-3xl border-2 border-dashed overflow-hidden ${
          configLoading
            ? 'border-blue-300 bg-blue-50 cursor-wait'
            : isDragActive && !isDragReject
            ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-purple-50 scale-105' 
            : isDragReject
            ? 'border-red-400 bg-red-50'
            : uploading
            ? 'border-blue-400 bg-blue-50 cursor-not-allowed'
            : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50'
        }`}
      >
        <input {...getInputProps()} disabled={uploading || configLoading} />
        
        {/* Background Animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center transition-all duration-500 ${
            configLoading
              ? 'bg-blue-500 text-white animate-pulse'
              : isDragActive && !isDragReject
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white scale-110'
              : isDragReject
              ? 'bg-red-500 text-white'
              : uploading
              ? 'bg-blue-500 text-white animate-pulse'
              : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 group-hover:from-indigo-100 group-hover:to-purple-100 group-hover:text-indigo-600 group-hover:scale-110'
          }`}>
            {isDragReject ? (
              <AlertCircle className="w-10 h-10" />
            ) : isDragActive ? (
              <Cloud className="w-10 h-10" />
            ) : configLoading ? (
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Upload className="w-10 h-10" />
            )}
          </div>
          
          {configLoading && (
            <div className="animate-in zoom-in duration-300">
              <h3 className="text-2xl font-bold text-blue-600 mb-2">Loading upload settings...</h3>
              <p className="text-blue-500">Preparing your personalized upload limits</p>
            </div>
          )}
          
          {uploading && !configLoading && (
            <div className="animate-in zoom-in duration-300">
              <h3 className="text-2xl font-bold text-blue-600 mb-2">Uploading files...</h3>
              <p className="text-blue-500">Please wait while your files are being uploaded</p>
            </div>
          )}
          
          {isDragActive && !isDragReject && !uploading && (
            <div className="animate-in zoom-in duration-300">
              <h3 className="text-2xl font-bold text-indigo-600 mb-2">Drop files here!</h3>
              <p className="text-indigo-500">Release to upload to your cloud</p>
            </div>
          )}
          
          {isDragReject && (
            <div className="animate-in zoom-in duration-300">
              <h3 className="text-xl font-bold text-red-600 mb-2">File too large!</h3>
              <p className="text-red-500">
                Please select files under {uploadConfig?.userMaxFileSizeFormatted || '1 GB'} 
                ({uploadConfig?.userPlan || 'FREE'} plan limit)
              </p>
            </div>
          )}
          
          {!isDragActive && !uploading && !configLoading && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Upload Files</h3>
              <p className="text-slate-600 mb-4 text-lg">
                Drag and drop files here, or{' '}
                <span className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors duration-300">
                  click to browse
                </span>
              </p>
              <div className="flex items-center justify-center space-x-6 text-sm text-slate-500">
                <span className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  Multiple files
                </span>
                <span className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  Up to {uploadConfig?.userMaxFileSizeFormatted || 'Loading...'} per file
                  {uploadConfig?.userPlan && uploadConfig.userPlan !== 'FREE' && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
                      {uploadConfig.userPlan}
                    </span>
                  )}
                </span>
              </div>
              
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
