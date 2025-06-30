# Stripe Integration Documentation

## Overview

This document describes the comprehensive Stripe integration for the StoreIt cloud storage application, including subscription management, webhook handling, and payment processing.

## Architecture

### Components

1. **Stripe Utils** (`/backend/utils/stripe.js`)
   - Core Stripe API functions
   - Subscription plan definitions
   - Customer management utilities

2. **Subscription Routes** (`/backend/routes/subscriptions.js`)
   - REST API endpoints for subscription management
   - Webhook event handling
   - User-facing subscription operations

3. **Webhook Middleware** (`/backend/middleware/stripe-webhook.js`)
   - Signature verification
   - Rate limiting
   - Event logging and validation

## Subscription Plans

```javascript
FREE: {
  name: 'Free',
  price: 0,
  storageLimit: 1073741824 // 1GB
}

PRO: {
  name: 'Pro',
  price: 9.99,
  storageLimit: 107374182400 // 100GB
}

BUSINESS: {
  name: 'Business',
  price: 19.99,
  storageLimit: 1099511627776 // 1TB
}
```

## API Endpoints

### Public Endpoints

#### `GET /api/subscriptions/plans`
Returns available subscription plans.

**Response:**
```json
{
  "plans": [
    {
      "id": "PRO",
      "name": "Pro",
      "price": 9.99,
      "features": ["100GB Storage", "Priority Support"],
      "storageFormatted": "100GB"
    }
  ]
}
```

### Protected Endpoints (Require Authentication)

#### `POST /api/subscriptions/create-checkout-session`
Creates a Stripe checkout session for subscription purchase.

**Request:**
```json
{
  "planType": "PRO"
}
```

**Response:**
```json
{
  "sessionUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_..."
}
```

#### `POST /api/subscriptions/create-portal-session`
Creates a Stripe billing portal session for subscription management.

**Request:**
```json
{
  "returnUrl": "https://yourapp.com/subscription"
}
```

**Response:**
```json
{
  "sessionUrl": "https://billing.stripe.com/..."
}
```

#### `GET /api/subscriptions/current`
Returns current subscription status and details.

**Response:**
```json
{
  "subscription": {
    "id": "sub_...",
    "plan": "PRO",
    "status": "ACTIVE",
    "currentPeriodEnd": "2024-01-01T00:00:00Z",
    "cancelAtPeriodEnd": false
  },
  "planDetails": { /* plan object */ },
  "storageUsed": "1234567890",
  "storageLimit": "107374182400",
  "billingHistory": [ /* invoices */ ],
  "paymentMethods": [ /* payment methods */ ]
}
```

#### `GET /api/subscriptions/usage`
Returns detailed usage analytics and storage information.

#### `POST /api/subscriptions/preview-checkout`
Preview checkout details including prorations for plan changes.

#### `GET /api/subscriptions/billing-history`
Returns paginated billing history with detailed invoice information.

#### `POST /api/subscriptions/cancel`
Cancels subscription at period end.

#### `POST /api/subscriptions/reactivate`
Reactivates a canceled subscription.

#### `POST /api/subscriptions/upgrade`
Upgrades/changes subscription plan.

#### `POST /api/subscriptions/setup-intent`
Creates setup intent for adding payment methods.

#### `POST /api/subscriptions/update-payment-method`
Updates the default payment method.

#### `DELETE /api/subscriptions/payment-method/:paymentMethodId`
Removes a payment method.

### Webhook Endpoint

#### `POST /api/subscriptions/webhook`
Handles Stripe webhook events with comprehensive event processing.

**Supported Events:**
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `customer.created`
- `customer.updated`
- `customer.deleted`
- `payment_method.attached`
- `payment_method.detached`
- `invoice.created`
- `invoice.finalized`
- `customer.subscription.trial_will_end`

## Environment Variables

Required environment variables for Stripe integration:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...

