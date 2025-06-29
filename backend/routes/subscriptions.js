const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { createCheckoutSession, createPortalSession, SUBSCRIPTION_PLANS, stripe } = require('../utils/stripe');
const { STORAGE_LIMITS } = require('../utils/storage');

const router = express.Router();
const prisma = new PrismaClient();

// Get available plans
router.get('/plans', (req, res) => {
  const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
    id: key,
    ...plan,
    storageFormatted: plan.storageLimit / (1024 * 1024 * 1024) + 'GB'
  }));

  res.json({ plans });
});

// Create checkout session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!SUBSCRIPTION_PLANS[planType]) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    const session = await createCheckoutSession(
      req.user.id,
      planType,
      req.user.email
    );

    res.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create portal session (for managing subscription)
router.post('/create-portal-session', authenticateToken, async (req, res) => {
  try {
    if (!req.user.customerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const session = await createPortalSession(req.user.customerId);
    res.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get subscription status
router.get('/status', authenticateToken, async (req, res) => {
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
    const plan = subscription?.plan || 'FREE';

    res.json({
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
      } : null,
      plan,
      storageUsed: user.storageUsed.toString(),
      storageLimit: user.storageLimit.toString(),
      features: SUBSCRIPTION_PLANS[plan]?.features || ['500MB Storage', 'Basic Support']
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Helper functions for webhook handlers
async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;
  const planType = session.metadata.planType;
  
  // Get the subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  
  const plan = SUBSCRIPTION_PLANS[planType];
  if (!plan) {
    throw new Error('Invalid plan type');
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
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
          },
          update: {
            stripeSubId: subscription.id,
            status: 'ACTIVE',
            plan: planType,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
          }
        }
      }
    }
  });
}

async function handleSubscriptionUpdated(subscription) {
  const user = await prisma.user.findFirst({
    where: { customerId: subscription.customer }
  });

  if (user) {
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: subscription.status.toUpperCase(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      }
    });
  }
}

async function handleSubscriptionDeleted(subscription) {
  const user = await prisma.user.findFirst({
    where: { customerId: subscription.customer }
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        storageLimit: STORAGE_LIMITS.FREE,
        subscription: {
          update: {
            status: 'CANCELED'
          }
        }
      }
    });
  }
}

async function handlePaymentFailed(invoice) {
  const user = await prisma.user.findFirst({
    where: { customerId: invoice.customer }
  });

  if (user) {
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: 'PAST_DUE'
      }
    });
  }
}

module.exports = router;
