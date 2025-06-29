const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const SUBSCRIPTION_PLANS = {
  PRO: {
    name: 'Pro',
    price: 5,
    priceId: 'price_pro', // Replace with actual Stripe price ID
    features: ['10GB Storage', 'Priority Support', 'Advanced Sharing'],
    storageLimit: 10737418240 // 10GB
  },
  PREMIUM: {
    name: 'Premium', 
    price: 15,
    priceId: 'price_premium', // Replace with actual Stripe price ID
    features: ['100GB Storage', '24/7 Support', 'Advanced Sharing', 'File Versioning'],
    storageLimit: 107374182400 // 100GB
  }
};

const createCheckoutSession = async (userId, planType, email) => {
  try {
    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan) {
      throw new Error('Invalid plan type');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/pricing?canceled=true`,
      customer_email: email,
      metadata: {
        userId: userId,
        planType: planType
      }
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

const createPortalSession = async (customerId) => {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.CLIENT_URL}/dashboard`,
    });

    return session;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
};

module.exports = {
  SUBSCRIPTION_PLANS,
  createCheckoutSession,
  createPortalSession,
  stripe
};
