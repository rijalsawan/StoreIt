import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle, AlertCircle, Minimize2, Maximize2 } from 'lucide-react';
import { formatBytes } from '../utils/api';

const UploadProgressToast = ({ uploads, onRemove, className = '' }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [completedUploads, setCompletedUploads] = useState(new Set());

  const activeUploads = Object.entries(uploads).filter(([_, data]) => 
    data.progress < 100 && data.status !== 'error'
  );
  
  const completedUploadsArray = Object.entries(uploads).filter(([_, data]) => 
    data.progress === 100 && data.status === 'success'
  );

  const errorUploads = Object.entries(uploads).filter(([_, data]) => 
    data.status === 'error'
  );

  const totalUploads = Object.keys(uploads).length;
  const totalProgress = totalUploads > 0 
    ? Object.values(uploads).reduce((sum, data) => sum + data.progress, 0) / totalUploads 
    : 0;

  // Auto-remove completed uploads after 3 seconds
  useEffect(() => {
    completedUploadsArray.forEach(([fileName]) => {
      if (!completedUploads.has(fileName)) {
        setCompletedUploads(prev => new Set([...prev, fileName]));
        setTimeout(() => {
          onRemove(fileName);
        }, 3000);
      }
    });
  }, [completedUploadsArray, completedUploads, onRemove]);

  if (totalUploads === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-w-80 max-w-sm">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">
                Uploading {totalUploads} file{totalUploads !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-gray-200 rounded-md transition-colors"
              >
                {isMinimized ? (
                  <Maximize2 className="w-3 h-3 text-gray-500" />
                ) : (
                  <Minimize2 className="w-3 h-3 text-gray-500" />
                )}
              </button>
              <button
                onClick={() => {
                  Object.keys(uploads).forEach(onRemove);
                }}
                className="p-1 hover:bg-gray-200 rounded-md transition-colors"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Overall Progress */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Overall Progress</span>
              <span>{Math.round(totalProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="h-1.5 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Upload List */}
        {!isMinimized && (
          <div className="max-h-64 overflow-y-auto">
            {/* Active Uploads */}
            {activeUploads.map(([fileName, data]) => (
              <div key={fileName} className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Upload className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {fileName}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {formatBytes(data.size)} • {data.progress}%
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-1">
                        <div
                          className="h-1 bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${data.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Completed Uploads */}
            {completedUploadsArray.map(([fileName, data]) => (
              <div key={fileName} className="px-4 py-3 border-b border-gray-100 bg-green-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {fileName}
                    </p>
                    <span className="text-xs text-green-600">Upload complete</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Error Uploads */}
            {errorUploads.map(([fileName, data]) => (
              <div key={fileName} className="px-4 py-3 border-b border-gray-100 bg-red-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {fileName}
                    </p>
                    <span className="text-xs text-red-600">
                      {data.error || 'Upload failed'}
                    </span>
                  </div>
                  <button
                    onClick={() => onRemove(fileName)}
                    className="p-1 hover:bg-red-200 rounded-md transition-colors"
                  >
                    <X className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadProgressToast;
