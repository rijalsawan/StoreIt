# Railway Deployment Configuration

## ✅ SIGTERM Issue Fixed (Latest Update)

**Problem**: Railway was showing SIGTERM errors during deployment:
```
npm ERR! Lifecycle script `start` failed with error
```

**Solution Applied**: Improved graceful shutdown handling in `backend/server.js`:
- Added timeout-based graceful shutdown (10 seconds)
- Handle both SIGTERM and SIGINT signals properly
- Added uncaught exception and unhandled rejection handlers
- Server now listens on `0.0.0.0` (all interfaces) for Railway

**Status**: ✅ Fixed - Railway should now deploy without SIGTERM errors.

---

## Option 1: Deploy Backend Only (Recommended)

Since you're getting Docker build errors, deploy just the backend to Railway and frontend to Vercel separately.

### Step 1: Configure Railway for Backend Only

1. Go to railway.app
2. Create new project
3. Connect GitHub repo
4. **Important**: Set root directory to `backend/` in Railway settings
5. Railway will automatically:
   - Detect Node.js backend
   - Install dependencies
   - Add PostgreSQL database
   - Deploy backend API

### Step 2: Environment Variables for Railway

Add these to Railway dashboard:

```bash
# Database (Railway provides automatically)
DATABASE_URL=<railway_will_provide_this>

# From your .env file:
JWT_SECRET=storeit-super-secret-jwt-key-2025-change-this-in-production-very-long-random-string-12345
NODE_ENV=production
PORT=5000

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRO_PRICE_ID=price_your_pro_price_id_here
STRIPE_BUSINESS_PRICE_ID=price_your_business_price_id_here

# Storage
FREE_STORAGE_LIMIT=524288000
STORAGE_PROVIDER=B2
B2_ACCESS_KEY_ID=your_b2_access_key_id_here
B2_SECRET_ACCESS_KEY=your_b2_secret_access_key_here
B2_BUCKET_NAME=your_bucket_name_here
B2_REGION=your_region_here
B2_ENDPOINT=https://s3.your-region.backblazeb2.com

# Frontend URL (add after deploying frontend)
CLIENT_URL=https://your-frontend-url.vercel.app
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### Step 3: Deploy Frontend to Vercel

1. Go to vercel.com
2. Import GitHub repo
3. **Important**: Set root directory to `frontend/`
4. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-railway-backend-url
   ```

## Option 2: Fix Full-Stack Docker Build

If you want to deploy both together, the issue is in the build process. The Docker container is trying to build frontend but dependencies aren't properly installed.

### Create nixpacks.toml for Railway

```toml
[variables]
  NODE_ENV = "production"

[phases.build]
  cmd = "cd backend && npm install && npx prisma generate"

[phases.start]
  cmd = "cd backend && npm start"
```

## Recommended: Deploy Backend Only to Railway

This is the easiest approach:
1. Deploy backend to Railway (set root directory to `backend/`)
2. Deploy frontend to Vercel (set root directory to `frontend/`)
3. Connect them via environment variables

Your backend is already properly configured for this approach!
