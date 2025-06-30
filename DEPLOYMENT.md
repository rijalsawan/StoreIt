# Deployment Configuration

## Backend (Railway)
- Start command: `cd backend && npm start`
- Environment variables needed:
  - DATABASE_URL
  - JWT_SECRET
  - B2_APPLICATION_KEY_ID
  - B2_APPLICATION_KEY
  - B2_BUCKET_NAME
  - B2_BUCKET_ID
  - STRIPE_SECRET_KEY
  - STRIPE_WEBHOOK_SECRET
  - FRONTEND_URL

## Frontend (Vercel)
- Build command: `cd frontend && npm run build`
- Output directory: `frontend/build`
- Environment variables needed:
  - REACT_APP_API_URL
  - REACT_APP_STRIPE_PUBLISHABLE_KEY

## Database
- PostgreSQL database required (Railway provides this)
