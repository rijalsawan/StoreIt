import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import { Check, Star, Zap, Shield, Users, Crown } from 'lucide-react';

const Pricing = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      const [plansResponse, subscriptionResponse] = await Promise.all([
        api.get('/subscriptions/plans'),
        user ? api.get('/subscriptions/current') : Promise.resolve({ data: null })
      ]);
      
      setPlans(plansResponse.data.plans);
      if (subscriptionResponse.data) {
        setCurrentSubscription(subscriptionResponse.data);
      }
    } catch (error) {
      console.error('Pricing fetch error:', error);
      toast.error('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    try {
      const response = await api.post('/subscriptions/create-checkout-session', {
        planType: planId
      });
      
      // Redirect to Stripe Checkout
      window.location.href = response.data.sessionUrl;
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to start subscription process');
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await api.post('/subscriptions/create-portal-session');
      window.location.href = response.data.sessionUrl;
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open subscription management');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Pricing" />
        <LoadingSpinner text="Loading pricing plans..." />
      </div>
    );
  }

  const planIcons = {
    FREE: Shield,
    PRO: Zap,
    PREMIUM: Crown
  };

  const planColors = {
    FREE: 'border-gray-200',
    PRO: 'border-2 border-primary-500',
    PREMIUM: 'border-2 border-purple-500'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Pricing Plans" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start with our free plan and upgrade as you grow. All plans include secure storage, 
            file sharing, and access from any device.
          </p>
        </div>

        {/* Current Subscription Status */}
        {user && currentSubscription && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">
                  Current Plan: {currentSubscription.plan}
                </h3>
                <p className="text-blue-700">
                  Storage: {currentSubscription.storageUsed} / {currentSubscription.storageLimit}
                </p>
              </div>
              {currentSubscription.subscription && (
                <button
                  onClick={handleManageSubscription}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Manage Subscription
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className={`bg-white rounded-xl shadow-lg p-8 relative ${planColors.FREE}`}>
            <div className="text-center mb-8">
              <div className="bg-gray-100 text-gray-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">$0</div>
              <p className="text-gray-600">per month</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">500MB Storage</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">File Upload & Download</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Basic File Sharing</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Web Access</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Basic Support</span>
              </li>
            </ul>

            {user ? (
              currentSubscription?.plan === 'FREE' ? (
                <div className="text-center">
                  <div className="bg-gray-100 text-gray-600 py-3 rounded-lg font-medium">
                    Current Plan
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe('FREE')}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Downgrade to Free
                </button>
              )
            ) : (
              <Link
                to="/register"
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium block text-center"
              >
                Get Started Free
              </Link>
            )}
          </div>

          {/* Pro Plan */}
          <div className={`bg-white rounded-xl shadow-lg p-8 relative ${planColors.PRO}`}>
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            
            <div className="text-center mb-8">
              <div className="bg-primary-100 text-primary-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">$9.99</div>
              <p className="text-gray-600">per month</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">10GB Storage</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Unlimited File Uploads</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Advanced File Sharing</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Password Protected Links</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Priority Support</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">50MB File Size Limit</span>
              </li>
            </ul>

            {user ? (
              currentSubscription?.plan === 'PRO' ? (
                <div className="text-center">
                  <div className="bg-primary-100 text-primary-600 py-3 rounded-lg font-medium">
                    Current Plan
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe('PRO')}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  Upgrade to Pro
                </button>
              )
            ) : (
              <Link
                to="/register"
                className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium block text-center"
              >
                Start Pro Trial
              </Link>
            )}
          </div>

          {/* Premium Plan */}
          <div className={`bg-white rounded-xl shadow-lg p-8 relative ${planColors.PREMIUM}`}>
            <div className="text-center mb-8">
              <div className="bg-purple-100 text-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Business</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">$19.99</div>
              <p className="text-gray-600">per month</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">100GB Storage</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Unlimited File Uploads</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Advanced File Sharing</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">File Versioning</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">24/7 Priority Support</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">100MB File Size Limit</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Advanced Analytics</span>
              </li>
            </ul>

            {user ? (
              currentSubscription?.plan === 'PREMIUM' ? (
                <div className="text-center">
                  <div className="bg-purple-100 text-purple-600 py-3 rounded-lg font-medium">
                    Current Plan
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe('PREMIUM')}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Upgrade to Premium
                </button>
              )
            ) : (
              <Link
                to="/register"
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium block text-center"
              >
                Start Premium
              </Link>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I change my plan anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                and we'll prorate any charges accordingly.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens to my files if I downgrade?
              </h3>
              <p className="text-gray-600">
                Your files are always safe. If you exceed the storage limit of a lower plan, 
                you won't be able to upload new files until you free up space or upgrade again.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Our Free plan gives you 500MB of storage forever, no trial period needed. 
                For paid plans, you can cancel anytime during your first month for a full refund.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How secure are my files?
              </h3>
              <p className="text-gray-600">
                All files are encrypted in transit and at rest. We use industry-standard security 
                measures to protect your data, and we never share your files with third parties.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of users who trust StoreIt with their files
          </p>
          {!user && (
            <Link
              to="/register"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center text-lg font-medium"
            >
              Create Free Account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
