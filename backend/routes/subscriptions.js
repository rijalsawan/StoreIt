const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { 
  SUBSCRIPTION_PLANS, 
  createCheckoutSession, 
  createPortalSession, 
  getSubscription,
  getSubscriptionWithDetails,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  getPaymentMethods,
  getInvoices,
  getUpcomingInvoice,
  createSetupIntent,
  createOrRetrieveCustomer,
  createOrRetrieveBillingPortalConfiguration,
  stripe 
} = require('../utils/stripe');
const { STORAGE_LIMITS } = require('../utils/storage');

const router = express.Router();
const prisma = new PrismaClient();

// Initialize billing portal configuration on startup
(async () => {
  try {
    console.log('🔧 Initializing Stripe billing portal configuration...');
    await createOrRetrieveBillingPortalConfiguration();
    console.log('✅ Stripe billing portal configuration ready');
  } catch (error) {
    console.warn('⚠️ Could not initialize billing portal configuration:', error.message);
    console.warn('💡 You may need to configure the billing portal in Stripe Dashboard');
  }
})();

// Get available plans
router.get('/plans', (req, res) => {
  const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
    id: key,
    ...plan,
    storageFormatted: plan.storageLimit >= 1099511627776 
      ? (plan.storageLimit / 1099511627776).toFixed(0) + 'TB'
      : plan.storageLimit >= 1073741824 
        ? (plan.storageLimit / 1073741824).toFixed(0) + 'GB'
        : (plan.storageLimit / 1048576).toFixed(0) + 'MB'
  }));

  res.json({ plans });
});

// Create checkout session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    // Accept both planType and planId for compatibility
    const { planType, planId } = req.body;
    const selectedPlan = planType || planId;
    
    if (!selectedPlan || !SUBSCRIPTION_PLANS[selectedPlan] || selectedPlan === 'FREE') {
      return res.status(400).json({ 
        error: 'Invalid plan type',
        availablePlans: Object.keys(SUBSCRIPTION_PLANS).filter(p => p !== 'FREE'),
        receivedPlan: selectedPlan
      });
    }

    const customerName = `${req.user.firstName} ${req.user.lastName}`;
    
    const session = await createCheckoutSession(
      req.user.id,
      selectedPlan,
      req.user.email,
      customerName
    );

    res.json({ 
      sessionUrl: session.url,
      sessionId: session.id 
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create portal session (for managing subscription)
router.post('/create-portal-session', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { subscription: true }
    });

    console.log(`Portal session request for user ${user.id}:`, {
      customerId: user.customerId,
      hasSubscription: !!user.subscription,
      subscriptionStatus: user.subscription?.status
    });

    // If user doesn't have a customer ID, create one
    if (!user.customerId) {
      console.log(`Creating Stripe customer for user ${user.id}`);
      
      try {
        const customerName = `${user.firstName} ${user.lastName}`;
        const customer = await createOrRetrieveCustomer(
          user.email,
          customerName,
          user.id
        );
        
        // Update user with customer ID
        await prisma.user.update({
          where: { id: user.id },
          data: { customerId: customer.id }
        });
        
        user.customerId = customer.id;
        console.log(`Created customer ${customer.id} for user ${user.id}`);
      } catch (customerError) {
        console.error('Error creating customer:', customerError);
        return res.status(500).json({ 
          error: 'Unable to create billing account. Please try again.' 
        });
      }
    }

    // Verify customer exists in Stripe
    try {
      const customer = await stripe.customers.retrieve(user.customerId);
      if (customer.deleted) {
        console.error(`Customer ${user.customerId} is deleted in Stripe`);
        return res.status(400).json({ 
          error: 'Billing account not found. Please contact support.' 
        });
      }
    } catch (customerError) {
      console.error(`Error retrieving customer ${user.customerId}:`, customerError);
      return res.status(400).json({ 
        error: 'Invalid billing account. Please contact support.' 
      });
    }

    const { returnUrl } = req.body;
    let validReturnUrl = returnUrl;
    
    // Validate and set default return URL
    if (!returnUrl || !returnUrl.startsWith('http')) {
      validReturnUrl = `${process.env.CLIENT_URL}/subscription`;
    } else if (process.env.CLIENT_URL && !returnUrl.startsWith(process.env.CLIENT_URL)) {
      console.warn(`Return URL ${returnUrl} doesn't match CLIENT_URL ${process.env.CLIENT_URL}`);
      validReturnUrl = `${process.env.CLIENT_URL}/subscription`;
    }

    console.log(`Creating billing portal session for user ${user.id}, customer ${user.customerId}, returnUrl: ${validReturnUrl}`);
    
    const session = await createPortalSession(user.customerId, validReturnUrl);
    
    console.log(`Billing portal session created successfully: ${session.id}`);
    
    res.json({ 
      sessionUrl: session.url,
      sessionId: session.id 
    });
  } catch (error) {
    console.error('Portal session error:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('No such customer')) {
      return res.status(400).json({ 
        error: 'Billing account not found. Please contact support.' 
      });
    }
    
    if (error.message?.includes('customer')) {
      return res.status(400).json({ 
        error: 'Invalid billing account. Please contact support.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Unable to open billing portal. Please try again.' 
    });
  }
});

