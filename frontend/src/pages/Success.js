import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import { 
  CheckCircle, 
  CreditCard, 
  Calendar, 
  Receipt, 
  ArrowRight,
  Cloud,
  Zap,
  Shield,
  ExternalLink
} from 'lucide-react';

const Success = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);
  const fetchingRef = useRef(false);

  const sessionId = searchParams.get('session_id');

  // Separate effect for handling redirect
  useEffect(() => {
    if (dataFetched && !sessionId) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 1000); // Give user a moment to see the redirect message
      
      return () => clearTimeout(timer);
    }
  }, [dataFetched, sessionId, navigate]);

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (fetchingRef.current) return; // Prevent multiple simultaneous requests
      
      try {
        fetchingRef.current = true;
        setLoading(true);
        
        // Refresh user data to get updated subscription info
        if (refreshUser) {
          await refreshUser();
        }
        
        // Fetch current subscription details
        const response = await api.get('/subscriptions/current');
        setSubscriptionData(response.data);
        
        // If we have billing history, get the latest invoice
        if (response.data.billingHistory && response.data.billingHistory.length > 0) {
          setInvoiceData(response.data.billingHistory[0]);
        }
        
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        toast.error('Failed to load subscription details');
      } finally {
        setLoading(false);
        setDataFetched(true);
        fetchingRef.current = false;
      }
    };

    // Handle different scenarios
    if (!sessionId) {
      // If no session ID, mark as fetched immediately
      setLoading(false);
      setDataFetched(true);
      return;
    }

    // Only fetch if we have a user and session ID and haven't fetched yet
    if (user && sessionId && !dataFetched && !fetchingRef.current) {
      fetchSubscriptionData();
    } else if (!user && sessionId && !dataFetched) {
      // If we have sessionId but no user yet, keep waiting
      setLoading(true);
    }
  }, [user, sessionId, dataFetched, refreshUser]);

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const handleViewProfile = () => {
    navigate('/profile');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <Header />
        <div className="flex items-center justify-center min-h-[70vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!sessionId && dataFetched) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <Header />
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const planDetails = subscriptionData?.planDetails;
  const subscription = subscriptionData?.subscription;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to {planDetails?.name || 'Premium'}!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your subscription has been successfully activated. You now have access to all premium features.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Subscription Details */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <Cloud className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Subscription Details</h2>
                <p className="text-gray-600">Your new plan information</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Plan</span>
                <span className="font-semibold text-blue-600 text-lg">
                  {planDetails?.name || 'Premium'}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Storage Limit</span>
                <span className="font-semibold text-gray-900">
                  {planDetails?.storageFormatted || '100GB'}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Price</span>
                <span className="font-semibold text-gray-900">
                  ${planDetails?.price || 'N/A'}/month
                </span>
              </div>
              
              {subscription?.nextBillingDate && (
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Next Billing</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(subscription.nextBillingDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600">Status</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          {invoiceData && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                  <Receipt className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Payment Receipt</h2>
                  <p className="text-gray-600">Your latest invoice</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Invoice ID</span>
                  <span className="font-mono text-sm text-gray-900">
                    {invoiceData.id.slice(-8)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-semibold text-gray-900 text-lg">
                    ${invoiceData.amount.toFixed(2)} {invoiceData.currency?.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Date</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(invoiceData.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Status</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Paid
                  </span>
                </div>

                {invoiceData.invoiceUrl && (
                  <div className="pt-4">
                    <a
                      href={invoiceData.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Full Invoice
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Features Highlight */}
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            What's included in your plan
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Cloud className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Enhanced Storage</h4>
              <p className="text-gray-600 text-sm">
                Get {planDetails?.storageFormatted || '100GB'} of secure cloud storage
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Faster Uploads</h4>
              <p className="text-gray-600 text-sm">
                Priority processing and faster file transfers
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Advanced Security</h4>
              <p className="text-gray-600 text-sm">
                Enhanced encryption and backup features
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleContinue}
            className="flex items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Continue to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          
          <button
            onClick={handleViewProfile}
            className="flex items-center justify-center border border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Manage Subscription
          </button>
        </div>

        {/* Support Note */}
        <div className="text-center mt-12 p-6 bg-blue-50 rounded-xl">
          <p className="text-blue-800">
            <span className="font-semibold">Need help?</span> Our support team is here to assist you with any questions about your new subscription.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Success;
