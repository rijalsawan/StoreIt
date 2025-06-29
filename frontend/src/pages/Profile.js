import React, { useState } from 'react';
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
  Globe
} from 'lucide-react';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

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
    try {
      setLoading(true);
      const response = await api.put('/user/profile', formData);
      
      updateUser(response.data.user);
      setEditMode(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
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

    try {
      setLoading(true);
      await api.put('/user/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
      toast.success('Password changed successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || ''
    });
    setEditMode(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              {/* Profile Header */}
              <div className="flex items-center space-x-6 mb-8">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <button className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <Camera className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </h2>
                  <p className="text-gray-600">{user?.email}</p>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    Member since {new Date(user?.createdAt).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </div>
                </div>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="bg-blue-100 text-blue-600 p-3 rounded-xl hover:bg-blue-500 hover:text-white transition-all duration-300"
                >
                  {editMode ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                </button>
              </div>

              {/* Profile Form */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        disabled={!editMode}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-300"
                        placeholder="Enter your first name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        disabled={!editMode}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-300"
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
                    <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-300"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {editMode && (
                  <div className="flex space-x-4 pt-6">
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold disabled:opacity-50 flex items-center justify-center"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Password Section */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 mt-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Security</h3>
                  <p className="text-gray-600">Manage your password and security settings</p>
                </div>
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="bg-red-100 text-red-600 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300"
                >
                  <Key className="w-5 h-5" />
                </button>
              </div>

              {showPasswordForm && (
                <div className="space-y-6 animate-in slide-in-from-top duration-300">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        placeholder="Enter new password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={handleChangePassword}
                      disabled={loading}
                      className="bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition-all duration-300 font-semibold disabled:opacity-50 flex items-center"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Key className="w-5 h-5 mr-2" />
                      )}
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                      className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Stats */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Account Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Storage Used</span>
                  <span className="font-semibold text-blue-600">
                    {user?.storageUsed ? Math.round((parseInt(user.storageUsed) / parseInt(user.storageLimit || '1073741824')) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-semibold text-purple-600">
                    {user?.subscriptionTier || 'Free'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Files</span>
                  <span className="font-semibold text-green-600">—</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center p-3 rounded-xl hover:bg-blue-50 transition-colors text-left">
                  <Bell className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-gray-700">Notifications</span>
                </button>
                <button className="w-full flex items-center p-3 rounded-xl hover:bg-purple-50 transition-colors text-left">
                  <Shield className="w-5 h-5 text-purple-600 mr-3" />
                  <span className="text-gray-700">Privacy</span>
                </button>
                <button className="w-full flex items-center p-3 rounded-xl hover:bg-green-50 transition-colors text-left">
                  <Globe className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-gray-700">Language</span>
                </button>
              </div>
            </div>

            {/* Account Status */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
              <div className="flex items-center mb-3">
                <Shield className="w-6 h-6 mr-2" />
                <span className="font-semibold">Account Verified</span>
              </div>
              <p className="text-green-100 text-sm">
                Your account is secure and verified. All features are available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
