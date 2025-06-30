#!/usr/bin/env node

/**
 * Stripe Setup Script
 * 
 * This script helps set up the Stripe integration by:
 * 1. Creating products and prices in Stripe
 * 2. Configuring webhook endpoints
 * 3. Generating the necessary environment variables
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupStripeProducts() {
  console.log('🚀 Setting up Stripe products and prices...\n');

  const products = [
    {
      key: 'PRO',
      name: 'StoreIt Pro',
      description: '100GB storage with priority support and advanced features',
      price: 999, // $9.99 in cents
      features: ['100GB Storage', 'Priority Support', 'Advanced Sharing', 'Mobile Apps']
    },
    {
      key: 'BUSINESS',
      name: 'StoreIt Business',
      description: '1TB storage with 24/7 support and team collaboration',
      price: 1999, // $19.99 in cents
      features: ['1TB Storage', '24/7 Support', 'Team Collaboration', 'Advanced Security', 'API Access']
    }
  ];

  const createdPrices = {};

  for (const productData of products) {
    console.log(`Creating ${productData.name}...`);

    try {
      // Create product
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        metadata: {
          plan: productData.key,
          features: productData.features.join(', ')
        }
      });

      console.log(`✅ Product created: ${product.id}`);

      // Create price
      const price = await stripe.prices.create({
        unit_amount: productData.price,
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        product: product.id,
        metadata: {
          plan: productData.key
        }
      });

      console.log(`✅ Price created: ${price.id}`);
      createdPrices[productData.key] = price.id;

    } catch (error) {
      console.log(`❌ Error creating ${productData.name}: ${error.message}`);
    }
  }

  return createdPrices;
}

async function setupWebhook() {
  console.log('\n📡 Setting up webhook endpoint...\n');

  const webhookUrl = await question('Enter your webhook URL (e.g., https://yourapp.com/api/subscriptions/webhook): ');

  if (!webhookUrl) {
    console.log('⚠️  Skipping webhook setup - no URL provided');
    return null;
  }

  const events = [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.paused',
    'customer.subscription.resumed',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'invoice.payment_action_required',
    'customer.created',
    'customer.updated',
    'customer.deleted',
    'payment_method.attached',
    'payment_method.detached',
    'invoice.created',
    'invoice.finalized',
    'customer.subscription.trial_will_end'
  ];

  try {
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: events,
      api_version: '2023-10-16'
    });

    console.log(`✅ Webhook endpoint created: ${webhook.id}`);
    console.log(`📝 Webhook secret: ${webhook.secret}`);

    return webhook.secret;
  } catch (error) {
    console.log(`❌ Error creating webhook: ${error.message}`);
    return null;
  }
}

async function generateEnvConfig(priceIds, webhookSecret) {
  console.log('\n📄 Generating environment configuration...\n');

  const envConfig = `
# Stripe Configuration (Add these to your .env file)
STRIPE_SECRET_KEY=${process.env.STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET=${webhookSecret || 'your_webhook_secret_here'}
STRIPE_PRO_PRICE_ID=${priceIds.PRO || 'price_pro_id_here'}
STRIPE_BUSINESS_PRICE_ID=${priceIds.BUSINESS || 'price_business_id_here'}

# Make sure you also have these:
CLIENT_URL=http://localhost:3000
DATABASE_URL=your_database_url_here
JWT_SECRET=your_jwt_secret_here
`.trim();

  console.log('📋 Environment Configuration:');
  console.log('================================');
  console.log(envConfig);
  console.log('================================\n');

  const saveConfig = await question('Save this configuration to .env.stripe? (y/n): ');
  
  if (saveConfig.toLowerCase() === 'y') {
    const fs = require('fs');
    fs.writeFileSync('.env.stripe', envConfig);
    console.log('✅ Configuration saved to .env.stripe');
    console.log('📝 Remember to copy these values to your .env file');
  }
}

async function setupStripeIntegration() {
  console.log('🎯 StoreIt Stripe Integration Setup');
  console.log('====================================\n');

  // Check if Stripe key is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('❌ STRIPE_SECRET_KEY not found in environment variables');
    console.log('Please add your Stripe secret key to .env file and try again');
    process.exit(1);
  }

  console.log('✅ Stripe secret key found');

  // Ask user what they want to set up
  console.log('\nWhat would you like to set up?');
  console.log('1. Products and Prices');
  console.log('2. Webhook Endpoint');
  console.log('3. Both (Recommended)');
  console.log('4. Skip setup, just generate config');

  const choice = await question('\nEnter your choice (1-4): ');

  let priceIds = {};
  let webhookSecret = null;

  switch (choice) {
    case '1':
      priceIds = await setupStripeProducts();
      break;
    case '2':
      webhookSecret = await setupWebhook();
      break;
    case '3':
      priceIds = await setupStripeProducts();
      webhookSecret = await setupWebhook();
      break;
    case '4':
      console.log('⏭️  Skipping setup...');
      break;
    default:
      console.log('❌ Invalid choice');
      process.exit(1);
  }

  // Generate environment configuration
  await generateEnvConfig(priceIds, webhookSecret);

  console.log('\n🎉 Stripe setup completed!');
  console.log('\nNext steps:');
  console.log('1. Copy the environment variables to your .env file');
  console.log('2. Run `npm run test:stripe` to verify the setup');
  console.log('3. Test the integration with your application');
  console.log('4. Set up your production webhook URL when deploying');

  rl.close();
}

// Run the setup
if (require.main === module) {
  setupStripeIntegration().catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}

module.exports = { setupStripeIntegration };
