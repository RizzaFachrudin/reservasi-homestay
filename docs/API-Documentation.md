# API Documentation - Sistem Reservasi Homestay

## Base URL
```
Development: http://localhost:5000/api
Production: [TBD]
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Pesan operasi berhasil",
  "data": { /* data response */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Pesan error",
  "errors": {
    "fieldName": "Pesan error spesifik field"
  }
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request berhasil |
| 201 | Created - Resource berhasil dibuat |
| 400 | Bad Request - Request tidak valid |
| 401 | Unauthorized - Token tidak ada atau tidak valid |
| 403 | Forbidden - Tidak memiliki akses ke resource |
| 404 | Not Found - Resource tidak ditemukan |
| 409 | Conflict - Data sudah ada (misal: email duplikat) |
| 422 | Unprocessable Entity - Validasi gagal |
| 500 | Internal Server Error - Error pada server |

---

## Authentication Endpoints

### 1. Register User (Registrasi Tamu)

**Endpoint:** `POST /api/auth/register`

**Access:** Public

**Description:** Mendaftarkan pengguna baru dengan role `Guest`.

**Request Body:**
```json
{
  "name": "string (required, min 1 char)",
  "email": "string (required, valid email format)",
  "password": "string (required, min 8 chars)",
  "phone": "string (required, format: digits with optional + prefix)"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Registrasi berhasil",
  "data": {
    "user": {
      "id": "1",
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "phone": "+628123456789",
      "role": "Guest"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

*409 Conflict (Email sudah terdaftar):*
```json
{
  "success": false,
  "message": "Email sudah terdaftar"
}
```

*422 Unprocessable Entity (Validasi gagal):*
```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": {
    "email": "Format email tidak valid",
    "password": "Password minimal 8 karakter",
    "phone": "Format nomor telepon tidak valid"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "password": "password123",
    "phone": "+628123456789"
  }'
```

---

### 2. Login User

**Endpoint:** `POST /api/auth/login`

**Access:** Public

**Description:** Login pengguna dan mendapatkan JWT token.

**Request Body:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": "1",
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "phone": "+628123456789",
      "role": "Guest"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

*401 Unauthorized (Credentials salah):*
```json
{
  "success": false,
  "message": "Email atau password salah"
}
```

*422 Unprocessable Entity (Validasi gagal):*
```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": {
    "email": "Format email tidak valid",
    "password": "Password tidak boleh kosong"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "budi@example.com",
    "password": "password123"
  }'
```

---

### 3. Get User Profile

**Endpoint:** `GET /api/auth/me`

**Access:** Protected (Requires JWT Token)

**Description:** Mendapatkan profil pengguna yang sedang login.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Profil berhasil diambil",
  "data": {
    "id": "1",
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "phoneNumber": "+628123456789",
    "phone": "+628123456789",
    "role": "Guest",
    "createdAt": "2026-11-02T02:10:49.000Z"
  }
}
```

**Error Responses:**

*401 Unauthorized (Token tidak ada atau invalid):*
```json
{
  "success": false,
  "message": "Token tidak ditemukan"
}
```
atau
```json
{
  "success": false,
  "message": "Token tidak valid"
}
```

*404 Not Found (User tidak ditemukan):*
```json
{
  "success": false,
  "message": "Pengguna tidak ditemukan"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 4. Logout User

**Endpoint:** `POST /api/auth/logout`

**Access:** Protected (Requires JWT Token)

**Description:** Logout pengguna (client-side token removal). Endpoint ini opsional dan bisa digunakan untuk logging purposes.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout berhasil",
  "data": null
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Authentication Flow

### Untuk Client/Frontend:

1. **Register atau Login**: Dapatkan token JWT dari response
2. **Simpan Token**: Simpan token di `localStorage` atau `sessionStorage`
   ```javascript
   localStorage.setItem('token', response.data.token);
   ```
3. **Kirim Token di Setiap Request**: Sertakan token di header `Authorization`
   ```javascript
   headers: {
     'Authorization': `Bearer ${token}`
   }
   ```
4. **Logout**: Hapus token dari storage
   ```javascript
   localStorage.removeItem('token');
   ```

### Token Expiry
- Default expiry: **1 hari** (configurable via `JWT_EXPIRES_IN` di `.env`)
- Jika token expired, client akan menerima HTTP 401 dan harus login ulang

---

## Validation Rules

### Email
- Format valid: `user@domain.com`
- Contoh invalid: `invalid-email`, `user@`, `@domain.com`

### Password
- Minimal 8 karakter
- Disimpan dengan bcrypt hash (cost factor: 10)

### Phone Number
- Format: Digit dengan optional `+` di awal
- Valid: `08123456789`, `+628123456789`, `628123456789`
- Invalid: `0812-345-6789`, `abc123`, `phone-number`

### Name
- Minimal 1 karakter
- Tidak boleh kosong

---

## Security Notes

1. **Password Storage**: Password di-hash menggunakan `bcrypt` dengan cost factor 10
2. **JWT Secret**: Harus diset di environment variable `JWT_SECRET` (min 50 karakter recommended)
3. **CORS**: Backend mengizinkan request dari `CLIENT_ORIGIN` (default: `http://localhost:5173`)
4. **Token Transmission**: Selalu gunakan HTTPS di production untuk melindungi token
5. **Token Storage**: 
   - `localStorage`: Persist across browser sessions
   - `sessionStorage`: Cleared when browser tab closed
   - Jangan simpan token di cookie tanpa `httpOnly` flag

---

## Testing dengan PowerShell

### Full Authentication Flow Test:
```powershell
# 1. Register
$registerBody = @{
    name = "Test User"
    email = "test@example.com"
    password = "password123"
    phone = "+628123456789"
} | ConvertTo-Json

$registerRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method Post -Body $registerBody -ContentType "application/json"

Write-Host "User registered with ID: $($registerRes.data.user.id)"

# 2. Login
$loginBody = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method Post -Body $loginBody -ContentType "application/json"

$token = $loginRes.data.token
Write-Host "Token: $token"

# 3. Get Profile
$headers = @{
    "Authorization" = "Bearer $token"
}

$profile = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" `
  -Method Get -Headers $headers

Write-Host "Profile: $($profile.data | ConvertTo-Json)"

# 4. Logout
$logoutRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/logout" `
  -Method Post -Headers $headers

Write-Host "Logout: $($logoutRes.message)"
```

---

## Error Handling

### Global Error Handler
Backend memiliki global error handler yang menangani:
- `AppError` (custom application errors)
- `PrismaClientKnownRequestError` (database errors)
- `JsonWebTokenError` dan `TokenExpiredError` (JWT errors)
- Unexpected errors (500 Internal Server Error)

### Common Error Scenarios

1. **P2002 - Unique Constraint Violation (Email exists)**
   - Status: 409 Conflict
   - Handled by: Auth service layer

2. **P2025 - Record Not Found**
   - Status: 404 Not Found
   - Example: User dengan ID tersebut tidak ada

3. **JWT Invalid/Expired**
   - Status: 401 Unauthorized
   - Client harus redirect ke halaman login

---

## Environment Variables

Required environment variables untuk authentication:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=mysql://root:root@localhost:3306/homestay

# JWT Configuration
JWT_SECRET=your-super-secret-key-min-50-characters-recommended
JWT_EXPIRES_IN=1d

# CORS
CLIENT_ORIGIN=http://localhost:5173
```

---

## Changelog

### Version 1.0.0 (2026-11-02)
- ✅ POST `/api/auth/register` - Registrasi tamu baru
- ✅ POST `/api/auth/login` - Login dan generate JWT
- ✅ GET `/api/auth/me` - Get profil pengguna (protected)
- ✅ POST `/api/auth/logout` - Logout (client-side)
- ✅ JWT authentication middleware
- ✅ Input validation dengan Zod
- ✅ Standardized response format
- ✅ Error handling (duplicate email, invalid credentials, validation errors)

### Upcoming Features (Milestone 2+)
- Room management endpoints (CRUD kamar)
- Facility management endpoints
- Reservation/booking endpoints
- Payment gateway integration (Midtrans)
- Admin-specific endpoints
- File upload for room images
