import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import FileUpload, { UploadProvider, useUpload } from '../components/FileUpload';
import UploadProgressToast from '../components/UploadProgressToast';
import StorageIndicator from '../components/StorageIndicator';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { api, formatBytes, getFileIcon, getFileTypeClass } from '../utils/api';
import { withUploadProgress } from '../hoc/withUploadProgress';
import toast from 'react-hot-toast';
import { 
  Upload, 
  Download, 
  Trash2, 
  Share2, 
  FolderPlus, 
  Search,
  Grid,
  List,
  File,
  Folder,
  Cloud,
  Plus,
  MoreHorizontal,
  Calendar,
  Eye,
  Filter,
  Crown,
  Home,
  ChevronRight,
  X,
  UploadCloud,
  FileText,
  Image,
  Music,
  Video,
  Archive,
  Menu,
  Star,
  Clock,
  TrendingUp
} from 'lucide-react';

// Main Dashboard component with upload context
const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [storageInfo, setStorageInfo] = useState({
    storageUsed: 0,
    storageLimit: 1073741824 // Default 1GB
  });
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [folderPath, setFolderPath] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showDeleteFolder, setShowDeleteFolder] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [showDeleteFile, setShowDeleteFile] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [showShareFolder, setShowShareFolder] = useState(false);
  const [folderToShare, setFolderToShare] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [touchTimeout, setTouchTimeout] = useState(null);
  const [lastTap, setLastTap] = useState(0);

  useEffect(() => {
    fetchDashboardData();
    buildFolderPath();
  }, [currentFolder]);

  const buildFolderPath = async () => {
    if (!currentFolder) {
      setFolderPath([]);
      return;
    }

    try {
      const response = await api.get(`/user/folders/${currentFolder}/path`);
      setFolderPath(response.data.path || []);
    } catch (error) {
      console.error('Error fetching folder path:', error);
      setFolderPath([]);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [filesResponse, foldersResponse, dashboardResponse, subscriptionResponse] = await Promise.all([
        api.get(`/files?folderId=${currentFolder || ''}&search=${searchTerm}`),
        api.get(`/user/folders?parentId=${currentFolder || ''}`),
        api.get('/user/dashboard'),
        api.get('/subscriptions/current').catch(() => ({ data: null }))
      ]);

      setFiles(filesResponse.data.files);
      setFolders(foldersResponse.data.folders);
      
      // Safely handle storage data
      const storageData = dashboardResponse.data?.storageInfo || {};
      const safeStorageInfo = {
        storageUsed: Number(storageData.storageUsed) || 0,
        storageLimit: Number(storageData.storageLimit) || 1073741824 // Default 1GB
      };
      
      console.log('Storage data from API:', storageData);
      console.log('Safe storage info:', safeStorageInfo);
      
      setStorageInfo(safeStorageInfo);
      setSubscriptionData(subscriptionResponse.data);
      
      updateUser({
        storageUsed: safeStorageInfo.storageUsed.toString(),
        storageLimit: safeStorageInfo.storageLimit.toString()
      });
      
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (uploadedFile) => {
  setFiles(prev => [uploadedFile, ...prev]);
  fetchDashboardData();
  setShowUpload(false); // This will close the modal
  toast.success('File uploaded successfully!');
};

  const handleDeleteFile = (fileId, fileName) => {
    setFileToDelete({ id: fileId, name: fileName });
    setShowDeleteFile(true);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      await api.delete(`/files/${fileToDelete.id}`);
      setFiles(prev => prev.filter(file => file.id !== fileToDelete.id));
      toast.success('File deleted');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to delete file');
    } finally {
      setShowDeleteFile(false);
      setFileToDelete(null);
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const response = await api.get(`/files/${fileId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const handleShareFile = async (fileId, fileName) => {
    try {
      const response = await api.post(`/files/${fileId}/share`, {
        expiresIn: 24
      });
      
      await navigator.clipboard.writeText(response.data.shareUrl);
      toast.success('Share link copied!');
    } catch (error) {
      toast.error('Failed to create share link');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      const response = await api.post('/user/folders', {
        name: newFolderName,
        parentId: currentFolder
      });
      
      setFolders(prev => [...prev, response.data.folder]);
      setNewFolderName('');
      setShowNewFolder(false);
      toast.success('Folder created');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folderId, folderName) => {
    setFolderToDelete({ id: folderId, name: folderName });
    setShowDeleteFolder(true);
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      await api.delete(`/user/folders/${folderToDelete.id}`);
      setFolders(prev => prev.filter(folder => folder.id !== folderToDelete.id));
      toast.success('Folder deleted successfully');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete folder');
    } finally {
      setShowDeleteFolder(false);
      setFolderToDelete(null);
    }
  };

  const handleDownloadFolder = async (folderId, folderName) => {
    try {
      toast.loading('Preparing folder download...');
      
      const response = await api.get(`/user/folders/${folderId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${folderName}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('Folder download started');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to download folder');
    }
  };

  const handleShareFolder = (folderId, folderName) => {
    setFolderToShare({ id: folderId, name: folderName });
    setShowShareFolder(true);
  };

  const shareFolder = async (shareType, email = '') => {
    if (!folderToShare) return;

    try {
      const shareData = {
        shareType, // 'public' or 'private'
        ...(shareType === 'private' && { email })
      };

      const response = await api.post(`/user/folders/${folderToShare.id}/share`, shareData);
      
      if (shareType === 'public') {
        // Copy public link to clipboard
        navigator.clipboard.writeText(response.data.shareUrl);
        toast.success('Public link copied to clipboard');
      } else {
        toast.success(`Folder shared with ${email}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to share folder');
    } finally {
      setShowShareFolder(false);
      setFolderToShare(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDashboardData();
  };

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
    // Debounce search - trigger search after user stops typing
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      fetchDashboardData();
    }, 500);
  };

  const handleFolderClick = (folder, e) => {
    // If clicking on action buttons, don't navigate
    if (e.target.closest('.folder-actions')) {
      return;
    }
    
    // Handle mobile double-tap
    if (isMobile()) {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300; // milliseconds
      
      if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
        // Double tap detected - navigate to folder
        setCurrentFolder(folder.id);
        setSelectedFolder(null);
        setLastTap(0);
      } else {
        // Single tap - select folder
        setSelectedFolder(selectedFolder?.id === folder.id ? null : folder);
        setLastTap(now);
      }
    } else {
      // Desktop - single click to navigate
      setCurrentFolder(folder.id);
    }
  };

  const handleFolderDoubleClick = (folderId) => {
    // This is for desktop double-click
    if (!isMobile()) {
      setCurrentFolder(folderId);
      setSelectedFolder(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setShowUpload(true);
    }
  };

  const navigateToFolder = (folderId) => {
    setCurrentFolder(folderId);
    setSelectedFolder(null); // Clear selection when navigating
  };

  // Helper function to detect if device is mobile
  const isMobile = () => {
    return window.innerWidth <= 768 || 'ontouchstart' in window;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Dashboard" />
        <LoadingSpinner text="Loading your files..." />
      </div>
    );
  }

  const filteredFiles = files.filter(file =>
    file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Safely calculate storage percentage with multiple checks
  const storageUsedPercent = (() => {
    if (!storageInfo || typeof storageInfo.storageUsed !== 'number' || typeof storageInfo.storageLimit !== 'number') {
      return 0;
    }
    
    const used = Number(storageInfo.storageUsed) || 0;
    const limit = Number(storageInfo.storageLimit) || 1;
    
    if (limit <= 0) return 0;
    
    const percentage = Math.round((used / limit) * 100);
    return isNaN(percentage) ? 0 : Math.max(0, Math.min(100, percentage));
  })();

  return (
    <div 
      className="min-h-screen bg-gray-50"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Header title="Dashboard" />
      
      {/* Elegant Drag and Drop Overlay */}
      {dragOver && (
        <div className="fixed inset-0 bg-blue-600/10 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-16 text-center shadow-2xl border border-blue-200/50 max-w-md mx-4">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <UploadCloud className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Drop files to upload</h3>
            <p className="text-gray-600">Release to add files to your cloud storage</p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Modern Header with Integrated Actions */}
        <div className="py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left side - Welcome */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <Cloud className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.firstName}
                </h1>
                <p className="text-gray-600 mt-1">
                  {files.length + folders.length} items • {formatBytes(storageInfo?.storageUsed || 0)} used
                </p>
              </div>
            </div>

            {/* Right side - Quick Actions */}
            
          </div>
        </div>

        

        {/* Storage Usage Card */}
        {storageInfo && (
          <div className="pb-8">
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Storage</h3>
                    <p className="text-sm text-gray-600">
                      {formatBytes(storageInfo?.storageUsed || 0)} of {formatBytes(storageInfo?.storageLimit || 1073741824)} used
                    </p>
                  </div>
                  {subscriptionData?.planDetails?.name && subscriptionData.planDetails.name !== 'Free' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      <Crown className="w-3 h-3 mr-1" />
                      {subscriptionData.planDetails.name}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{storageUsedPercent}%</div>
                  <div className="text-sm text-gray-500">used</div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    storageUsedPercent >= 90 ? 'bg-red-500' :
                    storageUsedPercent >= 75 ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(storageUsedPercent, 100)}%` }}
                ></div>
              </div>

              {storageUsedPercent >= 80 && (!subscriptionData?.planDetails || subscriptionData.planDetails.name === 'Free') && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">Storage almost full</p>
                        <p className="text-sm text-blue-700">Upgrade to get more space and premium features</p>
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.href = '/subscription'}
                      className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Upgrade
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Breadcrumb Navigation */}
        <div className="pb-6">
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="px-6 py-4">
              <nav className="flex items-center space-x-1 text-sm" aria-label="Breadcrumb">
                <button
                  onClick={() => navigateToFolder(null)}
                  className={`inline-flex items-center px-3 py-2 rounded-xl font-medium transition-all duration-200 ${
                    !currentFolder 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Home className="w-4 h-4 mr-2" />
                  My Files
                </button>
                
                {folderPath.map((folder, index) => (
                  <React.Fragment key={folder.id}>
                    <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
                    <button
                      onClick={() => navigateToFolder(folder.id)}
                      className={`px-3 py-2 rounded-xl font-medium transition-all duration-200 max-w-[200px] truncate ${
                        index === folderPath.length - 1
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      title={folder.name}
                    >
                      {folder.name}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            </div>
          </div>
        </div>

        

                        {/* Modern Toolbar with Integrated Actions */}
                <div className="pb-6">
                  <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm">
                    <div className="px-6 py-4">
                      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                        {/* Left side - Search and Filters */}
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="text-sm text-gray-600">
                            {folders.length + filteredFiles.length} items
                          </div>
                        </div>
        
                        {/* Right side - Actions and View Toggle */}
                        <div className="flex items-center space-x-3">
                          {/* New Folder Button */}
                          <button
                            onClick={() => setShowNewFolder(true)}
                            className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-200 group"
                            title="New folder"
                          >
                            <FolderPlus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                            <span className="hidden sm:inline">New Folder</span>
                          </button>
        
                          {/* Upload Button */}
                          <button
                            onClick={() => setShowUpload(true)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md group"
                          >
                            <Upload className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                            <span className="hidden sm:inline">Upload</span>
                          </button>
        
                          {/* View Toggle */}
                          <div className="flex bg-gray-100 rounded-xl p-1">
                            <button
                              onClick={() => setViewMode('grid')}
                              className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                                viewMode === 'grid' 
                                  ? 'bg-white text-gray-900 shadow-sm' 
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                              title="Grid view"
                            >
                              <Grid className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setViewMode('list')}
                              className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                                viewMode === 'list' 
                                  ? 'bg-white text-gray-900 shadow-sm' 
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                              title="List view"
                            >
                              <List className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
        
               
                              
                
                {/* Upload Modal */}
                {showUpload && (
                  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-2xl mx-4 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                            <Upload className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Upload Files</h3>
                            <p className="text-gray-500 text-sm">
                              {currentFolder ? 'Add files to this folder' : 'Add files to your cloud storage'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowUpload(false)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="mb-6">
                        <FileUpload
                          onUploadComplete={handleFileUpload}
                          folderId={currentFolder}
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          onClick={() => setShowUpload(false)}
                          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
        
                {/* New Folder Modal */}
                {showNewFolder && (
                  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                          <FolderPlus className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Create New Folder</h3>
                          <p className="text-gray-500 text-sm">Organize your files better</p>
                        </div>
                      </div>
                      
                      <input
                        type="text"
                        placeholder="Enter folder name..."
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="w-full px-4 py-4 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white mb-6 transition-all duration-300 placeholder-gray-400"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                      />
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handleCreateFolder}
                          disabled={!newFolderName.trim()}
                          className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Create Folder
                        </button>
                        <button
                          onClick={() => {
                            setShowNewFolder(false);
                            setNewFolderName('');
                          }}
                          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
        
                {/* Files and Folders Display */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                  {folders.length === 0 && filteredFiles.length === 0 ? (
                    <div className="text-center py-20 px-8">
                      <div className="max-w-sm mx-auto">
                        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                          <Cloud className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          {currentFolder ? 'This folder is empty' : 'Your cloud is empty'}
                        </h3>
                        <p className="text-gray-500 mb-8 leading-relaxed">
                          {currentFolder 
                            ? 'Add files to this folder or create subfolders to organize your content'
                            : 'Start by uploading your first files or creating folders to organize your content'
                          }
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <button
                            onClick={() => setShowUpload(true)}
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Files
                          </button>
                          <button
                            onClick={() => setShowNewFolder(true)}
                            className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold"
                          >
                            <FolderPlus className="w-4 h-4 mr-2" />
                            New Folder
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                          {/* Folders Grid View */}
                          {folders.map((folder, index) => (
                            <div
                              key={folder.id}
                              onClick={(e) => handleFolderClick(folder, e)}
                              onDoubleClick={() => handleFolderDoubleClick(folder.id)}
                              className={`group relative p-4 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] border ${
                                selectedFolder?.id === folder.id 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                              }`}
                              style={{ 
                                animationDelay: `${index * 50}ms`,
                                animation: 'fadeInUp 0.5s ease-out forwards'
                              }}
                            >
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-all duration-300 ${
                                selectedFolder?.id === folder.id
                                  ? 'bg-blue-500 text-white scale-110 animate-pulse'
                                  : 'bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white group-hover:scale-110'
                              }`}>
                                <Folder className="w-6 h-6 transition-colors duration-300" />
                              </div>
                              <p className="text-sm font-semibold text-gray-900 truncate text-center mb-1">
                                {folder.name}
                              </p>
                              <p className="text-xs text-gray-500 text-center">
                                {new Date(folder.createdAt).toLocaleDateString()}
                              </p>
                              
                              {/* Mobile Action Buttons - Always visible when selected */}
                              {selectedFolder?.id === folder.id && (
                                <div className="absolute top-2 right-2 md:hidden">
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadFolder(folder.id, folder.name);
                                      }}
                                      className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 folder-actions"
                                      title="Download folder"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleShareFolder(folder.id, folder.name);
                                      }}
                                      className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-green-600 hover:bg-green-50 transition-all duration-200 folder-actions"
                                      title="Share folder"
                                    >
                                      <Share2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteFolder(folder.id, folder.name);
                                      }}
                                      className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200 folder-actions"
                                      title="Delete folder"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Desktop Folder Action Buttons - Show on Hover */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 hidden md:block">
                                <div className="flex space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadFolder(folder.id, folder.name);
                                    }}
                                    className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 folder-actions"
                                    title="Download folder"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareFolder(folder.id, folder.name);
                                    }}
                                    className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-green-600 hover:bg-green-50 transition-all duration-200 folder-actions"
                                    title="Share folder"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFolder(folder.id, folder.name);
                                    }}
                                    className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200 folder-actions"
                                    title="Delete folder"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Mobile Instructions */}
                              {selectedFolder?.id === folder.id && isMobile() && (
                                <div className="absolute bottom-2 left-2 right-2">
                                  <p className="text-xs text-blue-600 text-center bg-blue-50 border border-blue-200 rounded px-2 py-1 font-medium">
                                    Double tap to open folder
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {/* Files Grid View */}
                          {filteredFiles.map((file, index) => (
                            <div
                              key={file.id}
                              onClick={() => setSelectedFile(selectedFile?.id === file.id ? null : file)}
                              className={`group relative p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer border ${
                                selectedFile?.id === file.id 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                              }`}
                              style={{ 
                                animationDelay: `${(folders.length + index) * 50}ms`,
                                animation: 'fadeInUp 0.5s ease-out forwards'
                              }}
                            >
                              {/* File Icon */}
                              <div className={`${getFileTypeClass(file.mimetype)} mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 ${
                                selectedFile?.id === file.id ? 'scale-110' : 'group-hover:scale-110'
                              }`}>
                                {getFileIcon(file.mimetype)}
                              </div>
                              
                              {/* File Name */}
                              <p className="text-sm font-semibold text-gray-900 truncate text-center mb-1" title={file.originalName}>
                                {file.originalName}
                              </p>
                              
                              {/* File Size */}
                              <p className="text-xs text-gray-500 text-center mb-3">
                                {file.sizeFormatted}
                              </p>
                              
                              {/* Mobile Action Buttons - Always visible when selected */}
                              {selectedFile?.id === file.id && (
                                <div className="absolute top-2 right-2 md:hidden">
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadFile(file.id, file.originalName);
                                      }}
                                      className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                                      title="Download"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleShareFile(file.id, file.originalName);
                                      }}
                                      className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-green-600 hover:bg-green-50 transition-all duration-200"
                                      title="Share"
                                    >
                                      <Share2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteFile(file.id, file.originalName);
                                      }}
                                      className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Desktop Action Buttons - Show on Hover */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 hidden md:block">
                                <div className="flex space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadFile(file.id, file.originalName);
                                    }}
                                    className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareFile(file.id, file.originalName);
                                    }}
                                    className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-green-600 hover:bg-green-50 transition-all duration-200"
                                    title="Share"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFile(file.id, file.originalName);
                                    }}
                                    className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {/* List Header */}
                          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 rounded-xl text-sm font-semibold text-gray-700 border-b border-gray-200">
                            <div className="col-span-6">Name</div>
                            <div className="col-span-2 hidden sm:block">Size</div>
                            <div className="col-span-2 hidden md:block">Modified</div>
                            <div className="col-span-2">Actions</div>
                          </div>
                          
                          {/* Folders List View */}
                          {folders.map((folder, index) => (
                            <div
                              key={folder.id}
                              className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 group border ${
                                selectedFolder?.id === folder.id 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                              }`}
                              onClick={(e) => handleFolderClick(folder, e)}
                              onDoubleClick={() => handleFolderDoubleClick(folder.id)}
                              style={{ 
                                animationDelay: `${index * 30}ms`,
                                animation: 'fadeInUp 0.4s ease-out forwards'
                              }}
                            >
                              <div className="col-span-6 flex items-center">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-300 ${
                                  selectedFolder?.id === folder.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white'
                                }`}>
                                  <Folder className="w-4 h-4 transition-colors duration-300" />
                                </div>
                                <span className="text-sm font-semibold text-gray-900 truncate">
                                  {folder.name}
                                </span>
                              </div>
                              <div className="col-span-2 text-sm text-gray-500 hidden sm:block">—</div>
                              <div className="col-span-2 text-sm text-gray-500 hidden md:block">
                                {new Date(folder.createdAt).toLocaleDateString()}
                              </div>
                              <div className="col-span-2 flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadFolder(folder.id, folder.name);
                                  }}
                                  className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-all duration-200 folder-actions"
                                  title="Download folder"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareFolder(folder.id, folder.name);
                                  }}
                                  className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-green-100 hover:text-green-600 transition-all duration-200 folder-actions"
                                  title="Share folder"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFolder(folder.id, folder.name);
                                  }}
                                  className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-all duration-200 folder-actions"
                                  title="Delete folder"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          {/* Files List View */}
                          {filteredFiles.map((file, index) => (
                            <div
                              key={file.id}
                              onClick={() => setSelectedFile(selectedFile?.id === file.id ? null : file)}
                              className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer border ${
                                selectedFile?.id === file.id 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                              }`}
                              style={{ 
                                animationDelay: `${(folders.length + index) * 30}ms`,
                                animation: 'fadeInUp 0.4s ease-out forwards'
                              }}
                            >
                              <div className="col-span-6 flex items-center">
                                <div className={`${getFileTypeClass(file.mimetype)} mr-3 w-8 h-8 rounded-lg flex items-center justify-center`}>
                                  {getFileIcon(file.mimetype)}
                                </div>
                                <span className="text-sm font-semibold text-gray-900 truncate" title={file.originalName}>
                                  {file.originalName}
                                </span>
                              </div>
                              <div className="col-span-2 text-sm text-gray-500 hidden sm:block">
                                {file.sizeFormatted}
                              </div>
                              <div className="col-span-2 text-sm text-gray-500 hidden md:block">
                                {new Date(file.createdAt).toLocaleDateString()}
                              </div>
                              <div className="col-span-2 flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadFile(file.id, file.originalName);
                                  }}
                                  className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-all duration-200"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareFile(file.id, file.originalName);
                                  }}
                                  className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-green-100 hover:text-green-600 transition-all duration-200"
                                  title="Share"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(file.id, file.originalName);
                                  }}
                                  className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-all duration-200"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
        
                {/* Delete Folder Confirmation Modal */}
                {showDeleteFolder && folderToDelete && (
                  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4">
                          <Trash2 className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Delete Folder</h3>
                          <p className="text-gray-500 text-sm">This action cannot be undone</p>
                        </div>
                      </div>
                      
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-800 font-medium mb-2">
                          Are you sure you want to delete "{folderToDelete.name}"?
                        </p>
                        <p className="text-red-600 text-sm">
                          This will permanently delete the folder and all its contents including subfolders and files.
                        </p>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={confirmDeleteFolder}
                          className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-all duration-200 font-semibold"
                        >
                          Delete Folder
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteFolder(false);
                            setFolderToDelete(null);
                          }}
                          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delete File Confirmation Modal */}
                {showDeleteFile && fileToDelete && (
                  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4">
                          <Trash2 className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Delete File</h3>
                          <p className="text-gray-500 text-sm">This action cannot be undone</p>
                        </div>
                      </div>
                      
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-800 font-medium mb-2">
                          Are you sure you want to delete "{fileToDelete.name}"?
                        </p>
                        <p className="text-red-600 text-sm">
                          This will permanently delete the file from your storage.
                        </p>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={confirmDeleteFile}
                          className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-all duration-200 font-semibold"
                        >
                          Delete File
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteFile(false);
                            setFileToDelete(null);
                          }}
                          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Share Folder Modal */}
                {showShareFolder && folderToShare && (
                  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                          <Share2 className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Share Folder</h3>
                          <p className="text-gray-500 text-sm">Choose how to share "{folderToShare.name}"</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 mb-6">
                        <button
                          onClick={() => shareFolder('public')}
                          className="w-full p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all duration-200 text-left"
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <Cloud className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">Create Public Link</h4>
                              <p className="text-sm text-gray-600">Anyone with the link can access</p>
                            </div>
                          </div>
                        </button>
                        
                        <div className="relative">
                          <input
                            type="email"
                            placeholder="Enter email address to share privately"
                            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.target.value.trim()) {
                                shareFolder('private', e.target.value.trim());
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const email = e.target.previousElementSibling.value.trim();
                              if (email) shareFolder('private', email);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Share
                          </button>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setShowShareFolder(false);
                          setFolderToShare(null);
                        }}
                        className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        };

// Export Dashboard with upload progress functionality
export default withUploadProgress(Dashboard);