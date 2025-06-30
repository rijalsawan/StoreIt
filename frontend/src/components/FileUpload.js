import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Cloud, CheckCircle, AlertCircle } from 'lucide-react';
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
        className={`relative group p-12 text-center cursor-pointer transition-all duration-300 rounded-3xl border-2 border-dashed overflow-hidden ${
          isDragActive && !isDragReject
            ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-purple-50 scale-105' 
            : isDragReject
            ? 'border-red-400 bg-red-50'
            : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50'
        }`}
      >
        <input {...getInputProps()} />
        
        {/* Background Animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center transition-all duration-500 ${
            isDragActive && !isDragReject
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white scale-110'
              : isDragReject
              ? 'bg-red-500 text-white'
              : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 group-hover:from-indigo-100 group-hover:to-purple-100 group-hover:text-indigo-600 group-hover:scale-110'
          }`}>
            {isDragReject ? (
              <AlertCircle className="w-10 h-10" />
            ) : isDragActive ? (
              <Cloud className="w-10 h-10" />
            ) : (
              <Upload className="w-10 h-10" />
            )}
          </div>
          
          {isDragActive && !isDragReject && (
            <div className="animate-in zoom-in duration-300">
              <h3 className="text-2xl font-bold text-indigo-600 mb-2">Drop files here!</h3>
              <p className="text-indigo-500">Release to upload to your cloud</p>
            </div>
          )}
          
          {isDragReject && (
            <div className="animate-in zoom-in duration-300">
              <h3 className="text-xl font-bold text-red-600 mb-2">File too large!</h3>
              <p className="text-red-500">Please select files under 50MB</p>
            </div>
          )}
          
          {!isDragActive && (
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
                  Up to 50MB each
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Upload Progress */}
      {activeUploads.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
              <Upload className="w-4 h-4 text-indigo-600" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Uploading Files</h4>
          </div>
          
          {activeUploads.map(fileName => (
            <div key={fileName} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                    <Upload className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 truncate max-w-xs">
                      {fileName}
                    </p>
                    <p className="text-sm text-slate-500">Uploading...</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-600">
                    {uploadProgress[fileName]}%
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress[fileName]}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
