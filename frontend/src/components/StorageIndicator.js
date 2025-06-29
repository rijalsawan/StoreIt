import React from 'react';
import { formatBytes } from '../utils/api';

const StorageIndicator = ({ storageUsed, storageLimit, className = '' }) => {
  const usedBytes = parseInt(storageUsed);
  const limitBytes = parseInt(storageLimit);
  const percentage = (usedBytes / limitBytes) * 100;
  
  const getColorClass = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-primary-500';
  };

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">Storage Used</h3>
        <span className="text-sm text-gray-500">
          {formatBytes(usedBytes)} of {formatBytes(limitBytes)}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getColorClass()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        {percentage.toFixed(1)}% used
      </div>
      
      {percentage >= 90 && (
        <div className="mt-2 text-xs text-red-600 font-medium">
          Storage almost full! Consider upgrading your plan.
        </div>
      )}
    </div>
  );
};

export default StorageIndicator;
