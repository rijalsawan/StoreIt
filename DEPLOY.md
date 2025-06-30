# StoreIt Deployment Guide

## Easy Deployment Options

### Option 1: Railway (Backend) + Vercel (Frontend) - RECOMMENDED

#### Step 1: Deploy Backend to Railway
1. Go to [railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and select this repository
4. Railway will automatically detect the Node.js backend
5. Add these environment variables in Railway dashboard:
   ```
   DATABASE_URL=<railway_will_provide_this>
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-very-long-and-random
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   B2_APPLICATION_KEY_ID=your_b2_application_key_id_here
   B2_APPLICATION_KEY=your_b2_application_key_here
   B2_BUCKET_NAME=your_b2_bucket_name_here
   B2_BUCKET_ID=your_b2_bucket_id_here
   STORAGE_TYPE=b2
   NODE_ENV=production
   FRONTEND_URL=<your_vercel_url_here>
   ```
6. Railway will automatically add PostgreSQL database

#### Step 2: Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project" → Import from GitHub
3. Select this repository
4. Set build settings:
   - Framework: Create React App
   - Root directory: frontend
   - Build command: npm run build
   - Output directory: build
5. Add environment variables:
   ```
   REACT_APP_API_URL=<your_railway_backend_url>
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   ```

### Option 2: Heroku (Simplest for beginners)
1. Install Heroku CLI
2. `heroku create your-app-name`
3. `heroku addons:create heroku-postgresql:mini`
4. Set environment variables: `heroku config:set KEY=value`
5. `git push heroku main`

### Option 3: DigitalOcean App Platform
1. Go to DigitalOcean and create new App
2. Connect GitHub repository
3. Configure build settings and environment variables
4. Deploy automatically

## Environment Variables Needed

### Backend:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `B2_APPLICATION_KEY_ID` - Backblaze B2 key ID
- `B2_APPLICATION_KEY` - Backblaze B2 application key
- `B2_BUCKET_NAME` - B2 bucket name
- `B2_BUCKET_ID` - B2 bucket ID
- `STORAGE_TYPE=b2`
- `NODE_ENV=production`
- `FRONTEND_URL` - Your frontend URL

### Frontend:
- `REACT_APP_API_URL` - Your backend URL
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

## Pre-deployment Checklist
- ✅ All sensitive files removed from git
- ✅ Environment variables configured
- ✅ Database migrations ready
- ✅ B2 bucket configured
- ✅ Stripe webhooks configured
- ✅ CORS settings updated for production URLs
