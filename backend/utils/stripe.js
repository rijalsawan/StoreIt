const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: ['1GB Storage', 'Basic Support', 'Web Access'],
    storageLimit: 1073741824 // 1GB
  },
  PRO: {
    name: 'Pro',
    price: 9.99,
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro', // Replace with actual Stripe price ID
    features: ['100GB Storage', 'Priority Support', 'Advanced Sharing', 'Mobile Apps'],
    storageLimit: 107374182400 // 100GB
  },
  BUSINESS: {
    name: 'Business', 
    price: 19.99,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || 'price_business', // Replace with actual Stripe price ID
    features: ['1TB Storage', '24/7 Support', 'Team Collaboration', 'Advanced Security', 'API Access'],
    storageLimit: 1099511627776 // 1TB
  }
};

// Create Stripe customer
const createCustomer = async (email, name, userId) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId: userId
      }
    });
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
};

// Create checkout session for subscription
const createCheckoutSession = async (userId, planType, email, customerName) => {
  try {
    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan || planType === 'FREE') {
      throw new Error('Invalid plan type');
    }

    // Create or get customer
    let customer;
    try {
      customer = await createCustomer(email, customerName, userId);
    } catch (error) {
      // If customer already exists, find them
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      });
      
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        throw error;
      }
    }

    // Determine the correct frontend URL for redirects
    const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    
    console.log(`Creating checkout session with frontend URL: ${frontendUrl}`);
    console.log(`Success URL will be: ${frontendUrl}/success`);
    console.log(`Cancel URL will be: ${frontendUrl}/subscription`);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/subscription?canceled=true`,
      customer: customer.id,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        userId: userId,
        planType: planType
      },
      subscription_data: {
        metadata: {
          userId: userId,
          planType: planType
        }
      }
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Create billing portal session with enhanced configuration
const createPortalSession = async (customerId, returnUrl = null) => {
  try {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    // Validate customer exists and is not deleted
    let customer;
    try {
      customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        throw new Error('Customer account has been deleted');
      }
    } catch (error) {
      if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
        throw new Error('Customer not found in billing system');
      }
      throw error;
    }

    // Ensure return URL is valid
    const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const defaultReturnUrl = `${frontendUrl}/subscription`;
    const validReturnUrl = returnUrl && returnUrl.startsWith('http') ? returnUrl : defaultReturnUrl;

    console.log(`Creating portal session for customer ${customerId} with return URL: ${validReturnUrl}`);

    // Try to get or create billing portal configuration
    let sessionParams = {
      customer: customerId,
      return_url: validReturnUrl
    };

    try {
      const configuration = await createOrRetrieveBillingPortalConfiguration();
      if (configuration) {
        sessionParams.configuration = configuration.id;
      }
    } catch (configError) {
      console.warn('Could not create/retrieve billing portal configuration, using default:', configError.message);
      // Continue without configuration - Stripe will use default if available
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams);

    console.log(`Created billing portal session ${session.id} for customer ${customerId}`);
    return session;
  } catch (error) {
    console.error('Error creating portal session:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        throw new Error('Customer not found in billing system');
      }
      if (error.message?.includes('No configuration provided')) {
        throw new Error('Billing portal not configured. Please contact support.');
      }
      if (error.message?.includes('customer')) {
        throw new Error('Invalid customer account');
      }
      throw new Error('Invalid billing request');
    }
    
    throw error;
  }
};

// Create or retrieve billing portal configuration
const createOrRetrieveBillingPortalConfiguration = async () => {
  try {
    // First, try to list existing configurations
    const configurations = await stripe.billingPortal.configurations.list({ limit: 1 });
    
    if (configurations.data.length > 0) {
      console.log('Using existing billing portal configuration:', configurations.data[0].id);
      return configurations.data[0];
    }
    
    // Create a minimal configuration if none exists
    console.log('Creating minimal billing portal configuration...');
    
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your StoreIt subscription',
      },
      features: {
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
        },
        invoice_history: {
          enabled: true,
        },
        customer_update: {
          enabled: true,
          allowed_updates: ['email'],
        },
      },
      default_return_url: `${process.env.CLIENT_URL}/subscription`,
    });
    
    console.log('Created billing portal configuration:', configuration.id);
    return configuration;
  } catch (error) {
    console.error('Error creating billing portal configuration:', error);
    
    // If configuration creation fails, we'll try without configuration
    return null;
  }
};

// Get subscription details
const getSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
};

// Cancel subscription
const cancelSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });
    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

// Reactivate subscription
const reactivateSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });
    return subscription;
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
};

// Update subscription (change plan)
const updateSubscription = async (subscriptionId, newPriceId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
    });
    
    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

// Get customer's payment methods
const getPaymentMethods = async (customerId) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods;
  } catch (error) {
    console.error('Error retrieving payment methods:', error);
    throw error;
  }
};

// Get customer's invoices
const getInvoices = async (customerId, limit = 10) => {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: limit,
    });
    return invoices;
  } catch (error) {
    console.error('Error retrieving invoices:', error);
    throw error;
  }
};

// Create setup intent for saving payment method
const createSetupIntent = async (customerId) => {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    return setupIntent;
  } catch (error) {
    console.error('Error creating setup intent:', error);
    throw error;
  }
};

// Get customer by email
const getCustomerByEmail = async (email) => {
  try {
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });
    
    return customers.data.length > 0 ? customers.data[0] : null;
  } catch (error) {
    console.error('Error retrieving customer by email:', error);
    throw error;
  }
};

// Create or retrieve customer
const createOrRetrieveCustomer = async (email, name, userId) => {
  try {
    // First try to find existing customer
    const existingCustomer = await getCustomerByEmail(email);
    
    if (existingCustomer) {
      // Update customer metadata if needed
      if (!existingCustomer.metadata.userId) {
        await stripe.customers.update(existingCustomer.id, {
          metadata: { userId: userId }
        });
      }
      return existingCustomer;
    }
    
    // Create new customer
    return await createCustomer(email, name, userId);
  } catch (error) {
    console.error('Error creating or retrieving customer:', error);
    throw error;
  }
};

// Delete customer
const deleteCustomer = async (customerId) => {
  try {
    const deletedCustomer = await stripe.customers.del(customerId);
    return deletedCustomer;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

// Get upcoming invoice
const getUpcomingInvoice = async (customerId, subscriptionId = null) => {
  try {
    const params = { customer: customerId };
    if (subscriptionId) {
      params.subscription = subscriptionId;
    }
    
    const invoice = await stripe.invoices.retrieveUpcoming(params);
    return invoice;
  } catch (error) {
    console.error('Error retrieving upcoming invoice:', error);
    throw error;
  }
};

// Create usage record (for metered billing if needed)
const createUsageRecord = async (subscriptionItemId, quantity, timestamp = null) => {
  try {
    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity: quantity,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        action: 'set', // 'set' or 'increment'
      }
    );
    return usageRecord;
  } catch (error) {
    console.error('Error creating usage record:', error);
    throw error;
  }
};

// Retry failed payment
const retryPayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error retrying payment:', error);
    throw error;
  }
};

// Get subscription with expanded data
const getSubscriptionWithDetails = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'customer', 'default_payment_method']
    });
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription with details:', error);
    throw error;
  }
};

// Apply coupon to customer
const applyCoupon = async (customerId, couponId) => {
  try {
    const customer = await stripe.customers.update(customerId, {
      coupon: couponId
    });
    return customer;
  } catch (error) {
    console.error('Error applying coupon:', error);
    throw error;
  }
};

// Remove coupon from customer
const removeCoupon = async (customerId) => {
  try {
    const customer = await stripe.customers.update(customerId, {
      coupon: null
    });
    return customer;
  } catch (error) {
    console.error('Error removing coupon:', error);
    throw error;
  }
};

module.exports = {
  SUBSCRIPTION_PLANS,
  createCustomer,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  updateSubscription,
  getPaymentMethods,
  getInvoices,
  createSetupIntent,
  stripe,
  getCustomerByEmail,
  createOrRetrieveCustomer,
  deleteCustomer,
  getUpcomingInvoice,
  createUsageRecord,
  retryPayment,
  getSubscriptionWithDetails,
  applyCoupon,
  removeCoupon,
  createOrRetrieveBillingPortalConfiguration
};
