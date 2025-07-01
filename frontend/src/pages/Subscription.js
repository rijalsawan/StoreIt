import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { api, formatBytes } from '../utils/api';
import toast from 'react-hot-toast';
import { 
  CreditCard, 
  Crown, 
  Check, 
  X, 
  Zap, 
  Shield, 
  Cloud, 
  Users,
  Calendar,
  DollarSign,
  Sparkles,
  Star,
  Gift,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Settings,
  Download,
  RefreshCw,
  ArrowRight,
  Clock,
  Plus,
  ChevronRight,
  BarChart3,
  Wallet,
  Receipt,
  Eye,
  Globe,
  Lock,
  HelpCircle,
  FileText,
  Folder,
  Share2,
  Image,
  Video
} from 'lucide-react';

const Subscription = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchSubscriptionData();
    
    // Check for URL parameters indicating return from billing portal
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('updated') === 'true') {
      toast.success('Billing information updated successfully!');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (urlParams.get('session_id')) {
      toast.success('Billing portal session completed!');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const [subscriptionResponse, plansResponse] = await Promise.all([
        api.get('/subscriptions/current'),
        api.get('/subscriptions/plans')
      ]);
      
      setSubscriptionData(subscriptionResponse.data);
      setPlans(plansResponse.data.plans);
      setBillingHistory(subscriptionResponse.data.billingHistory || []);
    } catch (error) {
      console.error('Subscription fetch error:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    try {
      setActionLoading(true);
      const response = await api.post('/subscriptions/upgrade', { planId });
      
      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        toast.success('Subscription updated successfully!');
        await fetchSubscriptionData();
        await refreshUser();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upgrade subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setActionLoading(true);
      await api.post('/subscriptions/cancel');
      toast.success('Subscription will be canceled at the end of the billing period');
      await fetchSubscriptionData();
      setShowCancelModal(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setActionLoading(true);
      await api.post('/subscriptions/reactivate');
      toast.success('Subscription reactivated successfully!');
      await fetchSubscriptionData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reactivate subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setActionLoading(true);
      toast.loading('Opening billing portal...', { id: 'billing-portal' });
      
      const response = await api.post('/subscriptions/create-portal-session', {
        returnUrl: window.location.href
      });
      
      toast.success('Redirecting to billing portal...', { id: 'billing-portal' });
      
      setTimeout(() => {
        window.location.href = response.data.sessionUrl;
      }, 1000);
      
    } catch (error) {
      console.error('Billing portal error:', error);
      toast.error(error.response?.data?.error || 'Failed to open billing portal', { id: 'billing-portal' });
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: {
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle,
        text: 'Active'
      },
      past_due: {
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: AlertCircle,
        text: 'Past Due'
      },
      canceled: {
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: X,
        text: 'Canceled'
      },
      default: {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Cloud,
        text: 'Free'
      }
    };

    const config = statusConfig[status?.toLowerCase()] || statusConfig.default;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2 sm:px-3 py-1 max-sm:w-[4.5rem] sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border ${config.color}`}>
        <IconComponent className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Subscription" />
        <div className="flex items-center justify-center min-h-[70vh]">
          <LoadingSpinner text="Loading subscription data..." />
        </div>
      </div>
    );
  }

  const currentPlan = subscriptionData?.planDetails;
  const subscription = subscriptionData?.subscription;
  const storageUsed = parseInt(subscriptionData?.storageUsed || '0');
  const storageLimit = parseInt(subscriptionData?.storageLimit || '1073741824');
  const storagePercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'usage', label: 'Usage', icon: Cloud },
    { id: 'plans', label: 'Plans', icon: Crown }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Subscription" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Mobile-Optimized Header */}
        <div className="py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 lg:gap-6">
            {/* Left side - Welcome */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm">
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Subscription & Billing
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Manage your plan and billing
                </p>
              </div>
            </div>

            {/* Right side - Quick Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={fetchSubscriptionData}
                disabled={actionLoading}
                className="inline-flex items-center px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg sm:rounded-xl transition-all duration-200 border border-gray-200 group"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200 ${actionLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              
              {subscription && subscription.status !== 'canceled' && (
                <button
                  onClick={handleManageBilling}
                  disabled={actionLoading}
                  className="inline-flex items-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md group"
                >
                  <Settings className="w-4 h-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
                  <span className="hidden sm:inline">{actionLoading ? 'Opening...' : 'Manage Billing'}</span>
                  <span className="sm:hidden">{actionLoading ? 'Opening...' : 'Billing'}</span>
                </button>
              )}
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

        {/* Overview Tab - Mobile Optimized */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Plan Overview Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
              {/* Mobile-friendly header */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm">
                      <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                        {currentPlan?.name || 'Free'} Plan
                      </h2>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0 mt-1">
                        <p className="text-sm sm:text-base text-gray-600">
                          {currentPlan?.price ? `$${currentPlan.price}/month` : 'Free forever'}
                        </p>
                        {getStatusBadge(subscription?.status)}
                      </div>
                    </div>
                  </div>
                  
                  {(!subscription || subscription.status === 'canceled') && (
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-200 font-medium hover:scale-105 text-sm sm:text-base"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-8">
                {/* Subscription Alerts */}
                {subscription?.cancelAtPeriodEnd && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg sm:rounded-xl">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-amber-900 text-sm sm:text-base">
                            Subscription ends on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                          </p>
                          <p className="text-xs sm:text-sm text-amber-700 mt-1">
                            You'll lose access to premium features after this date
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleReactivateSubscription}
                        disabled={actionLoading}
                        className="w-full sm:w-auto bg-amber-600 text-white px-3 sm:px-4 py-2 text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors hover:scale-105"
                      >
                        Reactivate
                      </button>
                    </div>
                  </div>
                )}

                {/* Storage Usage Section */}
                <div className="mb-6 sm:mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Storage Usage</h3>
                    <span className="text-sm font-medium text-gray-700">
                      {formatBytes(storageUsed)} of {formatBytes(storageLimit)}
                    </span>
                  </div>
                  
                  <div className="mb-3 sm:mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                      <div
                        className={`h-2 sm:h-3 rounded-full transition-all duration-1000 ${
                          storagePercentage >= 90 ? 'bg-red-500' :
                          storagePercentage >= 75 ? 'bg-amber-500' :
                          'bg-gradient-to-r from-purple-500 to-indigo-600'
                        }`}
                        style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm space-y-2 sm:space-y-0">
                    <span className="text-gray-600">{storagePercentage.toFixed(1)}% used</span>
                    {storagePercentage >= 80 && (!currentPlan || currentPlan.name === 'Free') && (
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="text-purple-600 hover:text-purple-700 font-medium flex items-center group self-start sm:self-auto"
                      >
                        Upgrade for more space
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Next Billing Info */}
                {subscription?.nextBillingDate && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-blue-100">
                      <div className="flex items-center mb-2">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2" />
                        <span className="font-medium text-blue-900 text-sm sm:text-base">Next Billing</span>
                      </div>
                      <p className="text-blue-700 font-semibold text-sm sm:text-base">
                        {new Date(subscription.nextBillingDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    
                    <div className="bg-emerald-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-emerald-100">
                      <div className="flex items-center mb-2">
                        <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mr-2" />
                        <span className="font-medium text-emerald-900 text-sm sm:text-base">Amount</span>
                      </div>
                      <p className="text-emerald-700 font-semibold text-sm sm:text-base">
                        ${currentPlan?.price || 0}/month
                      </p>
                    </div>
                  </div>
                )}

                {/* Plan Features */}
                {currentPlan?.features && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Plan Features</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {currentPlan.features.slice(0, 6).map((feature, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 bg-emerald-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                            <Check className="w-2 h-2 sm:w-3 sm:h-3 text-emerald-600" />
                          </div>
                          <span className="text-gray-700 text-xs sm:text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {currentPlan.features.length > 6 && (
                      <button
                        onClick={() => setActiveTab('plans')}
                        className="mt-3 sm:mt-4 text-purple-600 hover:text-purple-700 text-xs sm:text-sm font-medium flex items-center group"
                      >
                        View all features
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Action Footer */}
              {subscription && subscription.status !== 'canceled' && (
                <div className="bg-gray-50 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-t border-gray-200/60">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                      <button
                        onClick={handleManageBilling}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium hover:scale-105"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Billing
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('plans')}
                        className="inline-flex items-center justify-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all duration-200 text-sm font-medium border border-gray-200"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        View Plans
                      </button>
                      {!subscription.cancelAtPeriodEnd && (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium hover:scale-105"
                      >
                        Cancel subscription
                      </button>
                    )}
                    </div>
                    
                    
                  </div>
                </div>
              )}
            </div>

            {/* Mobile-Optimized Quick Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Current Plan</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{currentPlan?.name || 'Free'}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Crown className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Storage Used</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{storagePercentage.toFixed(0)}%</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Cloud className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Monthly Cost</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">${currentPlan?.price || 0}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Status</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                      {subscription?.status ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : 'Free'}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

                        {/* Billing History Tab - Mobile Optimized */}
                {activeTab === 'billing' && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Mobile-Optimized Billing Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total spent</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900">
                              ${billingHistory.reduce((sum, bill) => sum + (bill.amount || 0), 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                          </div>
                        </div>
                      </div>
        
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active since</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900">
                              {subscription?.createdAt ? new Date(subscription.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                            </p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                          </div>
                        </div>
                      </div>
        
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Invoices</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900">{billingHistory.length}</p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                          </div>
                        </div>
                      </div>
                    </div>
        
                    {/* Mobile-Optimized Billing History */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200/60">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Billing History</h3>
                              <p className="text-xs sm:text-sm text-gray-600">View and download your invoices</p>
                            </div>
                          </div>
                          {subscription && subscription.status !== 'canceled' && (
                            <button
                              onClick={handleManageBilling}
                              disabled={actionLoading}
                              className="w-full sm:w-auto inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium hover:scale-105"
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Manage Billing
                            </button>
                          )}
                        </div>
                      </div>
        
                      <div className="p-4 sm:p-6">
                        {billingHistory.length === 0 ? (
                          <div className="text-center py-8 sm:py-12">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                              <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No billing history</h3>
                            <p className="text-sm sm:text-base text-gray-500">Your billing history will appear here once you have a subscription</p>
                          </div>
                        ) : (
                          <div className="space-y-2 sm:space-y-3">
                            {billingHistory.map((bill, index) => (
                              <div
                                key={bill.id || index}
                                className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-all duration-200"
                              >
                                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm sm:text-base">
                                          ${bill.amount?.toFixed(2) || '0.00'}
                                        </p>
                                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                                          {bill.date ? new Date(bill.date).toLocaleDateString() : 'Date not available'}
                                        </p>
                                      </div>
                                      <div className="flex items-center space-x-2 sm:space-x-3 mt-2 sm:mt-0">
                                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                                          bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                                          bill.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {bill.status || 'Unknown'}
                                        </span>
                                        {bill.invoiceUrl && (
                                          <a
                                            href={bill.invoiceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                            title="Download invoice"
                                          >
                                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
        
                {/* Usage Analytics Tab - Mobile Optimized */}
                {activeTab === 'usage' && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Mobile-Optimized Usage Overview */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Files stored</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900">{subscriptionData?.filesCount || 0}</p>
                          </div>
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                          </div>
                        </div>
                      </div>
        
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Folders</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900">{subscriptionData?.foldersCount || 0}</p>
                          </div>
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <Folder className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                          </div>
                        </div>
                      </div>
        
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Shared items</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900">{subscriptionData?.sharedCount || 0}</p>
                          </div>
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <Share2 className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                          </div>
                        </div>
                      </div>
        
                      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200/60 p-3 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Downloads</p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900">{subscriptionData?.downloadsCount || 0}</p>
                          </div>
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <Download className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
                          </div>
                        </div>
                      </div>
                    </div>
        
                    {/* Mobile-Optimized Detailed Usage */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200/60">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Storage Breakdown</h3>
                            <p className="text-xs sm:text-sm text-gray-600">Detailed view of your storage usage</p>
                          </div>
                        </div>
                      </div>
        
                      <div className="p-4 sm:p-6 lg:p-8">
                        <div className="space-y-4 sm:space-y-6">
                          {/* Storage Progress */}
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-1 sm:space-y-0">
                              <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Total Storage</h4>
                              <span className="text-xs sm:text-sm font-medium text-gray-700">
                                {formatBytes(storageUsed)} / {formatBytes(storageLimit)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4">
                              <div
                                className={`h-3 sm:h-4 rounded-full transition-all duration-1000 ${
                                  storagePercentage >= 90 ? 'bg-red-500' :
                                  storagePercentage >= 75 ? 'bg-amber-500' :
                                  'bg-gradient-to-r from-blue-500 to-purple-600'
                                }`}
                                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                              ></div>
                            </div>
                            <div className="mt-2 text-xs sm:text-sm text-gray-600">
                              {storagePercentage.toFixed(1)}% of your storage quota is being used
                            </div>
                          </div>
        
                          {/* File Type Distribution */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">File Types</h4>
                              <div className="space-y-2 sm:space-y-3">
                                <div className="flex items-center justify-between p-2 sm:p-3 bg-blue-50 rounded-lg">
                                  <div className="flex items-center space-x-2 sm:space-x-3">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-900">Documents</span>
                                  </div>
                                  <span className="text-xs sm:text-sm text-gray-600">
                                    {subscriptionData?.fileTypes?.documents || 0} files
                                  </span>
                                </div>
                                
                                <div className="flex items-center justify-between p-2 sm:p-3 bg-green-50 rounded-lg">
                                  <div className="flex items-center space-x-2 sm:space-x-3">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                      <Image className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-900">Images</span>
                                  </div>
                                  <span className="text-xs sm:text-sm text-gray-600">
                                    {subscriptionData?.fileTypes?.images || 0} files
                                  </span>
                                </div>
                                
                                <div className="flex items-center justify-between p-2 sm:p-3 bg-purple-50 rounded-lg">
                                  <div className="flex items-center space-x-2 sm:space-x-3">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                      <Video className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-900">Videos</span>
                                  </div>
                                  <span className="text-xs sm:text-sm text-gray-600">
                                    {subscriptionData?.fileTypes?.videos || 0} files
                                  </span>
                                </div>
                              </div>
                            </div>
        
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Plan Limits</h4>
                              <div className="space-y-3 sm:space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs sm:text-sm text-gray-600">Storage limit</span>
                                  <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                    {formatBytes(storageLimit)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs sm:text-sm text-gray-600">File size limit</span>
                                  <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                    {currentPlan?.maxFileSize ? formatBytes(currentPlan.maxFileSize) : 'Unlimited'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs sm:text-sm text-gray-600">Concurrent uploads</span>
                                  <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                    {currentPlan?.maxConcurrentUploads || 'Unlimited'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}                {/* Plans Tab - Dynamic & Mobile Optimized */}
                {activeTab === 'plans' && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Current Plan Status */}
                    {currentPlan && (
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-purple-200 p-4 sm:p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                              <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Current Plan: {currentPlan.name}</h3>
                              <p className="text-purple-700 font-medium text-sm sm:text-base">
                                {currentPlan.price > 0 ? `$${currentPlan.price}/month` : 'Free'}
                                {subscriptionData?.cancelAtPeriodEnd && (
                                  <span className="ml-2 text-amber-600">• Cancels on {new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}</span>
                                )}
                              </p>
                              {subscriptionData?.status && (
                                <div className="flex items-center mt-1">
                                  <div className={`w-2 h-2 rounded-full mr-2 ${
                                    subscriptionData.status === 'active' ? 'bg-emerald-500' :
                                    subscriptionData.status === 'canceled' ? 'bg-red-500' :
                                    subscriptionData.status === 'past_due' ? 'bg-amber-500' : 'bg-gray-400'
                                  }`} />
                                  <span className={`text-xs sm:text-sm font-medium capitalize ${
                                    subscriptionData.status === 'active' ? 'text-emerald-600' :
                                    subscriptionData.status === 'canceled' ? 'text-red-600' :
                                    subscriptionData.status === 'past_due' ? 'text-amber-600' : 'text-gray-600'
                                  }`}>
                                    {subscriptionData.status}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            {subscriptionData?.cancelAtPeriodEnd ? (
                              <button
                                onClick={handleReactivateSubscription}
                                disabled={actionLoading}
                                className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50"
                              >
                                Reactivate
                              </button>
                            ) : currentPlan.price > 0 ? (
                              <>
                                <button
                                  onClick={handleManageBilling}
                                  disabled={actionLoading}
                                  className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50"
                                >
                                  Manage
                                </button>
                                <button
                                  onClick={() => setShowCancelModal(true)}
                                  className="px-3 sm:px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs sm:text-sm font-medium"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Upgrade Recommendation */}
                    {user?.storage && (
                      (() => {
                        const storageUsed = user.storage.used || 0;
                        const storageLimit = user.storage.limit || 0;
                        const usagePercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;
                        const shouldShowRecommendation = usagePercentage >= 80 || (currentPlan?.name === 'Free' && usagePercentage >= 50);
                        
                        if (!shouldShowRecommendation) return null;
                        
                        const recommendedPlan = plans.find(plan => 
                          plan.storageLimit > storageLimit && plan.id !== currentPlan?.id
                        );
                        
                        if (!recommendedPlan) return null;
                        
                        return (
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl sm:rounded-2xl border border-amber-200 p-4 sm:p-6">
                            <div className="flex items-start space-x-3 sm:space-x-4">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                                  {usagePercentage >= 90 ? 'Storage Almost Full!' : 'Upgrade Recommended'}
                                </h3>
                                <p className="text-amber-800 text-sm sm:text-base mb-3">
                                  You're using {usagePercentage.toFixed(0)}% of your storage. 
                                  {usagePercentage >= 90 ? ' Upgrade now to avoid service interruption.' : ' Consider upgrading for more space and features.'}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <button
                                    onClick={() => handleUpgrade(recommendedPlan.id)}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm disabled:opacity-50"
                                  >
                                    Upgrade to {recommendedPlan.name} - ${recommendedPlan.price}/mo
                                  </button>
                                  <button
                                    onClick={() => setActiveTab('overview')}
                                    className="px-4 py-2 bg-white text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors font-medium text-sm"
                                  >
                                    View Usage Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}

                    {/* Dynamic Plans Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                      {plans.map((plan, index) => {
                        const isCurrentPlan = currentPlan?.id === plan.id;
                        const canUpgrade = !isCurrentPlan && (
                          !currentPlan || 
                          plan.price > (currentPlan.price || 0) ||
                          plan.storageLimit > (currentPlan.storageLimit || 0)
                        );
                        const canDowngrade = !isCurrentPlan && currentPlan && 
                          plan.price < currentPlan.price && plan.storageLimit < currentPlan.storageLimit;
                        
                        return (
                          <div
                            key={plan.id}
                            className={`bg-white rounded-xl sm:rounded-2xl border-2 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden ${
                              isCurrentPlan
                                ? 'border-purple-300 bg-gradient-to-b from-purple-50 to-white ring-2 ring-purple-100'
                                : 'border-gray-200/60 hover:border-purple-200'
                            }`}
                            style={{ 
                              animationDelay: `${index * 100}ms`,
                              animation: 'fadeInUp 0.6s ease-out forwards'
                            }}
                          >
                            {/* Plan Header */}
                            <div className="p-4 sm:p-6 lg:p-8 text-center relative">
                              {isCurrentPlan && (
                                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                                  <div className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                                    Current
                                  </div>
                                </div>
                              )}
                              
                              {plan.popular && !isCurrentPlan && (
                                <div className="inline-flex items-center px-2 sm:px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold mb-3 sm:mb-4">
                                  <Star className="w-3 h-3 mr-1" />
                                  Most Popular
                                </div>
                              )}
                              
                              <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                                isCurrentPlan 
                                  ? 'bg-gradient-to-br from-purple-600 to-indigo-700' 
                                  : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                              }`}>
                                <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                              </div>
                              
                              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                              <div className="mb-3 sm:mb-4">
                                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">${plan.price}</span>
                                <span className="text-gray-600 ml-1 text-sm sm:text-base">/month</span>
                              </div>
                              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{plan.description}</p>
                            </div>

                            {/* Features List */}
                            <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
                              <ul className="space-y-2 sm:space-y-3">
                                {plan.features?.map((feature, featureIndex) => (
                                  <li key={featureIndex} className="flex items-start">
                                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-emerald-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 mt-0.5">
                                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" />
                                    </div>
                                    <span className="text-gray-700 text-xs sm:text-sm">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Action Button */}
                            <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
                              {isCurrentPlan ? (
                                <div className="space-y-2">
                                  <button
                                    disabled
                                    className="w-full bg-purple-100 text-purple-700 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold cursor-not-allowed text-sm sm:text-base border border-purple-200"
                                  >
                                    Current Plan
                                  </button>
                                  {currentPlan.price > 0 && (
                                    <button
                                      onClick={handleManageBilling}
                                      disabled={actionLoading}
                                      className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                                    >
                                      Manage Billing
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleUpgrade(plan.id)}
                                  disabled={actionLoading}
                                  className={`w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base ${
                                    canUpgrade && plan.popular
                                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:scale-105'
                                      : canUpgrade
                                      ? 'bg-gray-900 text-white hover:bg-gray-800 hover:scale-105'
                                      : canDowngrade
                                      ? 'bg-orange-600 text-white hover:bg-orange-700 hover:scale-105'
                                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  } disabled:opacity-50`}
                                >
                                  {actionLoading ? 'Processing...' : 
                                   canUpgrade ? `Upgrade to ${plan.name}` :
                                   canDowngrade ? `Downgrade to ${plan.name}` : 
                                   'Not Available'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Enhanced Plan Comparison */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200/60">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Plan Comparison</h3>
                            <p className="text-xs sm:text-sm text-gray-600">Compare features across all plans</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 lg:p-8">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 sm:py-4 px-2 sm:px-4 font-semibold text-gray-900 text-sm sm:text-base">Feature</th>
                                {plans.map(plan => (
                                  <th key={plan.id} className={`text-center py-3 sm:py-4 px-2 sm:px-4 font-semibold text-sm sm:text-base whitespace-nowrap ${
                                    currentPlan?.id === plan.id ? 'text-purple-900 bg-purple-50' : 'text-gray-900'
                                  }`}>
                                    {plan.name}
                                    {currentPlan?.id === plan.id && (
                                      <div className="text-xs text-purple-600 font-normal">Current</div>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-100">
                                <td className="py-3 sm:py-4 px-2 sm:px-4 text-gray-700 text-sm font-medium">Storage</td>
                                {plans.map(plan => (
                                  <td key={plan.id} className={`text-center py-3 sm:py-4 px-2 sm:px-4 font-medium text-sm ${
                                    currentPlan?.id === plan.id ? 'text-purple-900 bg-purple-50' : 'text-gray-900'
                                  }`}>
                                    {formatBytes(plan.storageLimit)}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-gray-100">
                                <td className="py-3 sm:py-4 px-2 sm:px-4 text-gray-700 text-sm font-medium">Max file size</td>
                                {plans.map(plan => (
                                  <td key={plan.id} className={`text-center py-3 sm:py-4 px-2 sm:px-4 font-medium text-sm ${
                                    currentPlan?.id === plan.id ? 'text-purple-900 bg-purple-50' : 'text-gray-900'
                                  }`}>
                                    {plan.maxFileSize ? formatBytes(plan.maxFileSize) : 'Unlimited'}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-gray-100">
                                <td className="py-3 sm:py-4 px-2 sm:px-4 text-gray-700 text-sm font-medium">Priority support</td>
                                {plans.map(plan => (
                                  <td key={plan.id} className={`text-center py-3 sm:py-4 px-2 sm:px-4 ${
                                    currentPlan?.id === plan.id ? 'bg-purple-50' : ''
                                  }`}>
                                    {plan.prioritySupport ? (
                                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mx-auto" />
                                    ) : (
                                      <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mx-auto" />
                                    )}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-gray-100">
                                <td className="py-3 sm:py-4 px-2 sm:px-4 text-gray-700 text-sm font-medium">Concurrent uploads</td>
                                {plans.map(plan => (
                                  <td key={plan.id} className={`text-center py-3 sm:py-4 px-2 sm:px-4 font-medium text-sm ${
                                    currentPlan?.id === plan.id ? 'text-purple-900 bg-purple-50' : 'text-gray-900'
                                  }`}>
                                    {plan.maxConcurrentUploads || 'Unlimited'}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Plan Change History */}
                    {billingHistory && billingHistory.length > 0 && (
                      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200/60">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Changes</h3>
                              <p className="text-xs sm:text-sm text-gray-600">Your subscription history</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 sm:p-6 lg:p-8">
                          <div className="space-y-3">
                            {billingHistory.slice(0, 5).map((item, index) => (
                              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-2 h-2 rounded-full ${
                                    item.type === 'upgrade' ? 'bg-emerald-500' :
                                    item.type === 'downgrade' ? 'bg-orange-500' :
                                    item.type === 'cancel' ? 'bg-red-500' : 'bg-blue-500'
                                  }`} />
                                  <span className="text-sm font-medium text-gray-900 capitalize">{item.type}</span>
                                  <span className="text-sm text-gray-600">to {item.planName}</span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {new Date(item.date).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
        
                {/* Mobile-Optimized Upgrade Modal */}
                {showUpgradeModal && (
                  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
                    <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between p-4 sm:p-6 lg:p-8 border-b border-gray-200">
                        <div className="flex items-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                            <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Upgrade Your Plan</h3>
                            <p className="text-sm sm:text-base text-gray-500">Choose the perfect plan for your needs</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowUpgradeModal(false)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg sm:rounded-xl transition-all duration-200"
                        >
                          <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                      </div>
        
                      <div className="p-4 sm:p-6 lg:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                          {plans.filter(plan => plan.id !== currentPlan?.id).map((plan) => (
                            <div
                              key={plan.id}
                              className="border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-purple-300 transition-all duration-300 hover:shadow-lg"
                            >
                              <div className="text-center mb-4 sm:mb-6">
                                <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{plan.name}</h4>
                                <div className="mb-3 sm:mb-4">
                                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">${plan.price}</span>
                                  <span className="text-gray-600 ml-1 text-sm sm:text-base">/month</span>
                                </div>
                                <p className="text-gray-600 text-xs sm:text-sm">{plan.description}</p>
                              </div>
        
                              <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                                {plan.features?.slice(0, 5).map((feature, index) => (
                                  <li key={index} className="flex items-center text-xs sm:text-sm">
                                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 mr-2 flex-shrink-0" />
                                    <span className="text-gray-700">{feature}</span>
                                  </li>
                                ))}
                              </ul>
        
                              <button
                                onClick={() => {
                                  handleUpgrade(plan.id);
                                  setShowUpgradeModal(false);
                                }}
                                disabled={actionLoading}
                                className="w-full bg-purple-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-purple-700 transition-all duration-200 font-semibold hover:scale-105 disabled:opacity-50 text-sm sm:text-base"
                              >
                                {actionLoading ? 'Processing...' : `Upgrade to ${plan.name}`}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
        
                {/* Mobile-Optimized Cancel Subscription Modal */}
                {showCancelModal && (
                  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
                    <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="p-4 sm:p-6 lg:p-8">
                        <div className="flex items-center mb-4 sm:mb-6">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                          </div>
                          <div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Cancel Subscription</h3>
                            <p className="text-gray-500 text-xs sm:text-sm">This action cannot be undone</p>
                          </div>
                        </div>
                        
                        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl">
                          <p className="text-red-800 font-medium mb-2 text-sm sm:text-base">
                            Are you sure you want to cancel your subscription?
                          </p>
                          <p className="text-red-600 text-xs sm:text-sm">
                            You'll lose access to premium features at the end of your current billing period.
                          </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={handleCancelSubscription}
                            disabled={actionLoading}
                            className="flex-1 bg-red-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-red-700 transition-all duration-200 font-semibold disabled:opacity-50 text-sm sm:text-base"
                          >
                            {actionLoading ? 'Canceling...' : 'Cancel Subscription'}
                          </button>
                          <button
                            onClick={() => setShowCancelModal(false)}
                            className="flex-1 bg-gray-100 text-gray-700 py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold text-sm sm:text-base"
                          >
                            Keep Subscription
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        };
        
        export default Subscription;