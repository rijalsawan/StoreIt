const express = require('express');
const { stripe } = require('../utils/stripe');

// Middleware to handle Stripe webhook signature verification
const verifyStripeWebhook = (req, res, next) => {
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

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    req.stripeEvent = event;
    next();
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// Middleware to log webhook events
const logWebhookEvent = (req, res, next) => {
  const event = req.stripeEvent;
  
  console.log(`📧 Received Stripe webhook: ${event.type} - ${event.id}`);
  console.log(`   Created: ${new Date(event.created * 1000).toISOString()}`);
  console.log(`   API Version: ${event.api_version}`);
  
  // Log important metadata
  if (event.data.object.metadata) {
    console.log(`   Metadata:`, event.data.object.metadata);
  }
  
  next();
};

// Error handling middleware for webhooks
const handleWebhookError = (err, req, res, next) => {
  const event = req.stripeEvent;
  
  console.error(`❌ Webhook handler error for event ${event?.type || 'unknown'}:`, err);
  
  // Log the full event data for debugging
  if (event) {
    console.error('Event data:', JSON.stringify(event.data.object, null, 2));
  }
  
  // Send error response
  res.status(500).json({
    error: 'Webhook handler failed',
    eventType: event?.type || 'unknown',
    eventId: event?.id || 'unknown',
    timestamp: new Date().toISOString()
  });
};

// Middleware to handle successful webhook processing
const handleWebhookSuccess = (req, res, next) => {
  const event = req.stripeEvent;
  
  console.log(`✅ Successfully processed webhook: ${event.type} - ${event.id}`);
  
  res.json({
    received: true,
    processed: true,
    eventType: event.type,
    eventId: event.id,
    timestamp: new Date().toISOString()
  });
};

// Rate limiting for webhooks (basic implementation)
const webhookRateLimit = (() => {
  const requests = new Map();
  const WINDOW_MS = 60 * 1000; // 1 minute
  const MAX_REQUESTS = 100; // Max 100 webhook requests per minute
  
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const timestamps = requests.get(key);
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(timestamp => now - timestamp < WINDOW_MS);
    
    if (validTimestamps.length >= MAX_REQUESTS) {
      console.warn(`⚠️ Webhook rate limit exceeded for IP: ${key}`);
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    validTimestamps.push(now);
    requests.set(key, validTimestamps);
    
    next();
  };
})();

// Middleware to validate event age (reject old events)
const validateEventAge = (req, res, next) => {
  const event = req.stripeEvent;
  const eventAge = Date.now() - (event.created * 1000);
  const MAX_AGE = 5 * 60 * 1000; // 5 minutes
  
  if (eventAge > MAX_AGE) {
    console.warn(`⚠️ Rejecting old webhook event: ${event.type} - ${event.id} (age: ${eventAge}ms)`);
    return res.status(400).json({ error: 'Event too old' });
  }
  
  next();
};

// Combined webhook middleware stack
const webhookMiddleware = [
  express.raw({ type: 'application/json' }),
  webhookRateLimit,
  verifyStripeWebhook,
  validateEventAge,
  logWebhookEvent
];

module.exports = {
  verifyStripeWebhook,
  logWebhookEvent,
  handleWebhookError,
  handleWebhookSuccess,
  webhookRateLimit,
  validateEventAge,
  webhookMiddleware
};
