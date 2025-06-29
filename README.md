# StoreIt - Cloud Storage SAAS

A full-stack cloud storage application similar to OneDrive, built as a student project.

## Features

- 🔐 User Authentication & Authorization
- 📁 File Upload, Download & Management
- 💾 Storage Quota Management
- 💳 Stripe Subscription System
- 🆓 Free Tier (500MB) + Premium Plans
- 📱 Responsive Design
- 🔗 File Sharing
- 🗂️ Folder Organization

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Axios
- **Backend**: Node.js, Express.js, JWT Authentication
- **Database**: PostgreSQL with Prisma ORM
- **Payment**: Stripe
- **File Storage**: Local filesystem (for development)

## Project Structure

```
StoreIt/
├── frontend/          # React frontend
├── backend/           # Express backend
├── uploads/           # File storage directory
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- Stripe Account (for payments)

### Backend Setup
1. Navigate to backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Set up environment variables (copy .env.example to .env)
4. Run database migrations: `npx prisma migrate dev`
5. Start the server: `npm run dev`

### Frontend Setup
1. Navigate to frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

## Environment Variables

See `.env.example` files in both frontend and backend directories.

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Files
- `GET /api/files` - List user files
- `POST /api/files/upload` - Upload file
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

### Subscriptions
- `POST /api/subscriptions/create-checkout-session` - Create Stripe checkout
- `GET /api/subscriptions/status` - Get subscription status

## Subscription Plans

- **Free**: 500MB storage
- **Pro**: $5/month - 10GB storage
- **Premium**: $15/month - 100GB storage

## License

This is a student project for educational purposes.
