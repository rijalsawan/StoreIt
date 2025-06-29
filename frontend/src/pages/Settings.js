import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Globe, 
  Moon, 
  Sun, 
  Monitor,
  Lock,
  Eye,
  EyeOff,
  Download,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Smartphone,
  Mail,
  Key,
  Database,
  FileText,
  Users,
  Zap
} from 'lucide-react';

const Settings = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      fileSharing: true,
      storageAlerts: true,
      securityAlerts: true
    },
    privacy: {
      profileVisibility: 'private',
      shareAnalytics: false,
      twoFactorAuth: false
    },
    appearance: {
      theme: 'system',
      language: 'en'
    },
    storage: {
      autoDelete: false,
      deleteAfterDays: 30,
      compressionEnabled: true
    }
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/settings');
      setSettings(prev => ({ ...prev, ...response.data.settings }));
    } catch (error) {
      console.error('Settings fetch error:', error);
      // Use default settings if API fails
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      await api.put('/user/settings', newSettings);
      setSettings(newSettings);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleNotificationChange = (key, value) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value
      }
    };
    updateSettings(newSettings);
  };

  const handlePrivacyChange = (key, value) => {
    const newSettings = {
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: value
      }
    };
    updateSettings(newSettings);
  };

  const handleAppearanceChange = (key, value) => {
    const newSettings = {
      ...settings,
      appearance: {
        ...settings.appearance,
        [key]: value
      }
    };
    updateSettings(newSettings);
  };

  const handleStorageChange = (key, value) => {
    const newSettings = {
      ...settings,
      storage: {
        ...settings.storage,
        [key]: value
      }
    };
    updateSettings(newSettings);
  };

  const handleExportData = async () => {
    try {
      setExportLoading(true);
      const response = await api.get('/user/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `storeit-data-${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Data export started');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    try {
      setLoading(true);
      await api.delete('/user/account');
      toast.success('Account deleted successfully');
      logout();
    } catch (error) {
      toast.error('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (loading && !Object.keys(settings).length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Header />
        <LoadingSpinner text="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Customize your experience and manage your preferences</p>
        </div>

        <div className="space-y-8">
          {/* Notifications */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-3 rounded-xl mr-4">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                <p className="text-gray-600">Manage how you receive notifications</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Email Notifications</h3>
                  <p className="text-sm text-gray-600">Receive important updates via email</p>
                </div>
                <ToggleSwitch
                  enabled={settings.notifications.email}
                  onChange={(value) => handleNotificationChange('email', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Push Notifications</h3>
                  <p className="text-sm text-gray-600">Get real-time notifications in your browser</p>
                </div>
                <ToggleSwitch
                  enabled={settings.notifications.push}
                  onChange={(value) => handleNotificationChange('push', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">File Sharing Alerts</h3>
                  <p className="text-sm text-gray-600">Notify when files are shared with you</p>
                </div>
                <ToggleSwitch
                  enabled={settings.notifications.fileSharing}
                  onChange={(value) => handleNotificationChange('fileSharing', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Storage Alerts</h3>
                  <p className="text-sm text-gray-600">Warn when approaching storage limits</p>
                </div>
                <ToggleSwitch
                  enabled={settings.notifications.storageAlerts}
                  onChange={(value) => handleNotificationChange('storageAlerts', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Security Alerts</h3>
                  <p className="text-sm text-gray-600">Important security and login notifications</p>
                </div>
                <ToggleSwitch
                  enabled={settings.notifications.securityAlerts}
                  onChange={(value) => handleNotificationChange('securityAlerts', value)}
                />
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="bg-green-100 p-3 rounded-xl mr-4">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Privacy & Security</h2>
                <p className="text-gray-600">Control your privacy and security settings</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Profile Visibility</h3>
                  <p className="text-sm text-gray-600">Who can see your profile information</p>
                </div>
                <select
                  value={settings.privacy.profileVisibility}
                  onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="private">Private</option>
                  <option value="friends">Friends Only</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Share Analytics</h3>
                  <p className="text-sm text-gray-600">Help improve our service with usage data</p>
                </div>
                <ToggleSwitch
                  enabled={settings.privacy.shareAnalytics}
                  onChange={(value) => handlePrivacyChange('shareAnalytics', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                </div>
                <div className="flex items-center space-x-3">
                  <ToggleSwitch
                    enabled={settings.privacy.twoFactorAuth}
                    onChange={(value) => handlePrivacyChange('twoFactorAuth', value)}
                  />
                  {settings.privacy.twoFactorAuth && (
                    <button className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-colors">
                      Configure
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="bg-purple-100 p-3 rounded-xl mr-4">
                <Monitor className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Appearance</h2>
                <p className="text-gray-600">Customize the look and feel</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Theme</h3>
                  <p className="text-sm text-gray-600">Choose your preferred theme</p>
                </div>
                <div className="flex bg-gray-100 rounded-xl p-1">
                  {[
                    { value: 'light', icon: Sun, label: 'Light' },
                    { value: 'dark', icon: Moon, label: 'Dark' },
                    { value: 'system', icon: Monitor, label: 'System' }
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => handleAppearanceChange('theme', value)}
                      className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${
                        settings.appearance.theme === value
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Language</h3>
                  <p className="text-sm text-gray-600">Select your preferred language</p>
                </div>
                <select
                  value={settings.appearance.language}
                  onChange={(e) => handleAppearanceChange('language', e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="zh">中文</option>
                </select>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="bg-orange-100 p-3 rounded-xl mr-4">
                <Database className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Storage</h2>
                <p className="text-gray-600">Manage your storage preferences</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Auto-delete Old Files</h3>
                  <p className="text-sm text-gray-600">Automatically delete files after a period</p>
                </div>
                <ToggleSwitch
                  enabled={settings.storage.autoDelete}
                  onChange={(value) => handleStorageChange('autoDelete', value)}
                />
              </div>

              {settings.storage.autoDelete && (
                <div className="flex items-center justify-between ml-8">
                  <div>
                    <h3 className="font-semibold text-gray-900">Delete After</h3>
                    <p className="text-sm text-gray-600">Number of days to keep files</p>
                  </div>
                  <select
                    value={settings.storage.deleteAfterDays}
                    onChange={(e) => handleStorageChange('deleteAfterDays', parseInt(e.target.value))}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>1 year</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">File Compression</h3>
                  <p className="text-sm text-gray-600">Compress files to save storage space</p>
                </div>
                <ToggleSwitch
                  enabled={settings.storage.compressionEnabled}
                  onChange={(value) => handleStorageChange('compressionEnabled', value)}
                />
              </div>
            </div>
          </div>

          {/* Data & Privacy */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="bg-indigo-100 p-3 rounded-xl mr-4">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Data & Privacy</h2>
                <p className="text-gray-600">Manage your data and account</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Export Data</h3>
                  <p className="text-sm text-gray-600">Download a copy of all your data</p>
                </div>
                <button
                  onClick={handleExportData}
                  disabled={exportLoading}
                  className="bg-blue-100 text-blue-600 px-6 py-3 rounded-xl hover:bg-blue-500 hover:text-white transition-all duration-300 font-semibold disabled:opacity-50 flex items-center"
                >
                  {exportLoading ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Download className="w-5 h-5 mr-2" />
                  )}
                  Export Data
                </button>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-red-600 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Delete Account
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-red-100 text-red-600 px-6 py-3 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 font-semibold"
                  >
                    <Trash2 className="w-5 h-5 mr-2 inline" />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center mb-6">
              <div className="bg-red-100 p-3 rounded-xl mr-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delete Account</h3>
                <p className="text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                This will permanently delete your account and all associated data, including:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
                <li>All uploaded files and folders</li>
                <li>Account settings and preferences</li>
                <li>Subscription and billing history</li>
                <li>Shared links and collaborations</li>
              </ul>
              <p className="text-sm text-gray-600 mb-4">
                Type <strong>DELETE</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Type DELETE to confirm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmText !== 'DELETE'}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Delete Account'
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
