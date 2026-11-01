# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sistem Informasi Reservasi Homestay** — a single-tenant web application for managing homestay room reservations. Two user roles: **Guest** (customers booking rooms) and **Admin** (property manager). Guided by PRD at `docs/PRD-Sistem-Reservasi-Homestay.md` and implements 17 System Features across booking, payment (Midtrans sandbox), and admin operations.

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0 (via Docker: `docker-compose up db`)
- Port 5000 (backend) and 5173 (frontend) available

### Backend
```bash
cd backend
npm install
npm run prisma:generate              # Generate Prisma client
npm run prisma:migrate               # Run migrations (creates schema)
npm run seed                          # Seed admin user and sample data
npm run dev                           # Start dev server (localhost:5000)
```

**Common commands:**
- `npm run build` — compile TypeScript
- `npm start` — run production build
- `npm test` — run Jest tests
- `npm run prisma:studio` — open Prisma Studio GUI (inspect/edit data)

### Frontend
```bash
cd frontend
npm install
npm run dev                           # Start Vite dev server (localhost:5173)
```

**Common commands:**
- `npm run build` — build for production
- `npm run lint` — check ESLint rules
- `npm run preview` — preview production build locally

### Database
```bash
docker-compose up db                 # Start MySQL (creates `homestay` DB)
docker-compose down                  # Stop and remove
```

Database is auto-created by docker-compose; migrations run via `prisma:migrate`.

## Architecture Overview

### Tech Stack
| Layer | Tech | Notes |
|-------|------|-------|
| **Frontend** | React 18 + Vite + TypeScript | Tailwind CSS for styling, earth-tone palette |
| **Backend** | Express.js + TypeScript | REST API, JWT auth, Prisma ORM |
| **Database** | MySQL 8.0 | Schema in `backend/prisma/schema.prisma` |
| **Payment** | Midtrans Sandbox | Webhook-driven (no manual upload), idempotent |
| **PDF** | PDFKit | Invoice generation server-side |
| **Upload** | Multer | Room images, validated MIME type + size |
| **Jobs** | node-cron | Auto-expire pending reservations |

### Folder Structure

**Backend** (`backend/src/` — to be created)
```
config/             # DB, env, payment gateway adapter
models/             # Prisma models (defined in schema.prisma)
routes/             # Express routes (auth, rooms, reservations, admin/*)
controllers/        # Business logic per route
services/           # Availability logic, booking, payment adapter, invoice, reports
middlewares/        # Auth (JWT), role check, input validation (zod), upload handler
jobs/               # Scheduled tasks (expirePendingReservations)
utils/              # Booking code generator, date helpers, response formatting
```

**Frontend** (`frontend/src/` — to be created)
```
pages/
  auth/             # /login, /register
  guest/            # /, /rooms, /booking, /payment, /reservations
  admin/            # /admin/*, dashboard, CRUD kamar/fasilitas, check-in, reports
components/         # Reusable: RoomCard, AvailabilityCalendar, DataTable, etc.
layouts/            # GuestLayout, AdminLayout (navbar, sidebar, protections)
context/            # AuthContext (user, token, role)
services/           # API client (axios) + per-module services
hooks/              # Custom hooks (useAuth, useFetch, etc.)
routes/             # Route definitions, ProtectedRoute, RoleRoute components
```

### Data Model
Defined in `backend/prisma/schema.prisma`. Key relations:
- `User` 1—N `Reservation`
- `Room` 1—N `Reservation` (bookings block rooms by date range)
- `Room` M—N `Facility` (via `FacilityRoom` pivot)
- `Room` 1—N `RoomImage`
- `Reservation` 1—1 `Payment`

**Status machines:**
- Reservation: `Pending` → `Confirmed` (on Settlement webhook) → `Checked-in` → `Completed`, or → `Cancelled`
- Payment: `Pending` → `Settlement` | `Expire` | `Cancel`

### Authentication & Authorization
- **Auth:** JWT Bearer token (header `Authorization: Bearer <token>`)
- **Storage:** Token in browser (localStorage or sessionStorage), no server-side session
- **Logout:** Client-side token deletion
- **Protection:** Middleware enforces `role` for admin endpoints; data-level: Guest only sees their own reservations

## Key Implementation Patterns

### Availability Logic (BR-03, BR-04)
Guests can book a room on date range `[check_in, check_out)` if:
1. Room status = `Available`
2. Room capacity ≥ guest count
3. No overlapping active reservations (dates: `check_in_date < check_out` AND `check_out_date > check_in`)

Query uses index `idx_room_dates` for performance.

### Booking Transaction (BR-07)
Inside DB transaction:
1. Lock room row with `SELECT ... FOR UPDATE`
2. Verify no overlap again (race condition guard)
3. Calculate `total_price = price_per_night × nights`
4. Insert reservation + payment (Pending)
5. Return 409 Conflict if check fails; never trust client price

### Webhook Idempotency (BR-09)
1. **Verify signature** before processing (Midtrans: SHA512 hash; Xendit: callback token)
2. Map gateway status to `payments.status` and `reservations.status`
3. **Skip if reservation already `Checked-in` or `Completed`** (ignore late/duplicate webhooks)
4. Respond HTTP 200 immediately after processing
5. All updates in single DB transaction

### Expiry Job (BR-08)
- Cron job (every minute or configurable interval)
- Find reservations: status `Pending` AND `created_at < now() - PAYMENT_EXPIRY_MINUTES` (default 60 min)
- Transition to `Cancelled` + payment to `Expire`
- No lock conflicts: only running code can modify these rows

