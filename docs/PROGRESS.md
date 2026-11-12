# Dokumentasi Progres Pengerjaan Sistem Reservasi Homestay

**Project:** Sistem Informasi Reservasi Homestay  
**Repository:** https://github.com/RizzaFachrudin/reservasi-homestay  
**Periode Pengerjaan:** Oktober 2026 - November 2026  
**Status Terkini:** Milestone 2 (M2) - Admin Master Data Management - **COMPLETED**

---

## 📋 Daftar Isi
1. [Setup Awal & Infrastructure](#setup-awal--infrastructure)
2. [Backend Development](#backend-development)
3. [Frontend Development](#frontend-development)
4. [Docker & Deployment](#docker--deployment)
5. [Testing](#testing)
6. [Issues & Fixes](#issues--fixes)
7. [Status Fitur Berdasarkan PRD](#status-fitur-berdasarkan-prd)

---

## Setup Awal & Infrastructure

### ✅ Yang Sudah Dikerjakan

1. **Project Initialization**
   - Struktur folder backend dan frontend
   - `package.json` untuk backend (Express + TypeScript + Prisma)
   - `package.json` untuk frontend (React + Vite + TypeScript)
   - Git repository initialization

2. **Database Schema (Prisma)**
   - File: `backend/prisma/schema.prisma`
   - Models yang sudah dibuat:
     - `User` (id, name, email, password, phoneNumber, role, timestamps)
     - `Room` (id, name, description, pricePerNight, capacity, status, timestamps, deletedAt)
     - `Facility` (id, name, icon, timestamps)
     - `FacilityRoom` (pivot table: roomId, facilityId)
     - `RoomImage` (id, roomId, imagePath, isPrimary, timestamps)
     - `Reservation` (id, bookingCode, userId, roomId, checkInDate, checkOutDate, guestCount, totalPrice, status, timestamps)
     - `Payment` (id, reservationId, transactionId, paymentType, amount, status, timestamps)
   - Enums: `Role`, `RoomStatus`, `ReservationStatus`, `PaymentStatus`
   - Indexes untuk performa: `idx_room_dates`, `idx_user`, `idx_status`

3. **Environment Configuration**
   - Backend `.env.example` dengan variabel:
     - Database (MySQL)
     - JWT (secret, expiry)
     - Midtrans (sandbox keys)
     - Upload config
   - Frontend `.env.example` dengan Midtrans client key
   - Gitignore untuk `.env`, `node_modules`, `dist`, `uploads/`

4. **Docker Setup**
   - `docker-compose.yml` dengan 4 services:
     - `db` (MySQL 8.0) - port 3306
     - `backend` (Node.js) - port 5000
     - `frontend` (Vite dev server) - port 5173
     - `prisma-studio` (Database GUI) - port 5555
   - Network: `homestay_network`
   - Volume: `mysql_data` untuk persistensi database

---

## Backend Development

### ✅ Yang Sudah Dikerjakan

1. **Authentication System**
   
   **Routes** (`backend/src/routes/auth.routes.ts`):
   - `POST /api/auth/register` - User registration
   - `POST /api/auth/login` - User login
   - `GET /api/auth/me` - Get user profile (protected)
   - `POST /api/auth/logout` - Logout (protected)

   **Controller** (`backend/src/controllers/auth.controller.ts`):
   - Input validation dengan Zod schemas
   - Error handling untuk email sudah terdaftar (409)
   - Password salah (401)
   - User tidak ditemukan (404)

   **Service** (`backend/src/services/auth.service.ts`):
   - Password hashing dengan bcrypt (salt rounds: 10)
   - JWT token generation dengan payload (userId, email, role)
   - Email uniqueness check
   - User profile retrieval

   **Middleware** (`backend/src/middlewares/auth.middleware.ts`):
   - JWT token verification
   - Token extraction dari header `Authorization: Bearer <token>`
   - Attach user info ke `req.user`

2. **Utilities**
   
   **Response Formatter** (`backend/src/utils/response.util.ts`):
   - `formatSuccessResponse()` - format respons sukses
   - `formatErrorResponse()` - format respons error

   **Validation** (`backend/src/utils/validation.util.ts`):
   - `validateRequest()` - wrapper untuk Zod validation
   - Return structured validation errors

   **Booking Code Generator** (`backend/src/utils/booking-code.util.ts`):
   - Format: `HS-YYYYMMDD-XXXXX`
   - Random alphanumeric 5 karakter

3. **Database Configuration**
   
   **Config** (`backend/src/config/database.ts`):
   - Prisma Client initialization
   - Connection handling

   **Seed Script** (`backend/src/database/seed.ts`):
   - Admin default: `admin@homestay.com` / `admin123`
   - Guest sample: `guest@example.com` / `guest123`
   - 5 Facilities: WiFi, AC, TV, Kamar Mandi Dalam, Breakfast
   - 3 Sample Rooms dengan fasilitas dan gambar

4. **Server Setup** (`backend/src/server.ts`):
   - Express app initialization
   - CORS configuration (allow frontend origin)
   - JSON body parser
   - Auth routes mounted di `/api/auth`
   - Health check endpoint: `GET /health`
   - Global error handler
   - 404 handler

5. **Multer Configuration** (`backend/src/config/multer.config.ts`):
   - File upload handler untuk room images
   - Max file size: 5MB
   - Allowed types: JPG, PNG, WEBP
   - Randomize filename untuk security

6. **Error Middleware** (`backend/src/middlewares/error.middleware.ts`):
   - Global error handler
   - Format consistent error response

### ❌ Backend Yang Belum Dikerjakan

1. **Room Management**
   - Routes untuk CRUD rooms (belum ada)
   - Room availability check logic (belum ada)
   - Room image upload endpoints (belum ada)

2. **Facility Management**
   - Routes untuk CRUD facilities (belum ada)

3. **Reservation/Booking**
   - Routes untuk create, read reservations (belum ada)
   - Availability logic dengan overlap detection (belum ada)
   - Booking transaction dengan locking (belum ada)

4. **Payment Integration**
   - Midtrans snap token creation (belum ada)
   - Webhook handler untuk payment notification (belum ada)
   - Payment status update logic (belum ada)

5. **Check-in**
   - Check-in validation endpoint (belum ada)
   - Booking code validation (belum ada)

6. **Reports & Dashboard**
   - Statistics endpoints untuk admin (belum ada)
   - Revenue reports (belum ada)
   - Occupancy reports (belum ada)

7. **Jobs/Scheduled Tasks**
   - Cron job untuk auto-expire pending reservations (belum ada)

8. **Invoice Generation**
   - PDF invoice generation dengan PDFKit (belum ada)

---

## Frontend Development

### ✅ Yang Sudah Dikerjakan

1. **Project Setup**
   - Vite configuration dengan Tailwind CSS
   - TypeScript configuration (`tsconfig.json`, `vite-env.d.ts`)
   - Tailwind config dengan custom colors (sage, wood, cream, ink)
   - Vite proxy untuk `/api/*` → `http://backend:5000`

2. **Authentication Context**
   
   **AuthContext** (`frontend/src/context/AuthContext.tsx`):
   - State management: user, token, isLoading, isAuthenticated
   - Methods: `login()`, `register()`, `logout()`, `getProfile()`
   - Token persistence di localStorage
   - Auto token verification on mount
   - Type-safe API response handling

3. **API Service**
   
   **API Client** (`frontend/src/services/api.service.ts`):
   - Axios instance dengan base URL `/api`
   - Request interceptor: auto attach JWT token dari localStorage
   - Response interceptor: auto redirect ke `/login` jika 401
   - Generic methods: `get<T>()`, `post<T>()`, `put<T>()`, `patch<T>()`, `delete<T>()`

4. **Routing**
   
   **AppRoutes** (`frontend/src/routes/AppRoutes.tsx`):
   - Public routes: `/`, `/rooms`, `/login`, `/register`
   - Protected guest routes: `/reservations` (belum ada halaman lengkap)
   - Protected admin routes: `/admin/*` (belum ada halaman lengkap)
   - Placeholder components untuk route yang belum lengkap

   **ProtectedRoute** (`frontend/src/routes/ProtectedRoute.tsx`):
   - Role-based access control (Guest/Admin)
   - Redirect ke `/login` jika belum authenticated
   - Redirect ke `/` jika role tidak sesuai
   - Loading spinner saat verify token

5. **Layouts**
   
   **GuestLayout** (`frontend/src/layouts/GuestLayout.tsx`):
   - Wrapper dengan Navbar dan Footer
   - Responsive container
   - Earth-tone background (cream)

6. **Components**
   
   **Navbar** (`frontend/src/components/Navbar.tsx`):
   - Logo "Homestay Kita"
   - Navigation links: Kamar, Riwayat (jika login), Dashboard Admin (jika admin)
   - Auth state: Login/Daftar (guest) vs Halo {name}/Keluar (authenticated)
   - Responsive design
   - Dynamic visibility berdasarkan role

7. **Pages - Authentication**
   
   **Login** (`frontend/src/pages/auth/Login.tsx`):
   - Form: email, password
   - Client-side validation
   - Error display
   - Redirect setelah login berhasil (default: `/`, atau redirect URL dari query param)
   - Link ke register
   - Loading state saat submit

   **Register** (`frontend/src/pages/auth/Register.tsx`):
   - Form: name, email, password, phone
   - Client-side validation:
     - Password min 8 characters
     - Phone hanya angka dan `+`
   - Error display untuk email sudah terdaftar
   - Auto redirect ke home setelah register berhasil
   - Link ke login
   - Loading state saat submit

8. **Pages - Public**
   
   **Home** (`frontend/src/pages/public/Home.tsx`):
   - Hero section dengan judul dan deskripsi
   - Search form:
     - Check-in date picker
     - Check-out date picker
     - Guest count input (1-10)
     - Validation: check-out harus setelah check-in
     - Submit → navigate ke `/rooms` dengan query params
   - Feature highlights (3 cards):
     - Kamar Nyaman
     - Booking Mudah
     - Harga Terjangkau
   - Icons menggunakan SVG inline
   - Responsive grid layout

   **Rooms** (`frontend/src/pages/public/Rooms.tsx`):
   - Parse search params dari URL (checkIn, checkOut, guests)
   - Display search criteria jika ada
   - Placeholder "Coming Soon" untuk room listing
   - Note: akan dikembangkan di M2

9. **Styling & Theme**
   - Tailwind custom colors:
     - `cream`: #F7F1E3 (background)
     - `sage`: #9CAF88 (primary button)
     - `sage-dark`: #6F8A5B (hover)
     - `wood`: #8B5E3C (titles)
     - `ink`: #3B2F2F (text)
   - Consistent spacing dan typography
   - Button styles dengan hover effects
   - Form input styles dengan focus rings
   - Card components dengan shadow

### ❌ Frontend Yang Belum Dikerjakan

1. **Admin Pages**
   - Dashboard dengan statistics (belum ada)
   - Room management CRUD pages (belum ada)
   - Facility management CRUD pages (belum ada)
   - Check-in page dengan booking code scanner (belum ada)
   - Reports pages (belum ada)
   - AdminLayout dengan sidebar (belum ada)

2. **Guest Pages**
   - Room listing dengan filter dan availability check (placeholder saja)
   - Room detail page dengan image gallery (belum ada)
   - Booking flow pages (belum ada)
   - Payment page dengan Midtrans integration (belum ada)
   - Reservation history dengan detail (placeholder saja)
   - Invoice download (belum ada)

3. **Components**
   - RoomCard component (belum ada)
   - AvailabilityCalendar component (belum ada)
   - DataTable component untuk admin (belum ada)
   - Image upload component (belum ada)
   - Loading spinners/skeletons (minimal, ada di ProtectedRoute saja)
   - Toast notifications (belum ada)
   - Modal dialogs (belum ada)

4. **Services**
   - Room service dengan API calls (belum ada)
   - Facility service (belum ada)
   - Reservation service (belum ada)
   - Payment service (belum ada)
   - Report service (belum ada)

5. **Hooks**
   - Custom hooks selain `useAuth()` (belum ada)
   - `useFetch()` untuk data fetching (belum ada)
   - `useDebounce()` untuk search (belum ada)

---

## Docker & Deployment

### ✅ Yang Sudah Dikerjakan

1. **Backend Dockerfile**
   - Base image: `node:20-slim` (diubah dari alpine untuk kompatibilitas Prisma)
   - Install dependencies: `python3`, `make`, `g++`, `openssl`, `libssl-dev`
   - Copy package files dan install npm dependencies
   - Generate Prisma Client
   - Expose port 5000
   - Command: `npm run dev`

2. **Frontend Dockerfile**
   - Base image: `node:20-alpine`
   - Copy package files dan install npm dependencies
   - Copy source code
   - Expose port 5173
   - Command: `npm run dev`

3. **Docker Compose**
   - Service `db`: MySQL 8.0 dengan healthcheck
   - Service `backend`: depends on db, port 5000, volume mount `./backend/src` dan `./backend/uploads`
   - Service `frontend`: port 5173, volume mount `./frontend/src`
   - Service `prisma-studio`: port 5555
   - Network bridge untuk internal communication
   - Volume persistence untuk MySQL data

4. **.dockerignore**
   - Backend: exclude `node_modules`, `dist`, `.env`, `uploads/`
   - Frontend: belum ada file `.dockerignore` (perlu ditambahkan)

### ❌ Yang Belum Dikerjakan

1. **Production Build**
   - Multi-stage Dockerfile untuk optimasi (belum ada)
   - Production docker-compose (belum ada)
   - Nginx configuration untuk frontend static serve (belum ada)

2. **CI/CD**
   - GitHub Actions workflow (belum ada)
   - Automated testing pipeline (belum ada)
   - Deployment automation (belum ada)

3. **Monitoring & Logging**
   - Logging strategy (belum ada)
   - Error tracking (Sentry, dll) (belum ada)
   - Performance monitoring (belum ada)

---

## Testing

### ✅ Yang Sudah Dikerjakan

1. **Manual Testing**
   - REST Client file: `tests/api.http`
   - Endpoints yang bisa ditest:
     - Health check
     - Register user
     - Login user
     - Get profile (dengan token dari login)
     - Login admin
   - Support dynamic token capture

2. **Tested Scenarios**
   - User registration berhasil (201)
   - User login berhasil (200)
   - Admin login berhasil (200)
   - Get profile dengan valid token (200)
   - Login dengan password salah (401)
   - Get profile tanpa token (401)
   - Register dengan email duplikat (409)

### ❌ Yang Belum Dikerjakan

1. **Unit Tests**
   - Backend service tests dengan Jest (belum ada)
   - Frontend component tests dengan React Testing Library (belum ada)
   - Utility function tests (belum ada)

2. **Integration Tests**
   - API endpoint tests (belum ada)
   - Database transaction tests (belum ada)

3. **E2E Tests**
   - Full booking flow test (belum ada)
   - Payment webhook test (belum ada)
   - Admin workflow tests (belum ada)

---

## Issues & Fixes

### 🐛 Issue yang Ditemukan dan Diperbaiki

1. **TypeScript Compilation Errors**
   - **Masalah:** `import.meta.env` tidak dikenali TypeScript
   - **Penyebab:** Tidak ada type definition untuk Vite environment
   - **Solusi:** 
     - Buat file `frontend/vite-env.d.ts`
     - Tambahkan ke `tsconfig.json` include
   - **Commit:** `fix(frontend): fix TypeScript configuration and API routing`

2. **AuthContext Type Errors**
   - **Masalah:** `response` is of type 'unknown' di AuthContext
   - **Penyebab:** Axios response tidak di-type
   - **Solusi:** Tambahkan generic type `<T>` pada API service methods
   - **Commit:** Sama dengan #1

3. **Prisma Engine Compatibility**
   - **Masalah:** `libssl.so.1.1: No such file or directory` di Prisma Studio
   - **Penyebab:** Node 20 slim tidak punya libssl 1.1, Prisma binary tidak cocok
   - **Solusi:**
     - Tambah `openssl` dan `libssl-dev` di Dockerfile
     - Tambah `binaryTargets` di schema.prisma untuk multi-platform
   - **Commit:** `fix(docker): improve Prisma compatibility with Docker environment`

4. **Login 404 Error (CRITICAL)**
   - **Masalah:** Login selalu return 404 "Route not found"
   - **Debugging:**
     - Cek backend logs: tidak ada error
     - Cek browser console: request ke `:5000/auth/login` (URL rusak)
     - Cek `api.service.ts`: masih pakai `import.meta.env.VITE_API_URL || '/api'`
     - Cek `.env`: ada `VITE_API_URL=http://localhost:5000`
   - **Akar masalah:** 
     - Frontend `.env` punya `VITE_API_URL=http://localhost:5000` (tanpa `/api`)
     - Request jadi `http://localhost:5000/auth/login` (bukan `/api/auth/login`)
     - Backend hanya register route di `/api/auth/*`
   - **Solusi:**
     - Hardcode `API_BASE_URL = '/api'` di `api.service.ts`
     - Hapus `VITE_API_URL` dari `docker-compose.yml` frontend env
     - Biarkan Vite proxy handle routing (`/api` → `http://backend:5000/api`)
   - **Commits:**
     - `fix(frontend): fix TypeScript configuration and API routing`
     - `fix(docker-compose): remove hardcoded VITE_API_URL from frontend environment`

5. **Vite Proxy Configuration**
   - **Masalah:** Browser tidak bisa akses `http://backend:5000` karena itu internal Docker network
   - **Solusi:** 
     - Gunakan Vite proxy: browser request ke `/api/*` di port 5173
     - Vite forward ke `http://backend:5000` (internal Docker network)
   - **Arsitektur:** Browser → localhost:5173/api/* → Vite proxy → backend:5000/api/*

### 🔍 Pelajaran yang Didapat

1. **Environment Variables di Vite**
   - Vite env vars hanya di-embed saat build time
   - Untuk dev mode, env vars terbaca dari `.env` file atau environment
   - Jangan mix antara `.env` file dan `docker-compose.yml` env vars
   - Lebih baik hardcode base URL `/api` dan gunakan Vite proxy

2. **Docker Networking**
   - Service names dalam Docker Compose jadi hostname internal
   - `http://backend:5000` hanya bisa diakses dari dalam container
   - Browser di host machine tidak bisa akses service name
   - Gunakan `localhost:<port>` untuk akses dari host, atau proxy

3. **Prisma Binary Targets**
   - Alpine vs Debian/Ubuntu punya different library (musl vs glibc)
   - Prisma perlu binary target yang sesuai dengan OS container
   - Lebih aman pakai `node:20-slim` (Debian) daripada `alpine`

4. **Git Attribution**
   - System reminder menambahkan `Co-Authored-By: Claude Code` di commit messages
   - Ini membuat Claude muncul sebagai contributor di GitHub
   - CLAUDE.md sudah melarang ini, tapi system reminder override
   - Solusi: filter-branch untuk remove atau tidak commit dengan attribution

---

## Status Fitur Berdasarkan PRD

### Milestone 1 (M1): Authentication & Public Pages ✅

| No | System Feature | Status | Keterangan |
|----|----------------|--------|------------|
| SF-01 | User Registration | ✅ DONE | Backend + Frontend |
| SF-02 | User Login | ✅ DONE | Backend + Frontend |
| SF-03 | Public Landing Page | ✅ DONE | Home page dengan search form, kamar unggulan, fasilitas, error/retry |
| SF-04 | View Available Rooms | ✅ DONE | Katalog & Pencarian Ketersediaan (`/rooms` & `/search`) |

### Milestone 2 (M2): Admin Master Data Management ✅

| No | System Feature | Status | Keterangan |
|----|----------------|--------|------------|
| SF-05 | Manage Facilities (Admin) | ✅ DONE | Backend CRUD + Frontend Admin |
| SF-06 | Manage Rooms (Admin) | ✅ DONE | Backend CRUD (Soft Delete BR-12) + Frontend Admin |
| SF-07 | Room Image Upload (Admin) | ✅ DONE | Backend Multer + Frontend Gallery & Primary Photo |

### Milestone 3 (M3): Pencarian Ketersediaan, Katalog, Detail Kamar & Kalender Publik ✅

| No | System Feature | Status | Keterangan |
|----|----------------|--------|------------|
| SF-08 | Room Detail & Availability Calendar | ✅ DONE | `/rooms/:id` dengan galeri foto, kalender bulanan interaktif, estimasi harga & Login Gate (BR-19) |
| SF-09 | Availability Check & Overlap Detection | ✅ DONE | `GET /api/rooms/available` & `GET /api/rooms/:id/availability` (BR-03, BR-04, BR-05, BR-18) |
| SF-10 | Booking Preview & Protected Gate | ✅ DONE | Halaman `/booking/:roomId` terproteksi untuk uji alur `?redirect=` (siap dilanjutkan transaksi DB di M4) |

### Milestone 4 (M4): Pemesanan / Booking Engine & Concurrency Control ✅

| No | System Feature | Status | Keterangan |
|----|----------------|--------|------------|
| SF-06 | Pemesanan Kamar (Booking Engine & Row Lock) | ✅ DONE | `POST /api/reservations` dengan `SELECT ... FOR UPDATE` (BR-07), `booking_code` `HSR-YYYYMMDD-XXXX` (BR-06), transaksi DB otomatis dengan `payments` (`Pending`), halaman `/booking/:roomId` & `/payment/:reservationId` dengan countdown 60 menit (BR-08) |
| SF-11 | View My Reservations & Detail Endpoint | ✅ DONE | Backend `GET /api/reservations/me` & `GET /api/reservations/:id` dengan otorisasi pemilik (BR-15) |

### Milestone 5 (M5): Payment Integration ❌

| No | System Feature | Status | Keterangan |
|----|----------------|--------|------------|
| SF-13 | Payment with Midtrans | ❌ NOT STARTED | Backend + Frontend belum |
| SF-14 | Payment Webhook Handler | ❌ NOT STARTED | Backend belum |
| SF-15 | Auto-expire Pending Reservations | ❌ NOT STARTED | Cron job belum |

### Milestone 6 (M6): Check-in & Reporting ❌

| No | System Feature | Status | Keterangan |
|----|----------------|--------|------------|
| SF-16 | Check-in System (Admin) | ❌ NOT STARTED | Backend + Frontend belum |
| SF-17 | Admin Dashboard & Reports | ❌ NOT STARTED | Backend + Frontend belum |

---

## Statistik Progres

### Backend
- **Routes:** 4 endpoints (auth only)
- **Controllers:** 1 (AuthController)
- **Services:** 1 (AuthService)
- **Middlewares:** 2 (auth, error)
- **Utils:** 3 (response, validation, booking-code)
- **Models:** 8 (via Prisma schema)
- **Tests:** 0
- **Progress:** ~15% (auth saja dari 17 fitur)

### Frontend
- **Pages:** 4 (Home, Rooms, Login, Register)
- **Components:** 1 (Navbar)
- **Layouts:** 1 (GuestLayout)
- **Context:** 1 (AuthContext)
- **Routes:** 1 router setup
- **Services:** 1 (API client)
- **Tests:** 0
- **Progress:** ~15% (auth + public pages saja)

### Overall Project Progress
- **M1:** ✅ 100% (4/4 features done)
- **M2:** ✅ 100% (3/3 features done)
- **M3:** ✅ 100% (3/3 features done)
- **M4:** ✅ 100% (2/2 features done)
- **M5:** ❌ 0% (0/3 features)
- **M6:** ❌ 0% (0/2 features)
- **Total:** 70.6% (12/17 features completed)

---

## Git Commit History

### Commits yang Sudah Di-push ke GitHub

1. `2c98f77` - Initial commit: Homestay Reservation System - Foundation Setup
2. `dffa9b3` - feat(backend): add response formatting and validation utilities
3. `a631f16` - feat(backend): implement JWT authentication middleware
4. `4262fe8` - feat(backend): implement authentication service and endpoints
5. `f9fe99e` - feat(backend): set up database and main server
6. `2cb5802` - docs: add comprehensive API documentation for authentication endpoints
7. `cc9f6de` - docs: update PRD with latest version and changes for public landing page access
8. `41a53dc` - fix(docker): improve Prisma compatibility with Docker environment
9. `0fc1f3f` - fix(frontend): fix TypeScript configuration and API routing
10. `aa694af` - fix(docker-compose): remove hardcoded VITE_API_URL from frontend environment
11. `7e5d413` - test: add REST Client test file for API endpoints
12. `55d6458` - feat(backend): add database seed script and dockerignore
13. `99b07c0` - feat(frontend): implement authentication context and protected routing
14. `a9ad437` - feat(frontend): implement public pages, auth forms, and navigation

**Total Commits:** 14

---

## Services yang Berjalan

### Development Environment (Docker Compose)

| Service | Port | Status | URL |
|---------|------|--------|-----|
| MySQL Database | 3306 | ✅ Running | N/A (internal) |
| Backend API | 5000 | ✅ Running | http://localhost:5000 |
| Frontend (Vite) | 5173 | ✅ Running | http://localhost:5173 |
| Prisma Studio | 5555 | ✅ Running | http://localhost:5555 |

### Test Accounts

| Role | Email | Password | Status |
|------|-------|----------|--------|
| Admin | admin@homestay.com | admin123 | ✅ Working |
| Guest | guest@example.com | guest123 | ✅ Working |
| Guest | testuser@example.com | password123 | ✅ Working |

---

## Next Steps (Rekomendasi)

### Milestone 2 (M2) - Admin Master Data Management

Prioritas selanjutnya untuk dikerjakan:

1. **Backend Routes & Controllers**
   - Room CRUD endpoints
   - Facility CRUD endpoints
   - Room image upload endpoint

2. **Backend Services**
   - Room service dengan soft delete
   - Facility service
   - Image storage service

3. **Frontend Admin Pages**
   - AdminLayout dengan sidebar
   - Room management page (list, create, edit, delete)
   - Facility management page (list, create, edit, delete)
   - Room image upload interface

4. **Frontend Components**
   - DataTable component untuk list data
   - Form components (input, select, textarea, file upload)
   - Modal dialog untuk create/edit
   - Confirmation dialog untuk delete
   - Image preview component

---

## Catatan Penting

1. **File `.env` tidak di-commit** - Hanya `.env.example` yang ada di repository
2. **Database seeded** - Admin dan sample data sudah ada saat pertama kali run
3. **Vite Proxy** - Frontend menggunakan proxy `/api` ke backend, bukan direct URL
4. **Docker Required** - Project dijalankan via Docker Compose untuk konsistensi
5. **TypeScript Strict Mode** - Semua file menggunakan TypeScript dengan strict checking
6. **Tailwind CSS** - Styling menggunakan utility-first Tailwind, bukan CSS custom

---

**Tanggal Dokumentasi:** 11 November 2026  
**Versi:** 1.0  
**Status Project:** M1 Completed, Ready for M2
