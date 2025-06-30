import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Edit3, 
  Save, 
  X,
  Camera,
  Key,
  Bell,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  RefreshCw,
  Lock,
  UserCheck,
  Activity,
  Smartphone,
  Monitor,
  HelpCircle
} from 'lucide-react';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [actionLoading, setActionLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Update formData when user changes
  useEffect(() => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || ''
    });
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }

    try {
      setLoading(true);
      const response = await api.put('/user/profile', {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim()
      });
      
      updateUser(response.data.user);
      setEditMode(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (!passwordData.currentPassword) {
      toast.error('Current password is required');
      return;
    }

    try {
      setActionLoading(true);
      await api.put('/user/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      toast.success('Password changed successfully!');
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || ''
    });
    setEditMode(false);
  };

  const refreshUserData = async () => {
    try {
      setActionLoading(true);
      // If you have a refresh user function in auth context
      // await refreshUser();
      toast.success('Profile data refreshed!');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'activity', label: 'Activity', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Profile" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Mobile-Optimized Header */}
        <div className="py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 lg:gap-6">
            {/* Left side - Profile Info */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Profile Settings
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Manage your account information
                </p>
              </div>
            </div>

            {/* Right side - Quick Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={refreshUserData}
                disabled={actionLoading}
                className="inline-flex items-center px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg sm:rounded-xl transition-all duration-200 border border-gray-200 group"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200 ${actionLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              
              <button
                onClick={() => setEditMode(!editMode)}
                className={`inline-flex items-center px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all duration-200 shadow-sm hover:shadow-md group ${
                  editMode 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {editMode ? (
                  <>
                    <X className="w-4 h-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
                    <span className="hidden sm:inline">Cancel</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
                    <span className="hidden sm:inline">Edit Profile</span>
                    <span className="sm:hidden">Edit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile-Optimized Tab Navigation */}
        <div className="pb-4 sm:pb-6">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="px-3 sm:px-6 py-3 sm:py-4">
              {/* Mobile: Horizontal Scrollable Tabs */}
              <nav className="flex space-x-1 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <IconComponent className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="text-sm sm:text-base">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Profile Tab - Mobile Optimized */}
        {activeTab === 'profile' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Profile Overview Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
              {/* Mobile-friendly header */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="relative">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm">
                        <span className="text-2xl sm:text-3xl font-bold text-white">
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </span>
                      </div>
                      <button className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-white rounded-full p-1.5 sm:p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                        <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </h2>
                      <p className="text-sm sm:text-base text-gray-600 truncate">{user?.email}</p>
                      <div className="flex items-center mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        Member since {new Date(user?.createdAt).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Status Badge */}
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-8">
                {/* Profile Form */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        First Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-300 text-sm sm:text-base"
                          placeholder="Enter your first name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Last Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-300 text-sm sm:text-base"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed text-sm sm:text-base"
                        placeholder="Email cannot be changed"
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Email address cannot be changed for security reasons
                    </p>
                  </div>

                  {editMode && (
                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6">
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 font-semibold disabled:opacity-50 flex items-center justify-center text-sm sm:text-base"
                      >
                        {loading ? (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            Save Changes
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex-1 border border-gray-200 text-gray-700 py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold text-sm sm:text-base"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Account Type</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Personal</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Status</p>
                    <p className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">Active</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Joined</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                      {new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Last Login</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Today</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

                        {/* Security Tab - Mobile Optimized */}
                {activeTab === 'security' && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Password Change Card */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-red-50 to-orange-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200/60">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Change Password</h3>
                            <p className="text-xs sm:text-sm text-gray-600">Update your password to keep your account secure</p>
                          </div>
                        </div>
                      </div>
        
                      <div className="p-4 sm:p-6 lg:p-8">
                        <div className="space-y-4 sm:space-y-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Current Password
                            </label>
                            <div className="relative">
                              <Key className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-3" />
                              <input
                                type="password"
                                name="currentPassword"
                                value={passwordData.currentPassword}
                                onChange={handlePasswordChange}
                                className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 text-sm sm:text-base"
                                placeholder="Enter your current password"
                              />
                            </div>
                          </div>
        
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                New Password
                              </label>
                              <div className="relative">
                                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-3" />
                                <input
                                  type="password"
                                  name="newPassword"
                                  value={passwordData.newPassword}
                                  onChange={handlePasswordChange}
                                  className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 text-sm sm:text-base"
                                  placeholder="Enter new password"
                                />
                              </div>
                            </div>
        
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Confirm New Password
                              </label>
                              <div className="relative">
                                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-3" />
                                <input
                                  type="password"
                                  name="confirmPassword"
                                  value={passwordData.confirmPassword}
                                  onChange={handlePasswordChange}
                                  className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 text-sm sm:text-base"
                                  placeholder="Confirm new password"
                                />
                              </div>
                            </div>
                          </div>
        
                          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6">
                            <button
                              onClick={handleChangePassword}
                              disabled={actionLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                              className="flex-1 bg-gradient-to-r from-red-500 to-orange-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 font-semibold disabled:opacity-50 flex items-center justify-center text-sm sm:text-base"
                            >
                              {actionLoading ? (
                                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Key className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                  Change Password
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                              className="flex-1 border border-gray-200 text-gray-700 py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold text-sm sm:text-base"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
        
                    {/* Security Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-4 sm:p-6 shadow-sm">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Account Security</h4>
                            <p className="text-xs sm:text-sm text-gray-600">Your account is secure</p>
                          </div>
                        </div>
                        <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">
                          Last password change: Never
                        </div>
                      </div>
        
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-4 sm:p-6 shadow-sm">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Email Verified</h4>
                            <p className="text-xs sm:text-sm text-gray-600">Your email is verified</p>
                          </div>
                        </div>
                        <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">
                          Verified on {new Date(user?.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
        
                {/* Preferences Tab - Mobile Optimized */}
                {activeTab === 'preferences' && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Notification Preferences */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200/60">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notifications</h3>
                            <p className="text-xs sm:text-sm text-gray-600">Manage your notification preferences</p>
                          </div>
                        </div>
                      </div>
        
                      <div className="p-4 sm:p-6 lg:p-8">
                        <div className="space-y-4 sm:space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 text-sm sm:text-base">Email Notifications</h4>
                              <p className="text-xs sm:text-sm text-gray-600">Receive email updates about your account</p>
                            </div>
                            <div className="flex-shrink-0">
                              <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-blue-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                              </button>
                            </div>
                          </div>
        
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 text-sm sm:text-base">Storage Alerts</h4>
                              <p className="text-xs sm:text-sm text-gray-600">Get notified when storage is running low</p>
                            </div>
                            <div className="flex-shrink-0">
                              <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-blue-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                              </button>
                            </div>
                          </div>
        
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 text-sm sm:text-base">Security Alerts</h4>
                              <p className="text-xs sm:text-sm text-gray-600">Important security notifications</p>
                            </div>
                            <div className="flex-shrink-0">
                              <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                <span className="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
        
                    {/* Display Preferences */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-green-50 to-teal-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200/60">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <Monitor className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Display</h3>
                            <p className="text-xs sm:text-sm text-gray-600">Customize your viewing experience</p>
                          </div>
                        </div>
                      </div>
        
                      <div className="p-4 sm:p-6 lg:p-8">
                        <div className="space-y-4 sm:space-y-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Language
                            </label>
                            <div className="relative">
                              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-3" />
                              <select className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 text-sm sm:text-base">
                                <option>English (US)</option>
                                <option>English (UK)</option>
                                <option>Spanish</option>
                                <option>French</option>
                                <option>German</option>
                              </select>
                            </div>
                          </div>
        
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Timezone
                            </label>
                            <div className="relative">
                              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-3" />
                              <select className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 text-sm sm:text-base">
                                <option>UTC-05:00 (Eastern Time)</option>
                                <option>UTC-08:00 (Pacific Time)</option>
                                <option>UTC+00:00 (GMT)</option>
                                <option>UTC+01:00 (CET)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
        
                    {/* Privacy Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-4 sm:p-6 shadow-sm">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Privacy</h4>
                            <p className="text-xs sm:text-sm text-gray-600">Control your privacy settings</p>
                          </div>
                        </div>
                      </div>
        
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-4 sm:p-6 shadow-sm">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Help & Support</h4>
                            <p className="text-xs sm:text-sm text-gray-600">Get help when you need it</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
        
                {/* Activity Tab - Mobile Optimized */}
                {activeTab === 'activity' && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200/60">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Activity</h3>
                            <p className="text-xs sm:text-sm text-gray-600">Your recent account activity</p>
                          </div>
                        </div>
                      </div>
        
                      <div className="p-4 sm:p-6 lg:p-8">
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm sm:text-base">Profile updated</p>
                              <p className="text-xs sm:text-sm text-gray-500">2 hours ago</p>
                            </div>
                          </div>
        
                          <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm sm:text-base">Account created</p>
                              <p className="text-xs sm:text-sm text-gray-500">
                                {new Date(user?.createdAt).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric',
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
        
                    {/* Device Sessions */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200/60">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Active Sessions</h3>
                            <p className="text-xs sm:text-sm text-gray-600">Devices currently signed in to your account</p>
                          </div>
                        </div>
                      </div>
        
                      <div className="p-4 sm:p-6 lg:p-8">
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center justify-between p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg sm:rounded-xl">
                            <div className="flex items-center space-x-3 sm:space-x-4">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm sm:text-base">Current Device</p>
                                <p className="text-xs sm:text-sm text-gray-600">Windows • Chrome • Active now</p>
                              </div>
                            </div>
                            <span className="text-xs sm:text-sm text-green-600 font-medium">Current</span>
                          </div>
                        </div>
                      </div>
                    </div>
        
                    {/* Activity Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm">
                        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Files uploaded</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900">0</p>
                          </div>
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                          </div>
                        </div>
                      </div>
        
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm">
                        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Logins</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900">1</p>
                          </div>
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <UserCheck className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                          </div>
                        </div>
                      </div>
        
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm">
                        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Downloads</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900">0</p>
                          </div>
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                          </div>
                        </div>
                      </div>
        
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm">
                        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Shares</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900">0</p>
                          </div>
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        };
        
        export default Profile;