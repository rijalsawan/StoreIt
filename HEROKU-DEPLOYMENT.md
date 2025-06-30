# StoreIt - Heroku Deployment Guide

## Issue: Heroku Account Verification Required

Heroku now requires payment verification even for free apps. Here are your options:

## Option 1: Complete Heroku Verification (Recommended if you want Heroku)

1. Go to https://heroku.com/verify
2. Add a credit card (you won't be charged for hobby dyno usage)
3. Come back and run: `heroku create storeit-cloud-app`

## Option 2: Deploy to Railway (FREE & EASIER - Recommended)

Railway is completely free for small apps and much easier to deploy:

### Step 1: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your StoreIt repository
6. Railway will automatically:
   - Detect it's a Node.js app
   - Add PostgreSQL database
   - Deploy your app

### Step 2: Set Environment Variables in Railway
Add these environment variables in Railway dashboard:

```bash
# Database (Railway provides this automatically)
DATABASE_URL=<provided_by_railway>

# Required Variables
JWT_SECRET=your-super-secret-jwt-key-here-make-it-very-long-and-random
NODE_ENV=production
PORT=5000

# Your Backblaze B2 credentials
B2_APPLICATION_KEY_ID=your_b2_key_id
B2_APPLICATION_KEY=your_b2_application_key
B2_BUCKET_NAME=your_bucket_name
B2_BUCKET_ID=your_bucket_id
STORAGE_TYPE=b2

# Stripe (if you have them)
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend URL (Railway will provide this)
FRONTEND_URL=https://storeit-frontend.up.railway.app
CLIENT_URL=https://storeit-frontend.up.railway.app
```

### Step 3: Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import from GitHub
3. Set Root Directory: `frontend`
4. Environment variables:
   ```
   REACT_APP_API_URL=https://your-railway-backend-url
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
   ```

## Option 3: Use Render (Another free alternative)

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Create new Web Service
4. Connect GitHub repo
5. Set build and start commands

## Current Setup

Your app is already configured for Heroku with:
- ✅ Procfile: `web: npm start`
- ✅ package.json with heroku-postbuild script
- ✅ Environment variables template
- ✅ Database migrations ready

You can deploy to any of these platforms!

## Quick Start with Railway (Recommended)

1. Push current changes: `git push`
2. Go to railway.app
3. Deploy in 2 clicks
4. Add environment variables
5. Your app is live!

Railway is free up to $5/month usage, which is perfect for development and small production apps.
