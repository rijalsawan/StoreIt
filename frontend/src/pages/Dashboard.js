import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import FileUpload from '../components/FileUpload';
import StorageIndicator from '../components/StorageIndicator';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { api, formatBytes, getFileIcon, getFileTypeClass } from '../utils/api';
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
  Filter
} from 'lucide-react';

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [currentFolder]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [filesResponse, foldersResponse, dashboardResponse] = await Promise.all([
        api.get(`/files?folderId=${currentFolder || ''}&search=${searchTerm}`),
        api.get(`/user/folders?parentId=${currentFolder || ''}`),
        api.get('/user/dashboard')
      ]);

      setFiles(filesResponse.data.files);
      setFolders(foldersResponse.data.folders);
      setStorageInfo(dashboardResponse.data.storageInfo);
      
      updateUser({
        storageUsed: dashboardResponse.data.storageInfo.storageUsed.toString(),
        storageLimit: dashboardResponse.data.storageInfo.storageLimit.toString()
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
    setShowUpload(false);
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"?`)) return;

    try {
      await api.delete(`/files/${fileId}`);
      setFiles(prev => prev.filter(file => file.id !== fileId));
      toast.success('File deleted');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to delete file');
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

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="Dashboard" />
        <LoadingSpinner text="Loading your files..." />
      </div>
    );
  }

  const filteredFiles = files.filter(file =>
    file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const storageUsedPercent = storageInfo ? 
    Math.round((storageInfo.storageUsed / storageInfo.storageLimit) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Dashboard" />
      
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="relative overflow-hidden bg-white rounded-3xl shadow-sm border border-slate-200/60">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-white to-slate-50"></div>
            <div className="relative p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Cloud className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                      Welcome back, {user?.firstName}
                    </h1>
                    <p className="text-slate-600 text-lg">
                      Your personal cloud storage dashboard
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-8 mt-6 lg:mt-0">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{files.length}</div>
                    <div className="text-sm text-slate-500 font-medium">Files</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{folders.length}</div>
                    <div className="text-sm text-slate-500 font-medium">Folders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{storageUsedPercent}%</div>
                    <div className="text-sm text-slate-500 font-medium">Used</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Stats */}
        {storageInfo && (
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Storage Usage</h3>
                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {formatBytes(storageInfo.storageUsed)} of {formatBytes(storageInfo.storageLimit)}
                </span>
              </div>
              
              <div className="relative">
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(storageUsedPercent, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>0%</span>
                  <span className="font-medium">{storageUsedPercent}% used</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-500 transition-colors duration-300">
                <Upload className="w-6 h-6 text-indigo-600 group-hover:text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Upload Files</h3>
              <p className="text-sm text-slate-500">Add new files to your storage</p>
            </div>
          </button>

          <button
            onClick={() => setShowNewFolder(true)}
            className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors duration-300">
                <FolderPlus className="w-6 h-6 text-emerald-600 group-hover:text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">New Folder</h3>
              <p className="text-sm text-slate-500">Organize your files</p>
            </div>
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-500 transition-colors duration-300">
                {viewMode === 'grid' ? 
                  <List className="w-6 h-6 text-amber-600 group-hover:text-white" /> :
                  <Grid className="w-6 h-6 text-amber-600 group-hover:text-white" />
                }
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Toggle View</h3>
              <p className="text-sm text-slate-500">Switch layout</p>
            </div>
          </button>

          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-1">Cloud Status</h3>
              <p className="text-sm text-indigo-100">All systems operational</p>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search files and folders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
            </form>

            <div className="flex items-center space-x-3">
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                    viewMode === 'grid' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                    viewMode === 'list' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        {showUpload && (
          <div className="mb-8 animate-in slide-in-from-top duration-500">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <FileUpload
                onUploadComplete={handleFileUpload}
                folderId={currentFolder}
              />
            </div>
          </div>
        )}

        {/* New Folder Modal */}
        {showNewFolder && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Create New Folder</h3>
              <input
                type="text"
                placeholder="Enter folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white mb-6 transition-all duration-300 placeholder-slate-400"
                autoFocus
              />
              <div className="flex gap-4">
                <button
                  onClick={handleCreateFolder}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold"
                >
                  Create Folder
                </button>
                <button
                  onClick={() => {
                    setShowNewFolder(false);
                    setNewFolderName('');
                  }}
                  className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-xl hover:bg-slate-200 transition-all duration-300 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Files and Folders */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          {folders.length === 0 && filteredFiles.length === 0 ? (
            <div className="text-center py-20 px-8">
              <div className="max-w-sm mx-auto">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Cloud className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Your cloud is empty</h3>
                <p className="text-slate-500 mb-8">
                  Start by uploading your first file or creating a folder to organize your content
                </p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold"
                >
                  Upload Your First File
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {/* Folders */}
                  {folders.map((folder, index) => (
                    <div
                      key={folder.id}
                      onClick={() => setCurrentFolder(folder.id)}
                      className="group p-4 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all duration-300 hover:scale-105"
                      style={{ 
                        animationDelay: `${index * 50}ms`,
                        animation: 'fadeInUp 0.5s ease-out forwards'
                      }}
                    >
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-500 transition-colors duration-300">
                        <Folder className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900 truncate text-center mb-1">
                        {folder.name}
                      </p>
                      <p className="text-xs text-slate-500 text-center">
                        {new Date(folder.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  
                  {/* Files */}
                  {filteredFiles.map((file, index) => (
                    <div
                      key={file.id}
                      className="group relative p-4 rounded-2xl transition-all duration-300 hover:bg-slate-50"
                      style={{ 
                        animationDelay: `${(folders.length + index) * 50}ms`,
                        animation: 'fadeInUp 0.5s ease-out forwards'
                      }}
                    >
                      <div className={`file-icon ${getFileTypeClass(file.mimetype)} mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center`}>
                        {getFileIcon(file.mimetype)}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 truncate text-center mb-1">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-slate-500 text-center mb-3">
                        {file.sizeFormatted}
                      </p>
                      
                      {/* File Actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFile(file.id, file.originalName);
                            }}
                            className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-indigo-600 transition-colors duration-200"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareFile(file.id, file.originalName);
                            }}
                            className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-emerald-600 transition-colors duration-200"
                            title="Share"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file.id, file.originalName);
                            }}
                            className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-red-600 transition-colors duration-200"
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
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 rounded-xl text-sm font-semibold text-slate-700">
                    <div className="col-span-6">Name</div>
                    <div className="col-span-2 hidden sm:block">Size</div>
                    <div className="col-span-2 hidden md:block">Modified</div>
                    <div className="col-span-2">Actions</div>
                  </div>
                  
                  {/* Folders */}
                  {folders.map((folder, index) => (
                    <div
                      key={folder.id}
                      className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-all duration-200 group"
                      onClick={() => setCurrentFolder(folder.id)}
                      style={{ 
                        animationDelay: `${index * 30}ms`,
                        animation: 'fadeInUp 0.4s ease-out forwards'
                      }}
                    >
                      <div className="col-span-6 flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-indigo-500 transition-colors duration-300">
                          <Folder className="w-4 h-4 text-indigo-600 group-hover:text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {folder.name}
                        </span>
                      </div>
                      <div className="col-span-2 text-sm text-slate-500 hidden sm:block">—</div>
                      <div className="col-span-2 text-sm text-slate-500 hidden md:block">
                        {new Date(folder.createdAt).toLocaleDateString()}
                      </div>
                      <div className="col-span-2"></div>
                    </div>
                  ))}
                  
                  {/* Files */}
                  {filteredFiles.map((file, index) => (
                    <div
                      key={file.id}
                      className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all duration-200 group"
                      style={{ 
                        animationDelay: `${(folders.length + index) * 30}ms`,
                        animation: 'fadeInUp 0.4s ease-out forwards'
                      }}
                    >
                      <div className="col-span-6 flex items-center">
                        <div className={`file-icon ${getFileTypeClass(file.mimetype)} mr-3 w-8 h-8 rounded-lg flex items-center justify-center`}>
                          {getFileIcon(file.mimetype)}
                        </div>
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {file.originalName}
                        </span>
                      </div>
                      <div className="col-span-2 text-sm text-slate-500 hidden sm:block">
                        {file.sizeFormatted}
                      </div>
                      <div className="col-span-2 text-sm text-slate-500 hidden md:block">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </div>
                      <div className="col-span-2 flex space-x-2">
                        <button
                          onClick={() => handleDownloadFile(file.id, file.originalName)}
                          className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 transition-colors duration-200"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleShareFile(file.id, file.originalName)}
                          className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-emerald-100 hover:text-emerald-600 transition-colors duration-200"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.id, file.originalName)}
                          className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors duration-200"
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
      </div>
    </div>
  );
};

export default Dashboard;