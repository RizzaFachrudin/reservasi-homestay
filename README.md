# Homestay Reservation System

Sistem reservasi homestay dengan fitur lengkap untuk manajemen kamar, booking, pembayaran, dan review.

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router v6
- Axios

### Backend
- Express.js + TypeScript
- Prisma ORM
- MySQL 8.0
- JWT Authentication
- Multer (File Upload)
- Node-cron (Scheduled Tasks)
- PDFKit (Invoice Generation)

### Payment
- Midtrans Payment Gateway (Sandbox)

## Prerequisites

- Node.js 18+ 
- MySQL 8.0 (via Docker)
- Docker & Docker Compose
- npm atau yarn

## Setup Instructions

### 1. Clone Repository
```bash
git clone <repository-url>
cd homestay
```

### 2. Start Database
```bash
docker-compose up -d
```

### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env dengan konfigurasi Anda
# - JWT_SECRET: Generate secret key yang kuat
# - MIDTRANS_SERVER_KEY: Dari dashboard Midtrans
# - MIDTRANS_CLIENT_KEY: Dari dashboard Midtrans

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed

# Start development server
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env dengan konfigurasi Anda
# - VITE_MIDTRANS_CLIENT_KEY: Client key dari Midtrans

# Start development server
npm run dev
```

## Development Commands

### Backend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run prisma:studio # Open Prisma Studio
npm run migrate      # Run database migrations
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Project Structure

```
homestay/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middlewares/    # Express middlewares
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── jobs/           # Cron jobs
│   │   ├── utils/          # Helper functions
│   │   └── index.ts        # Entry point
│   ├── uploads/            # Uploaded files
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── layouts/        # Layout components
│   │   ├── pages/          # Page components
│   │   │   ├── auth/       # Login, Register
│   │   │   ├── guest/      # Guest pages
│   │   │   └── admin/      # Admin dashboard
│   │   ├── routes/         # Route configuration
│   │   ├── services/       # API services
│   │   └── main.tsx        # Entry point
│   └── package.json
│
├── docker-compose.yml      # Docker configuration
├── CLAUDE.md              # Development guide
└── README.md
```

## API Documentation

API berjalan di `http://localhost:5000`

### Health Check
```
GET /health
```

### Authentication
```
POST /api/auth/register      # Register new user
POST /api/auth/login         # Login
POST /api/auth/logout        # Logout
GET  /api/auth/profile       # Get user profile
```

(Documentation akan dilengkapi seiring development)

## Database Schema

Lihat `backend/prisma/schema.prisma` untuk struktur database lengkap.

Key models:
- User (Customer & Admin)
- Room
- Reservation
- Payment
- Review

## Development Workflow

1. Buat branch baru untuk fitur: `git checkout -b feature/nama-fitur`
2. Commit dengan pesan yang jelas
3. Push ke repository
4. Buat Pull Request

## Testing

(Testing setup akan ditambahkan)

## Deployment

(Deployment guide akan ditambahkan)

## License

Private - All Rights Reserved

## Support

Untuk pertanyaan atau bantuan, hubungi tim development.