// Get current subscription status
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        subscription: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscription = user.subscription;
    const currentPlan = subscription?.plan || 'FREE';
    const planDetails = SUBSCRIPTION_PLANS[currentPlan];

    let billingHistory = [];
    let paymentMethods = [];
    let nextBillingDate = null;

    // Get billing history and payment methods if user has a customer ID
    if (user.customerId) {
      try {
        const [invoices, methods] = await Promise.all([
          getInvoices(user.customerId, 5),
          getPaymentMethods(user.customerId)
        ]);

        billingHistory = invoices.data.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount_paid / 100, // Convert from cents
          currency: invoice.currency,
          status: invoice.status,
          date: new Date(invoice.created * 1000),
          description: invoice.description || `${planDetails?.name} Plan`,
          invoiceUrl: invoice.hosted_invoice_url
        }));

        paymentMethods = methods.data.map(pm => ({
          id: pm.id,
          type: pm.type,
          card: pm.card ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year
          } : null
        }));

        // Get next billing date from subscription
        if (subscription?.stripeSubId) {
          try {
            const stripeSubscription = await getSubscription(subscription.stripeSubId);
            nextBillingDate = new Date(stripeSubscription.current_period_end * 1000);
          } catch (error) {
            console.error('Error fetching Stripe subscription:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching billing data:', error);
      }
    }

    res.json({
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        nextBillingDate,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false
      } : null,
      plan: currentPlan,
      planDetails,
      storageUsed: user.storageUsed.toString(),
      storageLimit: user.storageLimit.toString(),
      customerId: user.customerId,
      billingHistory,
      paymentMethods
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { subscription: true }
    });

    if (!user?.subscription?.stripeSubId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Cancel at period end in Stripe
    await cancelSubscription(user.subscription.stripeSubId);

    // Update local database
    await prisma.subscription.update({
      where: { userId: req.user.id },
      data: { cancelAtPeriodEnd: true }
    });

    res.json({ message: 'Subscription will be canceled at the end of the billing period' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Reactivate subscription
router.post('/reactivate', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { subscription: true }
    });

    if (!user?.subscription?.stripeSubId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    // Reactivate in Stripe
    await reactivateSubscription(user.subscription.stripeSubId);

    // Update local database
    await prisma.subscription.update({
      where: { userId: req.user.id },
      data: { cancelAtPeriodEnd: false }
    });

    res.json({ message: 'Subscription reactivated successfully' });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// Upgrade/Change subscription
router.post('/upgrade', authenticateToken, async (req, res) => {
  try {
    // Accept both planType and planId for compatibility
    const { planType, planId } = req.body;
    const selectedPlan = planType || planId;
    
    if (!selectedPlan || !SUBSCRIPTION_PLANS[selectedPlan]) {
      return res.status(400).json({ 
        error: 'Invalid plan type',
        availablePlans: Object.keys(SUBSCRIPTION_PLANS),
        receivedPlan: selectedPlan
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { subscription: true }
    });

    // If downgrading to free
    if (selectedPlan === 'FREE') {
      if (user?.subscription?.stripeSubId) {
        await cancelSubscription(user.subscription.stripeSubId);
        await prisma.subscription.update({
          where: { userId: req.user.id },
          data: { cancelAtPeriodEnd: true }
        });
      }
      return res.json({ message: 'Downgrade scheduled for end of billing period' });
    }

    // For upgrades, create new checkout session
    const customerName = `${req.user.firstName} ${req.user.lastName}`;
    const session = await createCheckoutSession(
      req.user.id,
      selectedPlan,
      req.user.email,
      customerName
    );

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// Create setup intent for adding payment method
router.post('/setup-intent', authenticateToken, async (req, res) => {
  try {
    if (!req.user.customerId) {
      return res.status(400).json({ error: 'No customer found' });
    }

    const setupIntent = await createSetupIntent(req.user.customerId);
    
    res.json({ 
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id 
    });
  } catch (error) {
    console.error('Setup intent error:', error);
    res.status(500).json({ error: 'Failed to create setup intent' });
  }
});

// Stripe webhook endpoint with enhanced middleware
router.post('/webhook', async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!sig) {
    console.error('Missing Stripe signature header');
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📧 Received webhook event: ${event.type} - ${event.id}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'checkout.session.async_payment_succeeded':
        await handleCheckoutAsyncPaymentSucceeded(event.data.object);
        break;
      case 'checkout.session.async_payment_failed':
        await handleCheckoutAsyncPaymentFailed(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'customer.subscription.paused':
        await handleSubscriptionPaused(event.data.object);
        break;
      case 'customer.subscription.resumed':
        await handleSubscriptionResumed(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'invoice.payment_action_required':
        await handlePaymentActionRequired(event.data.object);
        break;
      case 'customer.created':
        await handleCustomerCreated(event.data.object);
        break;
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object);
        break;
      case 'customer.deleted':
        await handleCustomerDeleted(event.data.object);
        break;
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object);
        break;
      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object);
        break;
      case 'invoice.created':
        await handleInvoiceCreated(event.data.object);
        break;
      case 'invoice.finalized':
        await handleInvoiceFinalized(event.data.object);
        break;
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;
      default:
        console.log(`🔄 Unhandled event type: ${event.type}`);
    }

    console.log(`✅ Successfully processed webhook: ${event.type} - ${event.id}`);
    res.json({
      received: true,
      processed: true,
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Webhook handler error for event ${event.type}:`, error);
    res.status(500).json({
      error: 'Webhook handler failed',
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });
  }
});

// Get subscription usage and analytics
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        subscription: true,
        files: {
          select: {
            size: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPlan = user.subscription?.plan || 'FREE';
    const planDetails = SUBSCRIPTION_PLANS[currentPlan];

    // Calculate storage usage by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const filesLastSixMonths = user.files.filter(
      file => new Date(file.createdAt) >= sixMonthsAgo
    );

    const usageByMonth = {};
    filesLastSixMonths.forEach(file => {
      const month = new Date(file.createdAt).toISOString().substring(0, 7); // YYYY-MM
      if (!usageByMonth[month]) {
        usageByMonth[month] = 0;
      }
      usageByMonth[month] += Number(file.size);
    });

    const storageUsed = Number(user.storageUsed);
    const storageLimit = Number(user.storageLimit);
    const usagePercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;

    res.json({
      currentPlan,
      planDetails,
      storage: {
        used: storageUsed,
        limit: storageLimit,
        usagePercentage: Math.round(usagePercentage * 100) / 100,
        usedFormatted: formatBytes(storageUsed),
        limitFormatted: formatBytes(storageLimit)
      },
      files: {
        total: user.files.length,
        recentUploads: filesLastSixMonths.length
      },
      usageByMonth,
      subscription: user.subscription ? {
        status: user.subscription.status,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd
      } : null
    });
  } catch (error) {
    console.error('Usage analytics error:', error);
    res.status(500).json({ error: 'Failed to get usage analytics' });
  }
});

// Preview checkout (calculate prorations, taxes, etc.)
router.post('/preview-checkout', authenticateToken, async (req, res) => {
  try {
    // Accept both planType and planId for compatibility
    const { planType, planId } = req.body;
    const selectedPlan = planType || planId;
    
    if (!selectedPlan || !SUBSCRIPTION_PLANS[selectedPlan] || selectedPlan === 'FREE') {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    const plan = SUBSCRIPTION_PLANS[selectedPlan];
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { subscription: true }
    });

    let preview = {
      planType: selectedPlan,
      planName: plan.name,
      price: plan.price,
      features: plan.features,
      storageLimit: plan.storageLimit,
      storageFormatted: formatBytes(plan.storageLimit)
    };

    // If user has an existing subscription, calculate proration
    if (user.customerId && user.subscription?.stripeSubId) {
      try {
        const currentSubscription = await getSubscription(user.subscription.stripeSubId);
        
        // Create a preview invoice for the subscription change
        const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
          customer: user.customerId,
          subscription: user.subscription.stripeSubId,
          subscription_items: [{
            id: currentSubscription.items.data[0].id,
            price: plan.priceId
          }]
        });

        preview.proration = {
          amount: upcomingInvoice.amount_due / 100,
          currency: upcomingInvoice.currency,
          nextBillingDate: new Date(upcomingInvoice.period_end * 1000)
        };
      } catch (error) {
        console.error('Error calculating proration:', error);
        // Continue without proration info
      }
    }

    res.json({ preview });
  } catch (error) {
    console.error('Preview checkout error:', error);
    res.status(500).json({ error: 'Failed to preview checkout' });
  }
});

// Get billing history with more details
router.get('/billing-history', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, startingAfter } = req.query;
    
    if (!req.user.customerId) {
      return res.json({ billingHistory: [], hasMore: false });
    }

    const params = {
      customer: req.user.customerId,
      limit: parseInt(limit),
      expand: ['data.payment_intent']
    };

    if (startingAfter) {
      params.starting_after = startingAfter;
    }

    const invoices = await stripe.invoices.list(params);

    const billingHistory = invoices.data.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status,
      date: new Date(invoice.created * 1000),
      description: invoice.description || `Subscription Payment`,
      invoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      paymentMethod: invoice.payment_intent?.payment_method ? {
        type: invoice.payment_intent.payment_method.type,
        card: invoice.payment_intent.payment_method.card
      } : null,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null
    }));

    res.json({
      billingHistory,
      hasMore: invoices.has_more,
      nextStartingAfter: invoices.data.length > 0 ? invoices.data[invoices.data.length - 1].id : null
    });
  } catch (error) {
    console.error('Billing history error:', error);
    res.status(500).json({ error: 'Failed to get billing history' });
  }
});

// Update payment method (primary)
router.post('/update-payment-method', authenticateToken, async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    
    if (!req.user.customerId) {
      return res.status(400).json({ error: 'No customer found' });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    // Attach payment method to customer if not already attached
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: req.user.customerId,
      });
    } catch (error) {
      // Payment method might already be attached
      if (!error.message.includes('already been attached')) {
        throw error;
      }
    }

    // Set as default payment method for invoices
    await stripe.customers.update(req.user.customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    res.json({ message: 'Payment method updated successfully' });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
});

// Remove payment method
router.delete('/payment-method/:paymentMethodId', authenticateToken, async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    
    if (!req.user.customerId) {
      return res.status(400).json({ error: 'No customer found' });
    }

    // Detach payment method from customer
    await stripe.paymentMethods.detach(paymentMethodId);

    res.json({ message: 'Payment method removed successfully' });
  } catch (error) {
    console.error('Remove payment method error:', error);
    res.status(500).json({ error: 'Failed to remove payment method' });
  }
});

// Test Stripe integration endpoint (for development only)
router.get('/test-stripe', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Test endpoint not available in production' });
    }

    const tests = [];

    // Test 1: Check Stripe connection
    try {
      const account = await stripe.accounts.retrieve();
      tests.push({
        name: 'Stripe Connection',
        status: 'PASS',
        details: `Connected to Stripe account: ${account.id}`
      });
    } catch (error) {
      tests.push({
        name: 'Stripe Connection',
        status: 'FAIL',
        error: error.message
      });
    }

    // Test 2: Check webhook secret
    tests.push({
      name: 'Webhook Secret',
      status: process.env.STRIPE_WEBHOOK_SECRET ? 'PASS' : 'FAIL',
      details: process.env.STRIPE_WEBHOOK_SECRET ? 'Webhook secret configured' : 'Webhook secret missing'
    });

    // Test 3: Check price IDs
    const priceTests = [];
    for (const [planKey, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
      if (plan.priceId && planKey !== 'FREE') {
        try {
          const price = await stripe.prices.retrieve(plan.priceId);
          priceTests.push({
            plan: planKey,
            status: 'PASS',
            details: `Price ID valid: ${price.id}`
          });
        } catch (error) {
          priceTests.push({
            plan: planKey,
            status: 'FAIL',
            error: error.message
          });
        }
      }
    }

    tests.push({
      name: 'Price IDs',
      status: priceTests.every(t => t.status === 'PASS') ? 'PASS' : 'FAIL',
      details: priceTests
    });

    // Test 4: Check environment variables
    const requiredEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'CLIENT_URL'
    ];

    const envTests = requiredEnvVars.map(varName => ({
      variable: varName,
      status: process.env[varName] ? 'PASS' : 'FAIL'
    }));

    tests.push({
      name: 'Environment Variables',
      status: envTests.every(t => t.status === 'PASS') ? 'PASS' : 'FAIL',
      details: envTests
    });

    const overallStatus = tests.every(t => t.status === 'PASS') ? 'PASS' : 'FAIL';

    res.json({
      overallStatus,
      timestamp: new Date().toISOString(),
      tests
    });
  } catch (error) {
    console.error('Stripe test error:', error);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper functions for webhook handlers
async function handleCheckoutCompleted(session) {
  try {
    const userId = session.metadata.userId;
    const planType = session.metadata.planType;
    
    if (!userId || !planType) {
      console.error('Missing metadata in checkout session:', session.id);
      return;
    }

    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    
    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan) {
      console.error('Invalid plan type:', planType);
      return;
    }

    // Update user subscription in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        customerId: session.customer,
        storageLimit: plan.storageLimit,
        subscription: {
          upsert: {
            create: {
              stripeSubId: subscription.id,
              status: 'ACTIVE',
              plan: planType,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: false
            },
            update: {
              stripeSubId: subscription.id,
              status: 'ACTIVE',
              plan: planType,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: false
            }
          }
        }
      }
    });

    console.log(`Subscription created for user ${userId} with plan ${planType}`);
  } catch (error) {
    console.error('Error handling checkout completed:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription) {
  try {
    const userId = subscription.metadata.userId;
    const planType = subscription.metadata.planType;

    if (!userId || !planType) {
      console.error('Missing metadata in subscription:', subscription.id);
      return;
    }

    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan) {
      console.error('Invalid plan type:', planType);
      return;
    }

    // Get customer info
    const customer = await stripe.customers.retrieve(subscription.customer);

    await prisma.user.update({
      where: { id: userId },
      data: {
        customerId: customer.id,
        storageLimit: plan.storageLimit,
        subscription: {
          upsert: {
            create: {
              stripeSubId: subscription.id,
              status: subscription.status.toUpperCase(),
              plan: planType,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end
            },
            update: {
              stripeSubId: subscription.id,
              status: subscription.status.toUpperCase(),
              plan: planType,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end
            }
          }
        }
      }
    });

    console.log(`Subscription created: ${subscription.id} for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const user = await prisma.user.findFirst({
      where: { customerId: subscription.customer }
    });

    if (!user) {
      console.error('User not found for customer:', subscription.customer);
      return;
    }

    const planType = subscription.metadata.planType;
    const plan = planType ? SUBSCRIPTION_PLANS[planType] : null;

    const updateData = {
      status: subscription.status.toUpperCase(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    };

    if (planType && plan) {
      updateData.plan = planType;
    }

    await prisma.subscription.update({
      where: { userId: user.id },
      data: updateData
    });

    // Update storage limit if plan changed
    if (plan) {
      await prisma.user.update({
        where: { id: user.id },
        data: { storageLimit: plan.storageLimit }
      });
    }

    console.log(`Subscription updated: ${subscription.id} for user ${user.id}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const user = await prisma.user.findFirst({
      where: { customerId: subscription.customer }
    });

    if (!user) {
      console.error('User not found for customer:', subscription.customer);
      return;
    }

    // Reset to free plan
    await prisma.user.update({
      where: { id: user.id },
      data: {
        storageLimit: SUBSCRIPTION_PLANS.FREE.storageLimit,
        subscription: {
          update: {
            status: 'CANCELED',
            plan: 'FREE',
            cancelAtPeriodEnd: false
          }
        }
      }
    });

    console.log(`Subscription deleted: ${subscription.id} for user ${user.id}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    const user = await prisma.user.findFirst({
      where: { customerId: invoice.customer }
    });

    if (!user) {
      console.error('User not found for customer:', invoice.customer);
      return;
    }

    // Update subscription status to active if it was past due
    if (user.subscription && user.subscription.status === 'PAST_DUE') {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { status: 'ACTIVE' }
      });
    }

    console.log(`Payment succeeded for user ${user.id}, invoice: ${invoice.id}`);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const user = await prisma.user.findFirst({
      where: { customerId: invoice.customer }
    });

    if (!user) {
      console.error('User not found for customer:', invoice.customer);
      return;
    }

    await prisma.subscription.update({
      where: { userId: user.id },
      data: { status: 'PAST_DUE' }
    });

    console.log(`Payment failed for user ${user.id}, invoice: ${invoice.id}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
    throw error;
  }
}

async function handleCustomerCreated(customer) {
  try {
    const userId = customer.metadata.userId;
    
    if (!userId) {
      console.log('Customer created without userId metadata:', customer.id);
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { customerId: customer.id }
    });

    console.log(`Customer created: ${customer.id} for user ${userId}`);
  } catch (error) {
    console.error('Error handling customer created:', error);
    throw error;
  }
}

async function handleCustomerUpdated(customer) {
  try {
    const user = await prisma.user.findFirst({
      where: { customerId: customer.id }
    });

    if (!user) {
      console.log('Customer updated but no matching user found:', customer.id);
      return;
    }

    // Update user information if needed
    const updateData = {};
    
    if (customer.email && customer.email !== user.email) {
      updateData.email = customer.email;
    }

    if (customer.name) {
      const [firstName, ...lastNameParts] = customer.name.split(' ');
      if (firstName) {
        updateData.firstName = firstName;
        if (lastNameParts.length > 0) {
          updateData.lastName = lastNameParts.join(' ');
        }
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
    }

    console.log(`Customer updated: ${customer.id} for user ${user.id}`);
  } catch (error) {
    console.error('Error handling customer updated:', error);
    throw error;
  }
}

async function handleCustomerDeleted(customer) {
  try {
    const user = await prisma.user.findFirst({
      where: { customerId: customer.id }
    });

    if (!user) {
      console.log('Customer deleted but no matching user found:', customer.id);
      return;
    }

    // Reset user to free plan and remove customer ID
    await prisma.user.update({
      where: { id: user.id },
      data: {
        customerId: null,
        storageLimit: SUBSCRIPTION_PLANS.FREE.storageLimit
      }
    });

    // Cancel subscription if exists
    if (user.subscription) {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          status: 'CANCELED',
          plan: 'FREE'
        }
      });
    }

    console.log(`Customer deleted: ${customer.id} for user ${user.id}`);
  } catch (error) {
    console.error('Error handling customer deleted:', error);
    throw error;
  }
}

async function handlePaymentMethodAttached(paymentMethod) {
  try {
    console.log(`Payment method attached: ${paymentMethod.id} to customer: ${paymentMethod.customer}`);
    // Additional logic can be added here if needed
  } catch (error) {
    console.error('Error handling payment method attached:', error);
    throw error;
  }
}

async function handlePaymentMethodDetached(paymentMethod) {
  try {
    console.log(`Payment method detached: ${paymentMethod.id} from customer: ${paymentMethod.customer}`);
    
    // You might want to notify the user if they have no payment methods left
    const remainingMethods = await getPaymentMethods(paymentMethod.customer);
    
    if (remainingMethods.data.length === 0) {
      console.log(`Customer ${paymentMethod.customer} has no payment methods remaining`);
      // Could send notification or flag for attention
    }
  } catch (error) {
    console.error('Error handling payment method detached:', error);
    throw error;
  }
}

async function handleInvoiceCreated(invoice) {
  try {
    console.log(`Invoice created: ${invoice.id} for customer: ${invoice.customer}`);
    
    // You might want to log this for analytics or send notifications
    const user = await prisma.user.findFirst({
      where: { customerId: invoice.customer }
    });

    if (user) {
      console.log(`Invoice created for user ${user.id}: ${invoice.id}`);
    }
  } catch (error) {
    console.error('Error handling invoice created:', error);
    throw error;
  }
}

async function handleInvoiceFinalized(invoice) {
  try {
    console.log(`Invoice finalized: ${invoice.id} for customer: ${invoice.customer}`);
    
    // Invoice is ready for payment - you might want to send notification
    const user = await prisma.user.findFirst({
      where: { customerId: invoice.customer }
    });

    if (user) {
      console.log(`Invoice finalized for user ${user.id}: ${invoice.id}`);
      // Could send email notification about upcoming payment
    }
  } catch (error) {
    console.error('Error handling invoice finalized:', error);
    throw error;
  }
}

async function handleCheckoutAsyncPaymentSucceeded(session) {
  try {
    console.log(`Async payment succeeded for session: ${session.id}`);
    // Handle async payment success - could update subscription status if needed
    await handleCheckoutCompleted(session);
  } catch (error) {
    console.error('Error handling async payment succeeded:', error);
    throw error;
  }
}

async function handleCheckoutAsyncPaymentFailed(session) {
  try {
    const userId = session.metadata.userId;
    
    if (!userId) {
      console.error('Missing userId in failed checkout session:', session.id);
      return;
    }

    console.log(`Async payment failed for session: ${session.id}, user: ${userId}`);
    
    // Could send notification to user about failed payment
    // For now, just log the event
  } catch (error) {
    console.error('Error handling async payment failed:', error);
    throw error;
  }
}

async function handleSubscriptionPaused(subscription) {
  try {
    const user = await prisma.user.findFirst({
      where: { customerId: subscription.customer }
    });

    if (!user) {
      console.error('User not found for customer:', subscription.customer);
      return;
    }

    await prisma.subscription.update({
      where: { userId: user.id },
      data: { 
        status: 'INACTIVE',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      }
    });

    console.log(`Subscription paused: ${subscription.id} for user ${user.id}`);
  } catch (error) {
    console.error('Error handling subscription paused:', error);
    throw error;
  }
}

async function handleSubscriptionResumed(subscription) {
  try {
    const user = await prisma.user.findFirst({
      where: { customerId: subscription.customer }
    });

    if (!user) {
      console.error('User not found for customer:', subscription.customer);
      return;
    }

    const planType = subscription.metadata.planType;
    const plan = planType ? SUBSCRIPTION_PLANS[planType] : null;

    await prisma.subscription.update({
      where: { userId: user.id },
      data: { 
        status: 'ACTIVE',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });

    // Update storage limit if plan information is available
    if (plan) {
      await prisma.user.update({
        where: { id: user.id },
        data: { storageLimit: plan.storageLimit }
      });
    }

    console.log(`Subscription resumed: ${subscription.id} for user ${user.id}`);
  } catch (error) {
    console.error('Error handling subscription resumed:', error);
    throw error;
  }
}

async function handlePaymentActionRequired(invoice) {
  try {
    const user = await prisma.user.findFirst({
      where: { customerId: invoice.customer }
    });

    if (!user) {
      console.error('User not found for customer:', invoice.customer);
      return;
    }

    // Update subscription status to indicate action required
    await prisma.subscription.update({
      where: { userId: user.id },
      data: { status: 'UNPAID' }
    });

    console.log(`Payment action required for user ${user.id}, invoice: ${invoice.id}`);
    
    // Here you could send an email notification to the user
    // about the required payment action
  } catch (error) {
    console.error('Error handling payment action required:', error);
    throw error;
  }
}

async function handleTrialWillEnd(subscription) {
  try {
    const user = await prisma.user.findFirst({
      where: { customerId: subscription.customer }
    });

    if (!user) {
      console.error('User not found for customer:', subscription.customer);
      return;
    }

    console.log(`Trial will end for user ${user.id}, subscription: ${subscription.id}`);
    
    // Send notification to user about trial ending
    // Could trigger email sequence about upgrading
  } catch (error) {
    console.error('Error handling trial will end:', error);
    throw error;
  }
}

module.exports = router;