# Application URLs
CLIENT_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://...
```

## Database Schema

### Subscription Model
```prisma
model Subscription {
  id                String             @id @default(cuid())
  userId            String             @unique
  stripeSubId       String             @unique
  status            SubscriptionStatus
  plan              SubscriptionPlan
  currentPeriodEnd  DateTime
  cancelAtPeriodEnd Boolean            @default(false)
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum SubscriptionStatus {
  ACTIVE
  INACTIVE
  PAST_DUE
  CANCELED
  UNPAID
}

enum SubscriptionPlan {
  FREE
  PRO
  BUSINESS
}
```

## Webhook Event Flow

### Subscription Creation Flow
1. User clicks "Upgrade" → `create-checkout-session`
2. User completes payment → `checkout.session.completed`
3. Stripe creates subscription → `customer.subscription.created`
4. Database updated with subscription details
5. User storage limit updated

### Payment Flow
1. Recurring payment processed → `invoice.payment_succeeded`
2. Subscription status confirmed as active
3. If payment fails → `invoice.payment_failed`
4. Subscription status updated to `PAST_DUE`

### Cancellation Flow
1. User cancels → `cancel` endpoint called
2. Stripe subscription updated → `customer.subscription.updated`
3. `cancelAtPeriodEnd` set to true
4. At period end → `customer.subscription.deleted`
5. User downgraded to free plan

## Security Features

### Webhook Security
- Signature verification using Stripe webhook secret
- Event age validation (rejects events older than 5 minutes)
- Rate limiting (100 requests per minute per IP)
- Comprehensive error logging

### API Security
- JWT authentication for all protected endpoints
- Input validation for all request bodies
- CORS configuration for frontend integration

## Error Handling

### Webhook Errors
- Comprehensive error logging with event details
- Automatic retry mechanism through Stripe
- Graceful degradation for non-critical events

### API Errors
- Standardized error responses
- Detailed error logging for debugging
- User-friendly error messages

## Testing

### Test Endpoint
`GET /api/subscriptions/test-stripe` (Development only)

Tests:
- Stripe connection
- Webhook secret configuration
- Price ID validation
- Environment variable checks

### Stripe Test Cards
Use Stripe test cards for development:
- `4242424242424242` - Successful payment
- `4000000000000002` - Card declined
- `4000000000009995` - Insufficient funds

## Monitoring and Logging

### Webhook Logging
- All webhook events logged with timestamps
- Event processing status tracked
- Error details captured for debugging

### API Logging
- Request/response logging for debugging
- Performance metrics tracking
- Error rate monitoring

## Deployment Checklist

1. **Environment Variables**
   - [ ] Set production Stripe keys
   - [ ] Configure webhook endpoint URL
   - [ ] Set correct CLIENT_URL

2. **Stripe Dashboard**
   - [ ] Create products and prices
   - [ ] Configure webhook endpoint
   - [ ] Test webhook delivery

3. **Database**
   - [ ] Run Prisma migrations
   - [ ] Verify schema is up to date

4. **Testing**
   - [ ] Test checkout flow end-to-end
   - [ ] Verify webhook events are processed
   - [ ] Test subscription management features

## Troubleshooting

### Common Issues

1. **Webhook Signature Verification Failed**
   - Check webhook secret configuration
   - Ensure raw body is passed to webhook handler

2. **Checkout Session Not Working**
   - Verify price IDs are correct
   - Check CLIENT_URL configuration
   - Ensure metadata is properly set

3. **Subscription Not Updating**
   - Check webhook endpoint is accessible
   - Verify webhook events are being received
   - Check database connection

### Debug Commands

```bash
# Test Stripe connection
curl -H "Authorization: Bearer $STRIPE_SECRET_KEY" https://api.stripe.com/v1/account

# Check webhook endpoint
curl -X POST http://localhost:5000/api/subscriptions/test-stripe

# View webhook logs
tail -f /var/log/app.log | grep webhook
```

## Support

For additional support:
1. Check Stripe Dashboard for webhook delivery status
2. Review application logs for error details
3. Use Stripe CLI for local webhook testing
4. Consult Stripe documentation for API changes