### Check-in Validation (BR-10)
Code must:
1. Exist and be found
2. Status = `Confirmed`
3. Payment status = `Settlement`
4. Today's date = `check_in_date` (no tolerance, per [Keputusan PRD])

### Image Upload (BR-14)
- Accept JPG/PNG/WEBP, max 2 MB per file, max 10 per batch
- Randomize filename to prevent guessing
- First uploaded image becomes primary (`is_primary = 1`)
- Only one primary per room; updating primary clears old one
- Verify MIME type **and** extension server-side

## Configuration

### Environment Variables (`.env` in backend root)
```
PORT=5000
NODE_ENV=development
DATABASE_URL=mysql://root:root@localhost:3306/homestay
JWT_SECRET=<random-string-50-chars>
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173
PAYMENT_PROVIDER=midtrans
MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_KEY
MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_KEY
MIDTRANS_IS_PRODUCTION=false
PAYMENT_EXPIRY_MINUTES=60
UPLOAD_MAX_MB=2
```

Never commit `.env`; use `.env.example` as template.

### Frontend Proxy
`vite.config.ts` proxies `/api/*` to `http://localhost:5000`, eliminating CORS issues in dev.

## Important Rules

### Validation
- **Server-side only** for authorization (tamu cannot access admin endpoints, even if UI hides button)
- **Input validation** with `zod` on all POST/PUT/PATCH endpoints
- **Phone:** digits + optional leading `+`; **Password:** min 8 chars; **Price:** > 0

### Naming & Formatting
- **Booking code** format: `HS-YYYYMMDD-XXXXX` (e.g., `HS-20261028-A7K3`)
- **Currency:** `Rp 1.250.000` (dot as thousands sep, no space after symbol)
- **Dates:** `27 Okt 2026` (locale: `id-ID`)

### API Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation succeeded"
}
```
Errors:
```json
{
  "success": false,
  "message": "Human-readable error",
  "errors": { "fieldName": "Validation error message" }
}
```

HTTP status: 200/201 (OK), 400/422 (validation), 401 (no token), 403 (wrong role), 404 (not found), 409 (conflict—email exists, kamar already booked).

### Theme & Styling
Tailwind tokens (define in `tailwind.config.js`):
- `cream`: `#F7F1E3` (page bg)
- `sage`: `#9CAF88` (primary, buttons)
- `sage-dark`: `#6F8A5B` (hover, success)
- `wood`: `#8B5E3C` (titles, secondary)
- `ink`: `#3B2F2F` (body text)

Mobile-first responsive design; no horizontal scroll on phone.

## Development Workflow

1. **Create issue** (feature/bug) linked to PRD System Feature
2. **Branch:** `feature/SF-xx-slug` or `fix/issue-slug`
3. **Backend:** write routes → controllers → services, test with Postman/curl
4. **Frontend:** pages → components → integrate with API
5. **Verify:** manual test both roles (Guest + Admin), check database state
6. **PR:** link issue, describe test scenarios, clean commit history

## Testing Guidelines

- **Backend:** Jest test files at `src/**/*.test.ts`; test services and critical endpoints (booking, webhook, check-in)
- **Frontend:** React Testing Library; test components in isolation
- **E2E:** manual flow tests (see PRD §14.2 Daftar uji penerimaan)—full booking flow, admin CRUD, webhook handling

## Deployment Notes

- Backend compiled to `dist/`; run `npm start` (Node.js 18+)
- Frontend built to `dist/`; serve as static assets (nginx, Vercel, etc.)
- Production: use real Midtrans keys, strong JWT secret, set `NODE_ENV=production`
- Database migrations: `npm run prisma:migrate` before deploy
- `.env` secrets stored in CI/CD secrets, not in repo

## Useful Resources

- **PRD:** `docs/PRD-Sistem-Reservasi-Homestay.md` — complete spec, all 17 features, acceptance criteria
- **Prisma:** https://www.prisma.io/docs/concepts/components/prisma-client
- **Midtrans Sandbox:** https://dashboard.sandbox.midtrans.com/ (set up keys before M5)
- **Express:** https://expressjs.com/
- **React Router v6:** https://reactrouter.com/en/main
- **Tailwind:** https://tailwindcss.com/

## Common Pitfalls

1. **Race condition on booking:** Always use `SELECT ... FOR UPDATE` inside transaction
2. **Webhook doubly processing:** Check reservation already transitioned before updating
3. **Price trust:** Never use client-submitted price; calculate server-side
4. **Token leak:** Don't log JWT secrets or place in response body
5. **Image filename exposure:** Don't save as original name; randomize it
6. **Cascading deletes:** Room deletions fail if reservations exist (by design); use `Maintenance` status instead
7. **Timezone mismatch:** Store dates as UTC; format for user display in frontend

## Git Workflow Rules

### Authorization
- **NEVER commit or push** to any branch without explicit user request
- **ALWAYS ask** before performing any git operation (commit, push, branch creation, reset, etc.)
- **Only act** on git commands when directly instructed by the user

### Author Attribution
- Always use the user's own git credentials for commits (default: RizzaFachrudin)
- Do NOT add any AI/Claude attribution in commit messages or pull request descriptions. Keep the commit history clean and authored only by the user.

### Branch Management
- Never push directly to main/master branches
- Never force push without explicit permission
- Never delete branches without explicit instruction

### Safety
- Double-check .gitignore before staging files (ensure .env, node_modules, uploads/ are excluded)
- Verify staged files with `git status` before committing
- Confirm with user if unsure about any operation
