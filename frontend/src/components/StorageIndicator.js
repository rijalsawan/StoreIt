import React from 'react';
import { formatBytes } from '../utils/api';
import { Crown, ArrowUp } from 'lucide-react';

const StorageIndicator = ({ 
  storageUsed, 
  storageLimit, 
  planName = 'Free',
  className = '',
  showUpgradePrompt = true 
}) => {
  const usedBytes = parseInt(storageUsed);
  const limitBytes = parseInt(storageLimit);
  const percentage = (usedBytes / limitBytes) * 100;
  
  const getColorClass = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-primary-500';
  };

  const shouldShowUpgrade = percentage >= 80 && planName === 'Free' && showUpgradePrompt;

  return (
    <div className={`bg-white rounded-lg p-4 border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-900">Storage Used</h3>
          {planName !== 'Free' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <Crown className="w-3 h-3 mr-1" />
              {planName}
            </span>
          )}
        </div>
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
      
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {percentage.toFixed(1)}% used
        </span>
        {planName !== 'Free' && (
          <span className="text-xs text-purple-600 font-medium">
            Premium Plan
          </span>
        )}
      </div>
      
      {percentage >= 90 && (
        <div className="mt-2 text-xs text-red-600 font-medium">
          Storage almost full! {planName === 'Free' ? 'Consider upgrading your plan.' : 'Consider upgrading to a higher tier.'}
        </div>
      )}

      {shouldShowUpgrade && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-900">Upgrade for more storage</p>
              <p className="text-xs text-blue-700">Get up to 1TB with Premium plans</p>
            </div>
            <button
              onClick={() => window.location.href = '/subscription'}
              className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
            >
              <ArrowUp className="w-3 h-3 mr-1" />
              Upgrade
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageIndicator;
