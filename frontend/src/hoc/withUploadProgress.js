import React from 'react';
import { UploadProvider, useUpload } from '../components/FileUpload';
import UploadProgressToast from '../components/UploadProgressToast';

// Simple HOC to add upload progress functionality
export const withUploadProgress = (Component) => {
  const WithUploadProgressComponent = (props) => {
    return (
      <UploadProvider>
        <Component {...props} />
        <UploadProgressManager />
      </UploadProvider>
    );
  };

  WithUploadProgressComponent.displayName = `withUploadProgress(${Component.displayName || Component.name})`;
  return WithUploadProgressComponent;
};

// Component to manage upload progress display
const UploadProgressManager = () => {
  const uploadContext = useUpload();

  return (
    <UploadProgressToast
      uploads={uploadContext.uploads}
      onRemove={uploadContext.removeUpload}
    />
  );
};

export default withUploadProgress;
