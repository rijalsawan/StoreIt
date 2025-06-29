import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';

const FileUpload = ({ onUploadComplete, folderId = null }) => {
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState({});

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);
    
    for (const file of acceptedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) {
          formData.append('folderId', folderId);
        }

        // Update progress for this file
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 0
        }));

        const response = await api.post('/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: percentCompleted
            }));
          }
        });

        toast.success(`${file.name} uploaded successfully!`);
        
        // Remove from progress tracking
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });

        if (onUploadComplete) {
          onUploadComplete(response.data.file);
        }

      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}: ${error.response?.data?.error || 'Unknown error'}`);
        
        // Remove from progress tracking
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    }
    
    setUploading(false);
  }, [folderId, onUploadComplete]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject
  } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const activeUploads = Object.keys(uploadProgress);

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`dropzone p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'drag-active' : ''
        } ${isDragReject ? 'border-red-300 bg-red-50' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        {isDragActive && !isDragReject && (
          <p className="text-primary-600 font-medium">Drop files here...</p>
        )}
        
        {isDragReject && (
          <p className="text-red-600 font-medium">Some files are too large!</p>
        )}
        
        {!isDragActive && (
          <>
            <p className="text-gray-600 mb-2">
              Drag and drop files here, or{' '}
              <span className="text-primary-600 font-medium">browse</span>
            </p>
            <p className="text-sm text-gray-500">
              Maximum file size: 50MB
            </p>
          </>
        )}
      </div>

      {/* Upload Progress */}
      {activeUploads.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="font-medium text-gray-900">Uploading Files</h4>
          {activeUploads.map(fileName => (
            <div key={fileName} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {fileName}
                </span>
                <span className="text-sm text-gray-500">
                  {uploadProgress[fileName]}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="progress-bar h-2 rounded-full"
                  style={{ width: `${uploadProgress[fileName]}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
