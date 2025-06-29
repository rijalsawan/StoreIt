import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
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
  TrendingUp
} from 'lucide-react';

const Subscription = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    fetchSubscriptionData();
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
    } catch (error) {
      console.error('Subscription fetch error:', error);
      // Set default plans if API fails
      setPlans([
        {
          id: 'free',
          name: 'Free',
          price: 0,
          storage: '1 GB',
          features: ['1 GB Storage', 'Basic File Sharing', 'Web Access', 'Community Support'],
          current: true
        },
        {
          id: 'premium',
          name: 'Premium',
          price: 9.99,
          storage: '100 GB',
          features: ['100 GB Storage', 'Advanced Sharing', 'Priority Support', 'Mobile Apps', 'Version History'],
          popular: true
        },
        {
          id: 'business',
          name: 'Business',
          price: 19.99,
          storage: '1 TB',
          features: ['1 TB Storage', 'Team Collaboration', '24/7 Support', 'Admin Controls', 'Advanced Security', 'API Access']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    try {
      setLoading(true);
      const response = await api.post('/subscriptions/upgrade', { planId });
      
      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        toast.success('Subscription updated successfully!');
        fetchSubscriptionData();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upgrade subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }

    try {
      setLoading(true);
      await api.post('/subscriptions/cancel');
      toast.success('Subscription cancelled successfully');
      fetchSubscriptionData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const formatStorageUsage = (used, limit) => {
    const usedGB = used / (1024 * 1024 * 1024);
    const limitGB = limit / (1024 * 1024 * 1024);
    const percentage = (usedGB / limitGB) * 100;
    
    return {
      usedGB: usedGB.toFixed(2),
      limitGB: limitGB.toFixed(0),
      percentage: percentage.toFixed(1)
    };
  };

  if (loading && !plans.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Header />
        <LoadingSpinner text="Loading subscription data..." />
      </div>
    );
  }

  const currentPlan = plans.find(plan => plan.current) || plans[0];
  const storageStats = user ? formatStorageUsage(
    parseInt(user.storageUsed || '0'),
    parseInt(user.storageLimit || '1073741824')
  ) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Subscription & Billing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage your subscription, view usage, and upgrade your plan
          </p>
        </div>

        {/* Current Plan Status */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-12 border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Plan Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-2xl">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentPlan?.name} Plan
                  </h2>
                  <p className="text-gray-600">
                    {currentPlan?.price === 0 ? 'Free forever' : `$${currentPlan?.price}/month`}
                  </p>
                </div>
                {currentPlan?.popular && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    <Star className="w-4 h-4 inline mr-1" />
                    Popular
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 p-6 rounded-xl">
                  <div className="flex items-center mb-2">
                    <Cloud className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="font-semibold text-blue-900">Storage</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{currentPlan?.storage}</p>
                  {storageStats && (
                    <p className="text-sm text-blue-700 mt-1">
                      {storageStats.usedGB} GB used ({storageStats.percentage}%)
                    </p>
                  )}
                </div>

                <div className="bg-purple-50 p-6 rounded-xl">
                  <div className="flex items-center mb-2">
                    <Calendar className="w-5 h-5 text-purple-600 mr-2" />
                    <span className="font-semibold text-purple-900">Next Billing</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {subscriptionData?.nextBillingDate ? 
                      new Date(subscriptionData.nextBillingDate).toLocaleDateString() : 
                      'N/A'
                    }
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    {currentPlan?.price === 0 ? 'Free plan' : 'Auto-renewal'}
                  </p>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Plan Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentPlan?.features?.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Storage Usage */}
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Usage</h3>
              {storageStats && (
                <>
                  <div className="relative mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(parseFloat(storageStats.percentage), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {storageStats.percentage}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {storageStats.usedGB} GB of {storageStats.limitGB} GB used
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {currentPlan?.id !== 'free' && (
            <div className="flex justify-end mt-8 pt-8 border-t border-gray-200">
              <button
                onClick={handleCancelSubscription}
                disabled={loading}
                className="bg-red-100 text-red-600 px-6 py-3 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 font-semibold disabled:opacity-50"
              >
                Cancel Subscription
              </button>
            </div>
          )}
        </div>

        {/* Available Plans */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
            <p className="text-gray-600">
              Upgrade anytime to get more storage and premium features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl shadow-sm border-2 transition-all duration-300 hover:shadow-lg ${
                  plan.popular 
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50' 
                    : plan.current 
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50' 
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    {plan.popular && (
                      <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4 inline-block">
                        <Sparkles className="w-4 h-4 inline mr-1" />
                        Most Popular
                      </div>
                    )}
                    {plan.current && (
                      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4 inline-block">
                        <Check className="w-4 h-4 inline mr-1" />
                        Current Plan
                      </div>
                    )}
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="text-4xl font-bold text-gray-900 mb-1">
                      ${plan.price}
                      {plan.price > 0 && <span className="text-lg text-gray-500">/month</span>}
                    </div>
                    <p className="text-gray-600">{plan.storage} storage</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {plan.features?.map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading || plan.current}
                    className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 ${
                      plan.current
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : plan.popular
                          ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:shadow-lg'
                          : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg'
                    }`}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : plan.current ? (
                      'Current Plan'
                    ) : plan.price === 0 ? (
                      'Downgrade to Free'
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing History</h2>
          
          {subscriptionData?.billingHistory?.length > 0 ? (
            <div className="space-y-4">
              {subscriptionData.billingHistory.map((invoice, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 rounded-lg mr-4">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {invoice.description}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(invoice.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${invoice.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-green-600">Paid</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="bg-gray-100 rounded-full p-4 w-fit mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No billing history</h3>
              <p className="text-gray-600">
                Your billing history will appear here once you upgrade to a paid plan
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Subscription;
