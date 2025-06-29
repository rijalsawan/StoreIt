# StoreIt Setup Instructions

## Prerequisites

Before setting up the project, make sure you have the following installed:

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **PostgreSQL** (v12 or higher) - [Download here](https://www.postgresql.org/download/)
3. **Git** - [Download here](https://git-scm.com/)

## 🚀 Quick Start

### 1. Install Dependencies

First, install all dependencies for both frontend and backend:

```bash
# Install root dependencies (for concurrent running)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE storeit_db;
CREATE USER storeit_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE storeit_db TO storeit_user;
```

2. Update the database URL in your environment file (see step 3).

### 3. Environment Configuration

#### Backend Environment
1. Copy the example environment file:
```bash
cd backend
cp .env.example .env
```

2. Update the `.env` file with your configurations:
```env
# Database
DATABASE_URL="postgresql://storeit_user:your_password@localhost:5432/storeit_db"

# JWT Secret (generate a strong random string)
JWT_SECRET="your-super-secret-jwt-key-here-make-it-very-long-and-random"

# Server Configuration
PORT=5000
NODE_ENV=development

# Stripe Configuration (get from https://stripe.com/)
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

# App Configuration
CLIENT_URL="http://localhost:3000"
MAX_FILE_SIZE=52428800  # 50MB in bytes

# Storage Configuration
FREE_STORAGE_LIMIT=524288000  # 500MB in bytes
```

#### Frontend Environment
1. Copy the example environment file:
```bash
cd frontend
cp .env.example .env
```

2. Update the `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 4. Database Migration

Run the database migrations to set up your tables:

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Stripe Setup (Optional but recommended)

1. Create a [Stripe account](https://stripe.com/)
2. Get your API keys from the Stripe dashboard
3. Create products and prices in Stripe:
   - Pro Plan: $5/month
   - Premium Plan: $15/month
4. Update the price IDs in `backend/utils/stripe.js`
5. Set up webhooks in Stripe dashboard pointing to `http://localhost:5000/api/subscriptions/webhook`

### 6. Start the Application

You can start both frontend and backend simultaneously:

```bash
# From the root directory
npm run dev
```

Or start them separately:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database Studio: `npx prisma studio` (from backend directory)

## 📁 Project Structure

```
StoreIt/
├── backend/                 # Express.js backend
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Utility functions
│   ├── prisma/             # Database schema
│   └── server.js           # Server entry point
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # React context providers
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── uploads/                # File storage directory
└── README.md
```

## 🔧 Development Tips

### Backend Commands
```bash
cd backend

# Start development server
npm run dev

# Run database migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Open database studio
npm run db:studio
```

### Frontend Commands
```bash
cd frontend

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Database Commands
```bash
# Reset database (careful - this deletes all data!)
npx prisma migrate reset

# View current database
npx prisma studio

# Generate new migration
npx prisma migrate dev --name your_migration_name
```

## 🌐 Production Deployment

### Backend Deployment
1. Set `NODE_ENV=production` in your environment
2. Use a production PostgreSQL database
3. Set up proper SSL certificates
4. Configure Stripe webhooks for your production domain
5. Set up file storage (consider using AWS S3 or similar)

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy the `build` folder to your hosting service
3. Update `REACT_APP_API_URL` to point to your production backend

## 🔒 Security Notes

1. **Never commit your `.env` files** - they contain sensitive information
2. **Use strong, unique JWT secrets** in production
3. **Set up proper CORS** for production
4. **Use HTTPS** in production
5. **Regularly update dependencies** to patch security vulnerabilities

## 🐛 Troubleshooting

### Common Issues

1. **Database connection errors**: Check your PostgreSQL is running and credentials are correct
2. **Port already in use**: Change the PORT in your `.env` file
3. **Stripe webhook errors**: Make sure your webhook URL is correct and accessible
4. **File upload errors**: Check file size limits and upload directory permissions

### Getting Help

If you encounter issues:
1. Check the console/terminal logs for error messages
2. Verify your environment variables are set correctly
3. Make sure all dependencies are installed
4. Check that PostgreSQL is running

## 📝 License

This is a student project created for educational purposes.
