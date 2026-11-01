# PRD: Sistem Informasi Reservasi Homestay Berbasis Web

| Item | Keterangan |
| --- | --- |
| Versi | 1.0 (draft siap coding) |
| Tanggal | 27 Oktober 2026 |
| Mata kuliah | Pengembangan Website Lanjut |
| Dokumen acuan | SRS Bab 1–3 "Sistem Informasi Reservasi Homestay Berbasis Web" (17 System Feature) |
| Cakupan | Satu pengelola homestay (single-tenant), bukan SaaS/marketplace multi-mitra |

> **Cara membaca dokumen ini.** Semua yang ada di SRS dipertahankan apa adanya (diberi kode `SF-xx` sesuai nomor System Feature). Bagian yang belum diputuskan di SRS ditandai **[Rekomendasi]** (usulan teknis yang boleh diganti) atau **[Keputusan PRD]** (aturan bisnis yang saya tetapkan agar bisa langsung dikode; mohon dikonfirmasi). Daftar lengkapnya ada di bagian 15.

---

## 1. Ringkasan Produk

### 1.1 Latar belakang dan tujuan
Pengelola homestay membutuhkan sistem untuk mendigitalkan proses pemesanan kamar: dari menelusuri kamar, mengecek ketersediaan, booking, pembayaran daring, sampai check-in dan check-out di lokasi. Produk ini adalah aplikasi web yang dipakai oleh dua aktor: **Tamu** dan **Admin (Pengelola/Pemilik)**.

### 1.2 Tujuan yang terukur
1. Tamu dapat menyelesaikan alur *cari kamar → booking → bayar → dapat kode reservasi* tanpa bantuan admin.
2. Status reservasi dan pembayaran berubah **otomatis** lewat webhook Payment Gateway (tanpa upload bukti manual).
3. Admin dapat memvalidasi check-in dengan kode reservasi dan melihat laporan pendapatan bulanan.
4. Seluruh 17 System Feature di SRS terimplementasi, termasuk 5 fitur wajib kelas: **Kamar, Fasilitas, Ketersediaan, Pemesanan, Check-in**.

### 1.3 Di luar cakupan (non-goals)
- Pembayaran tunai atau upload bukti transfer manual (sudah dihapus di SRS).
- Banyak properti/mitra, komisi, payout, role Super Admin.
- Aplikasi mobile native, notifikasi email/WhatsApp, review/rating, kode promo, pengembalian dana (refund).
- Transaksi uang sungguhan: tahap tugas ini memakai **sandbox** Payment Gateway.

### 1.4 Definisi singkat
| Istilah | Arti |
| --- | --- |
| Reservasi aktif | Reservasi berstatus `Pending`, `Confirmed`, atau `Checked-in` (memblokir kamar pada tanggalnya) |
| Kode reservasi | `booking_code`, unik, ditampilkan sebagai tiket check-in |
| Webhook | Panggilan HTTP dari Payment Gateway ke backend untuk mengabarkan status pembayaran |

---

## 2. Tech Stack

### 2.1 Yang sudah ditetapkan (dari SRS dan perubahan terbaru)
| Lapisan | Teknologi |
| --- | --- |
| Frontend | React.js + Tailwind CSS (single-page application, responsif) |
| Backend | Express.js (Node.js), REST API (JSON), middleware autentikasi dan hak akses |
| Basis data | MySQL |
| Pembayaran | Payment Gateway sandbox (Midtrans atau Xendit) lewat RESTful API + Webhook |
| Invoice | Pustaka pembuat PDF pada Node.js |

### 2.2 Pilihan teknis **[Rekomendasi]** (belum ada di SRS)
| Kebutuhan | Usulan | Catatan |
| --- | --- | --- |
| Build frontend | Vite | Cepat, setup minimal |
| Routing frontend | React Router | Untuk route publik, tamu, admin |
| HTTP client | Axios | Interceptor untuk token |
| ORM/query | Sequelize atau Prisma | Pilih satu; keduanya mendukung MySQL dan transaksi |
| Autentikasi | JWT (Bearer token) + `bcrypt` | Logout = hapus token di klien |
| Validasi input | `zod` atau `express-validator` | Dipakai di setiap endpoint POST/PUT/PATCH |
| Upload foto | `multer` | Multi-file, batasi tipe dan ukuran |
| PDF invoice | PDFKit | Tidak butuh headless browser. Alternatif: Puppeteer |
| Job terjadwal | `node-cron` | Menutup reservasi `Pending` yang kedaluwarsa |
| Gateway default | Midtrans Snap (sandbox) | Dibuat lewat *adapter* agar bisa ganti ke Xendit |

---

## 3. Aktor dan Hak Akses

| Aktor | Boleh | Tidak boleh |
| --- | --- | --- |
| **Tamu (Guest)** | Registrasi, login, beranda, cari ketersediaan, katalog dan detail kamar, booking, bayar, riwayat dan tiket, unduh invoice **miliknya sendiri**, logout | Mengakses halaman/endpoint admin, melihat reservasi tamu lain |
| **Admin** | Login, dashboard, CRUD kamar, CRUD fasilitas, galeri foto, monitoring reservasi, check-in/check-out, laporan pendapatan, logout | Mendaftar sendiri lewat form publik (akun admin disiapkan lewat *seeder*) |

Catatan: sesuai SRS 3.3 dan 3.5, semua halaman tamu (beranda, katalog, pencarian) mensyaratkan **login**. Kalau tidak login, pengguna diarahkan ke halaman login.

---

## 4. Tema Visual dan UX

- Gaya: modern dan lokal autentik, bersih, intuitif, **mobile-first**.
- Warna earth tone **[Rekomendasi token Tailwind]**:

| Token | Hex | Pemakaian |
| --- | --- | --- |
| `cream` | `#F7F1E3` | Latar halaman |
| `sage` | `#9CAF88` | Aksen utama, tombol primer |
| `sage-dark` | `#6F8A5B` | Hover, status sukses |
| `wood` | `#8B5E3C` | Judul, tombol sekunder |
| `ink` | `#3B2F2F` | Teks utama |

- Wajib ada: state *loading*, *empty*, dan *error* di setiap daftar dan form; pesan validasi dalam Bahasa Indonesia; dialog konfirmasi sebelum hapus.
- Format uang `Rp 1.250.000`, tanggal `27 Okt 2026`.

---

## 5. Pemetaan Fitur Wajib Kelas

| Fitur wajib | System Feature | Isi singkat |
| --- | --- | --- |
| Kamar | SF-5, SF-12 | Katalog/detail kamar (tamu), CRUD kamar (admin) |
| Fasilitas | SF-13 | CRUD master fasilitas, relasi many-to-many ke kamar |
| Ketersediaan | SF-4 | Pencarian berdasarkan tanggal + kalender ketersediaan |
| Pemesanan | SF-6 (+SF-7, SF-15) | Booking, pembayaran, monitoring |
| Check-in | SF-16 | Validasi kode reservasi, check-in, check-out |

---

## 6. Model Data

### 6.1 Relasi (sesuai ERD Chen)
- `users` 1 — N `reservations`
- `rooms` 1 — N `reservations`
- `rooms` M — N `facilities` (pivot `facility_room`)
- `rooms` 1 — N `room_images`
- `reservations` 1 — 1 `payments`

### 6.2 Skema MySQL
```sql
CREATE TABLE users (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,           -- hash bcrypt
  phone_number  VARCHAR(20)  NOT NULL,
  role          ENUM('Admin','Guest') NOT NULL DEFAULT 'Guest',
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
  id               BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name             VARCHAR(100) NOT NULL,
  description      TEXT,
  price_per_night  DECIMAL(12,2) NOT NULL,
  capacity         TINYINT UNSIGNED NOT NULL,
  status           ENUM('Available','Maintenance') NOT NULL DEFAULT 'Available',
  created_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE facilities (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL UNIQUE,
  icon        VARCHAR(100),
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE facility_room (
  room_id      BIGINT UNSIGNED NOT NULL,
  facility_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (room_id, facility_id),
  FOREIGN KEY (room_id)     REFERENCES rooms(id)      ON DELETE CASCADE,
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

CREATE TABLE room_images (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  room_id     BIGINT UNSIGNED NOT NULL,
  image_path  VARCHAR(255) NOT NULL,
  is_primary  TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE reservations (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_code    VARCHAR(20) NOT NULL UNIQUE,
  user_id         BIGINT UNSIGNED NOT NULL,
  room_id         BIGINT UNSIGNED NOT NULL,
  check_in_date   DATE NOT NULL,
  check_out_date  DATE NOT NULL,
  total_price     DECIMAL(12,2) NOT NULL,
  status          ENUM('Pending','Confirmed','Checked-in','Completed','Cancelled')
                  NOT NULL DEFAULT 'Pending',
  created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),   -- RESTRICT: kamar tidak bisa dihapus bila punya riwayat
  INDEX idx_room_dates (room_id, check_in_date, check_out_date),
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);

CREATE TABLE payments (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  reservation_id  BIGINT UNSIGNED NOT NULL UNIQUE,   -- 1:1 dengan reservasi
  transaction_id  VARCHAR(100),
  payment_type    VARCHAR(50),
  amount          DECIMAL(12,2) NOT NULL,
  status          ENUM('Pending','Settlement','Expire','Cancel') NOT NULL DEFAULT 'Pending',
  created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);
```

### 6.3 Mesin status
```
Reservasi:  Pending ──bayar sukses──▶ Confirmed ──check-in──▶ Checked-in ──check-out──▶ Completed
               └──expire / cancel──▶ Cancelled

Pembayaran: Pending ──▶ Settlement | Expire | Cancel
```

| Kejadian | Payments.status | Reservations.status |
| --- | --- | --- |
| Tamu menekan Bayar (transaksi dibuat) | Pending | Pending |
| Webhook `settlement` | Settlement | Confirmed |
| Webhook `expire` | Expire | Cancelled |
| Webhook `cancel`, `deny`, atau `failure` **[Keputusan PRD]** | Cancel | Cancelled |
| Admin check-in | (tetap Settlement) | Checked-in |
| Admin check-out | (tetap Settlement) | Completed |

> Webhook yang datang berulang atau terlambat harus **idempoten**: jangan mengubah reservasi yang sudah `Checked-in` atau `Completed`.

---

## 7. Aturan Bisnis

| Kode | Aturan |
| --- | --- |
| BR-01 | Tamu baru selalu berperan `Guest`. Akun `Admin` dibuat lewat seeder. Email harus unik. |
| BR-02 | Validasi tanggal: `check_in_date` ≥ hari ini dan `check_out_date` > `check_in_date`. Jumlah malam = selisih hari. |
| BR-03 | Kamar **tersedia** pada rentang tanggal bila: `status = 'Available'`, `capacity` ≥ jumlah tamu, dan tidak ada reservasi aktif yang bertabrakan. |
| BR-04 | Tabrakan tanggal: reservasi lain bertabrakan jika `lama.check_in < baru.check_out AND lama.check_out > baru.check_in`. Tanggal check-out boleh sama dengan check-in tamu berikutnya. |
| BR-05 | `total_price = price_per_night × jumlah malam`, dihitung **di server**, bukan dipercaya dari klien. |
| BR-06 | `booking_code` unik dan sulit ditebak, misalnya `HS-20261027-K7Q2` **[Rekomendasi format]**. Dipakai juga sebagai `order_id` ke Payment Gateway. |
| BR-07 | Saat booking, cek ketersediaan **ulang** di dalam transaksi database dengan kunci baris kamar (`SELECT ... FOR UPDATE`) agar tidak terjadi dua booking pada kamar dan tanggal yang sama. |
| BR-08 | Reservasi `Pending` kedaluwarsa setelah batas waktu bayar **[Keputusan PRD: 60 menit, atur lewat env `PAYMENT_EXPIRY_MINUTES`]**. Job terjadwal mengubahnya menjadi `Cancelled` dan pembayarannya `Expire`, sehingga kamar dilepas. |
| BR-09 | Webhook wajib diverifikasi keasliannya sebelum memproses (lihat 10.2). |
| BR-10 | Check-in hanya bila: kode ditemukan, status `Confirmed`, pembayaran `Settlement`, dan tanggal hari ini = `check_in_date` **[Keputusan PRD: tanpa toleransi awal]**. |
| BR-11 | Check-out hanya untuk reservasi `Checked-in`; hasilnya `Completed`. Karena ketersediaan dihitung per tanggal, `rooms.status` **tidak diubah** oleh check-out. |
| BR-12 | Kamar tidak boleh dihapus bila punya reservasi aktif. Karena FK `RESTRICT`, kamar yang punya riwayat reservasi apa pun juga tidak bisa dihapus. Gunakan status `Maintenance` untuk menyembunyikannya. |
| BR-13 | Kamar berstatus `Maintenance` tidak muncul di hasil pencarian dan tidak bisa dipesan. Halaman detailnya menampilkan pesan "kamar tidak tersedia" (SRS 3.5). |
| BR-14 | Setiap kamar punya paling banyak satu foto utama (`is_primary = 1`). Foto pertama yang diunggah otomatis menjadi utama bila belum ada. |
| BR-15 | Tamu hanya dapat melihat dan mengunduh invoice **reservasinya sendiri**. Invoice hanya tersedia bila pembayaran `Settlement`. |
| BR-16 | Laporan bulanan menghitung reservasi dengan pembayaran `Settlement` **[Keputusan PRD: dikelompokkan berdasarkan bulan `check_in_date`]** karena skema belum punya kolom `paid_at`. |
| BR-17 | Semua endpoint admin dilindungi middleware: token valid **dan** `role = 'Admin'`, jika tidak → 401/403. |

---

## 8. Kebutuhan Fungsional per System Feature

Format: **Cerita pengguna → Kriteria penerimaan (AC)**. Skenario *normal* dan *gagal* di SRS menjadi kriteria uji.

### SF-1 Registrasi Akun Tamu
- Sebagai calon tamu, saya ingin membuat akun agar bisa memesan kamar.
- **AC normal:** isi nama, email, nomor telepon, kata sandi → data valid dan email belum dipakai → akun `Guest` tersimpan (password di-hash) → diarahkan ke halaman login dengan pesan berhasil.
- **AC gagal:** email sudah terdaftar atau format tidak valid → pesan kesalahan per kolom, form tampil kembali.
- Validasi: nama wajib; email valid; telepon hanya angka dan opsional `+`; kata sandi minimal 8 karakter **[Rekomendasi]**.

### SF-2 Login (Tamu dan Admin)
- **AC normal:** email dan kata sandi benar → server mengembalikan token dan data user → klien mengarahkan `Guest` ke beranda dan `Admin` ke `/admin`.
- **AC gagal:** kredensial salah → pesan generik "email atau kata sandi salah" (jangan beda pesan untuk email vs sandi), form login tampil kembali.

### SF-3 Beranda Tamu
- **AC normal:** setelah login, tampil banner homestay, form pencarian (tanggal masuk, tanggal keluar, jumlah tamu), kamar unggulan, dan menu (Kamar, Riwayat, Keluar).
- **AC gagal:** token hilang atau kedaluwarsa → diarahkan ke login.
- Kamar unggulan **[Keputusan PRD]**: 3–6 kamar `Available` terbaru atau termurah.

### SF-4 Pencarian dan Ketersediaan Kamar *(wajib)*
- **AC normal:** isi tanggal dan jumlah tamu → validasi → daftar kamar tersedia (BR-03/04) dengan harga total untuk rentang itu.
- **AC gagal 1:** check-out ≤ check-in atau tanggal lampau → pesan kesalahan tanggal.
- **AC gagal 2:** tidak ada kamar cocok → pesan "kamar tidak tersedia" dan saran mengubah tanggal.
- Kalender ketersediaan pada detail kamar menandai tanggal yang sudah terisi (reservasi aktif) per bulan.

### SF-5 Katalog dan Detail Kamar *(wajib)*
- **AC normal:** katalog menampilkan kartu kamar (foto utama, nama, harga per malam, kapasitas). Detail menampilkan deskripsi, galeri foto, fasilitas, kalender ketersediaan, dan tombol **Pesan**.
- **AC gagal:** kamar tidak ditemukan atau `Maintenance` → pesan "kamar tidak tersedia" dan kembali ke katalog.

### SF-6 Pemesanan (Booking) *(wajib)*
- **AC normal:** dari detail kamar → form pemesanan (tanggal, ringkasan biaya) → Konfirmasi → server cek ulang (BR-07), hitung total (BR-05), buat kode booking (BR-06), simpan reservasi `Pending` → arahkan ke halaman pembayaran.
- **AC gagal:** kamar sudah diambil tamu lain saat konfirmasi → pesan "kamar tidak lagi tersedia" dan kembali ke pencarian. Tidak ada reservasi tersimpan.

### SF-7 Pembayaran Daring (Payment Gateway)
- **AC normal:** tekan **Bayar** → backend membuat transaksi ke gateway (order_id = `booking_code`, amount = `total_price`) dan menyimpan `payments` berstatus `Pending` → klien menampilkan halaman/popup pembayaran → tamu membayar → gateway memanggil webhook → server verifikasi (BR-09) → `Settlement` + `Confirmed` → halaman konfirmasi menampilkan kode reservasi.
- **AC gagal:** pembayaran dibatalkan atau kedaluwarsa → webhook `Cancel` atau `Expire` → reservasi `Cancelled`, kamar dilepas, pesan gagal dengan opsi memesan ulang.
- Halaman konfirmasi sebaiknya **polling** status reservasi beberapa detik karena webhook bisa datang sedikit setelah tamu kembali dari gateway.
- Jika tamu menekan Bayar lagi pada reservasi `Pending` yang masih berlaku, pakai ulang transaksi yang ada (jangan membuat dua transaksi).

### SF-8 Riwayat Reservasi dan Tiket Check-in
- **AC normal:** daftar reservasi milik tamu (kode, kamar, tanggal, status) → detail menampilkan tiket dengan kode reservasi (dan pembayaran). Tiket aktif untuk status `Confirmed` ke atas; untuk `Pending` tampil tombol **Bayar**.
- **AC gagal:** belum punya reservasi → pesan "belum ada riwayat" dan tautan ke katalog.

### SF-9 Unduh Invoice PDF
- **AC normal:** tombol **Unduh Invoice** → server cek kepemilikan dan pembayaran `Settlement` → buat PDF (kode reservasi, data tamu, kamar, tanggal, malam, rincian harga, status bayar) → unduh.
- **AC gagal:** pembayaran bukan `Settlement` → pesan "invoice belum tersedia" dan tautan ke pembayaran.

### SF-10 Logout
- **AC normal:** pilih **Keluar** → token dihapus di klien → halaman login.
- **AC gagal:** sesi sudah berakhir → tetap diarahkan ke login tanpa error.

### SF-11 Dashboard Admin
- **AC normal:** tampil jumlah kamar, reservasi `Pending`, tamu check-in hari ini, tamu check-out hari ini, pendapatan bulan berjalan.
- **AC gagal:** akun bukan Admin membuka URL admin → ditolak (403) dan diarahkan ke beranda.

### SF-12 Kelola Data Kamar *(wajib)*
- **AC tambah/ubah:** form (nama, deskripsi, harga per malam, kapasitas, status, pilihan fasilitas) → valid → simpan data dan relasi fasilitas.
- **AC hapus:** konfirmasi → bila tidak ada reservasi (BR-12) → hapus kamar beserta relasi fasilitas dan foto (hapus file fisik juga).
- **AC gagal:** data tidak lengkap, harga ≤ 0, atau kamar punya reservasi → pesan kesalahan, data lama tetap.

### SF-13 Kelola Fasilitas *(wajib)*
- **AC:** tambah, ubah, hapus fasilitas (nama, ikon). Menghapus fasilitas ikut melepas relasinya dari kamar (cascade pivot).
- **AC gagal:** nama kosong atau duplikat → pesan kesalahan.
- Ikon **[Rekomendasi]**: simpan nama ikon dari satu pustaka (misalnya Lucide) dan petakan di frontend.

### SF-14 Kelola Galeri Foto (multi-upload)
- **AC normal:** pilih beberapa gambar → validasi format dan ukuran → simpan berkas dan baris `room_images` → galeri diperbarui; admin dapat menandai foto utama (BR-14) atau menghapus foto.
- **AC gagal:** bukan gambar atau melebihi batas → pesan kesalahan, berkas tidak valid tidak disimpan.
- Batas **[Rekomendasi]**: JPG/PNG/WEBP, maksimal 2 MB per berkas, maksimal 10 berkas per unggahan. Nama berkas diacak, bukan nama asli.

### SF-15 Kelola Reservasi Masuk
- **AC normal:** daftar semua reservasi dengan status, filter status dan rentang tanggal, serta halaman detail (tamu, kamar, tanggal, pembayaran).
- **AC gagal:** filter tanpa hasil → pesan "data reservasi tidak ditemukan".
- Daftar memakai paginasi **[Rekomendasi]** (10–20 baris per halaman).

### SF-16 Check-in dan Check-out *(wajib)*
- **AC check-in:** admin memasukkan kode reservasi → sistem cek BR-10 → tampil detail → tombol **Check-in** → status `Checked-in`.
- **AC check-out:** pilih reservasi `Checked-in` → tombol **Check-out** → status `Completed`.
- **AC gagal:** kode tidak ditemukan, pembayaran belum `Settlement`, tanggal belum sesuai, atau sudah check-in → pesan alasan penolakan yang spesifik, status tidak berubah.

### SF-17 Laporan Pendapatan dan Reservasi Bulanan
- **AC normal:** pilih bulan dan tahun → tampil jumlah reservasi, total pendapatan, dan rincian per kamar (BR-16) → dapat dicetak.
- **AC gagal:** periode tanpa transaksi → pesan "tidak ada data pada periode yang dipilih".
- Cetak **[Rekomendasi]**: tombol cetak browser (`window.print()` dengan CSS khusus cetak) cukup untuk tugas ini.

---

## 9. Spesifikasi API

**Basis:** `/api`. **Format:** JSON. **Auth:** header `Authorization: Bearer <token>`.

**Respons sukses:** `{ "success": true, "data": ..., "message": "..." }`
**Respons gagal:** `{ "success": false, "message": "...", "errors": { "field": "pesan" } }`

| Status HTTP | Dipakai untuk |
| --- | --- |
| 200 / 201 | Berhasil / berhasil dibuat |
| 400 / 422 | Input tidak valid (kesalahan per kolom di `errors`) |
| 401 | Belum login atau token tidak valid |
| 403 | Login tetapi peran tidak berhak |
| 404 | Data tidak ditemukan |
| 409 | Konflik (kamar sudah dipesan, email duplikat, kamar punya reservasi) |

### 9.1 Autentikasi
| Method | Path | Akses | Keterangan | SF |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | Publik | Daftar akun `Guest` | 1 |
| POST | `/auth/login` | Publik | Login, kembalikan token + user | 2 |
| GET | `/auth/me` | Login | Data user dari token | 3, 10 |

### 9.2 Tamu
| Method | Path | Akses | Keterangan | SF |
| --- | --- | --- | --- | --- |
| GET | `/rooms?featured=true` | Guest | Kamar unggulan untuk beranda | 3 |
| GET | `/rooms` | Guest | Katalog kamar (foto utama, harga, kapasitas) | 5 |
| GET | `/rooms/available?check_in=&check_out=&guests=` | Guest | Pencarian ketersediaan | 4 |
| GET | `/rooms/:id` | Guest | Detail: deskripsi, foto, fasilitas | 5 |
| GET | `/rooms/:id/availability?month=YYYY-MM` | Guest | Tanggal terisi untuk kalender | 4, 5 |
| POST | `/reservations` | Guest | Booking: `room_id`, `check_in_date`, `check_out_date` | 6 |
| GET | `/reservations/me` | Guest | Riwayat reservasi milik sendiri | 8 |
| GET | `/reservations/:id` | Guest (pemilik) | Detail + tiket + pembayaran | 8 |
| POST | `/reservations/:id/pay` | Guest (pemilik) | Buat atau ambil ulang transaksi gateway (kembalikan token/URL bayar) | 7 |
| GET | `/reservations/:id/invoice` | Guest (pemilik) | Unduh PDF (hanya bila `Settlement`) | 9 |

### 9.3 Webhook
| Method | Path | Akses | Keterangan | SF |
| --- | --- | --- | --- | --- |
| POST | `/payments/webhook` | Publik, diverifikasi | Terima notifikasi status dari gateway | 7 |

### 9.4 Admin (semua di bawah `/admin`, wajib role Admin)
| Method | Path | Keterangan | SF |
| --- | --- | --- | --- |
| GET | `/admin/dashboard` | Statistik ringkas | 11 |
| GET / POST | `/admin/rooms` | Daftar / tambah kamar (termasuk `facility_ids[]`) | 12 |
| GET / PUT / DELETE | `/admin/rooms/:id` | Detail / ubah / hapus kamar | 12 |
| GET / POST | `/admin/facilities` | Daftar / tambah fasilitas | 13 |
| PUT / DELETE | `/admin/facilities/:id` | Ubah / hapus fasilitas | 13 |
| POST | `/admin/rooms/:id/images` | Unggah banyak foto (`multipart/form-data`) | 14 |
| PATCH | `/admin/images/:id/primary` | Jadikan foto utama | 14 |
| DELETE | `/admin/images/:id` | Hapus foto | 14 |
| GET | `/admin/reservations?status=&from=&to=&page=` | Monitoring reservasi | 15 |
| GET | `/admin/reservations/:id` | Detail reservasi | 15 |
| GET | `/admin/checkin/lookup?code=` | Cari reservasi untuk check-in | 16 |
| POST | `/admin/reservations/:id/check-in` | Ubah ke `Checked-in` | 16 |
| POST | `/admin/reservations/:id/check-out` | Ubah ke `Completed` | 16 |
| GET | `/admin/reports/monthly?month=&year=` | Rekap bulanan | 17 |

> Daftar fasilitas juga dibutuhkan form kamar di sisi admin, sehingga `GET /admin/facilities` cukup. Logout tidak butuh endpoint karena token dihapus di klien.

---

## 10. Rincian Teknis Kritis

### 10.1 Query ketersediaan (BR-03/04)
```sql
SELECT r.*
FROM rooms r
WHERE r.status = 'Available'
  AND r.capacity >= :guests
  AND NOT EXISTS (
    SELECT 1 FROM reservations x
    WHERE x.room_id = r.id
      AND x.status IN ('Pending','Confirmed','Checked-in')
      AND x.check_in_date  < :check_out
      AND x.check_out_date > :check_in
  );
```

### 10.2 Alur webhook (SF-7)
1. Terima `POST /payments/webhook` (body JSON dari gateway).
2. **Verifikasi keaslian** sebelum menyentuh data. Untuk Midtrans: hitung `SHA512(order_id + status_code + gross_amount + ServerKey)` dan bandingkan dengan `signature_key`. Untuk Xendit: cocokkan header `x-callback-token` dengan token verifikasi callback. *Cek ulang detail terbaru di dokumentasi resmi gateway yang Anda pilih sebelum implementasi.*
3. Cari reservasi lewat `order_id` = `booking_code`. Cek `gross_amount` = `payments.amount`.
4. Petakan status gateway ke tabel di 6.3, perbarui `payments` (`transaction_id`, `payment_type`, `status`) dan `reservations` **dalam satu transaksi database**.
5. Abaikan bila reservasi sudah `Checked-in` atau `Completed` (idempoten).
6. Balas `200` secepatnya agar gateway tidak mengirim ulang terus.

> Saat pengembangan lokal, gateway tidak bisa memanggil `localhost`. Pakai tunnel (misalnya ngrok) dan daftarkan URL webhook di dashboard sandbox.

### 10.3 Transaksi booking (BR-07)
Dalam satu transaksi: kunci baris kamar → jalankan cek tabrakan → hitung total → insert `reservations` → insert `payments` (`Pending`) bila dibuat sekaligus, atau saat **Bayar**. Jika cek gagal, rollback dan balas `409`.

### 10.4 Keamanan
- Password di-hash `bcrypt`; jangan pernah dikembalikan di respons.
- Semua query pakai parameter (ORM/prepared statement); validasi semua input di server.
- CORS hanya untuk origin frontend. Batasi laju (rate limit) pada `/auth/login` dan `/auth/register`.
- Otorisasi di level data: tamu hanya boleh membaca baris dengan `user_id` miliknya (jangan hanya sembunyikan tombol di UI).
- Kunci rahasia (JWT, server key gateway) hanya di `.env`, jangan di-commit.
- Berkas unggahan: cek MIME dan ekstensi, ganti nama, simpan di folder khusus.

---

## 11. Struktur Aplikasi (Frontend)

### 11.1 Rute
| Rute | Akses | SF |
| --- | --- | --- |
| `/login`, `/register` | Publik | 1, 2 |
| `/` (beranda) | Guest | 3 |
| `/rooms`, `/rooms/:id` | Guest | 4, 5 |
| `/search?check_in=&check_out=&guests=` | Guest | 4 |
| `/booking/:roomId` | Guest | 6 |
| `/payment/:reservationId` | Guest | 7 |
| `/reservations`, `/reservations/:id` | Guest | 8, 9 |
| `/admin` | Admin | 11 |
| `/admin/rooms`, `/admin/rooms/new`, `/admin/rooms/:id/edit` | Admin | 12 |
| `/admin/rooms/:id/gallery` | Admin | 14 |
| `/admin/facilities` | Admin | 13 |
| `/admin/reservations`, `/admin/reservations/:id` | Admin | 15 |
| `/admin/checkin` | Admin | 16 |
| `/admin/reports` | Admin | 17 |

Pakai komponen `ProtectedRoute` (cek token) dan `RoleRoute` (cek role). Tangani `401` secara global: hapus token lalu arahkan ke login.

### 11.2 Komponen inti **[Rekomendasi]**
`Navbar`, `RoomCard`, `RoomGallery`, `FacilityBadge`, `DateRangePicker`, `AvailabilityCalendar`, `PriceSummary`, `StatusBadge`, `DataTable` (dengan paginasi), `ConfirmDialog`, `FormField`, `Toast`, `EmptyState`, `Skeleton`.

---

## 12. Struktur Proyek **[Rekomendasi]**

```
homestay/
├── backend/
│   ├── src/
│   │   ├── config/          # db, env, gateway
│   │   ├── models/          # users, rooms, facilities, room_images, reservations, payments
│   │   ├── routes/          # auth, rooms, reservations, payments, admin/*
│   │   ├── controllers/
│   │   ├── services/        # availability, booking, payment(adapter), invoice, report
│   │   ├── middlewares/     # auth, role, validate, upload, errorHandler
│   │   ├── jobs/            # expirePendingReservations
│   │   ├── utils/           # bookingCode, dates, response
│   │   └── app.js
│   ├── uploads/rooms/
│   ├── seeders/             # admin, fasilitas, kamar contoh
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/           # guest/, admin/, auth/
    │   ├── components/
    │   ├── layouts/         # GuestLayout, AdminLayout
    │   ├── context/         # AuthContext
    │   ├── services/        # api.js (axios) + per modul
    │   ├── routes/
    │   └── main.jsx
    └── tailwind.config.js
```

### Variabel lingkungan (`backend/.env.example`)
```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=homestay
DB_USER=root
DB_PASS=
JWT_SECRET=ganti-dengan-string-acak-panjang
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173
PAYMENT_PROVIDER=midtrans            # atau xendit
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
PAYMENT_EXPIRY_MINUTES=60
UPLOAD_MAX_MB=2
```

---

## 13. Kebutuhan Non-Fungsional (dari SRS 2.4, 2.5, 2.7)

| Aspek | Target |
| --- | --- |
| Perangkat dan browser | Browser modern (Chrome, Firefox, Edge, Safari) di Windows/Linux/macOS/Android/iOS; tampilan responsif |
| Lingkungan minimum | RAM 2 GB, CPU 4 core, koneksi internet stabil |
| Ketergantungan | Server API Payment Gateway aktif dan webhook terkirim |
| Hak akses | Dipaksakan di backend lewat middleware autentikasi dan role |
| Kinerja **[Rekomendasi]** | Halaman utama dan pencarian terasa cepat dengan data skala homestay; indeks `idx_room_dates` dipakai |
| Bahasa antarmuka | Bahasa Indonesia |
| Kualitas | Tidak ada error tak tertangani di konsol saat alur utama; pesan error ramah pengguna |

---

## 14. Rencana Pengerjaan dan Penerimaan

### 14.1 Urutan implementasi **[Rekomendasi]**
| Tahap | Isi | SF | Selesai bila |
| --- | --- | --- | --- |
| M0 | Setup repo, DB, migrasi, seeder admin, middleware error | – | Server dan frontend jalan, tabel terbentuk |
| M1 | Registrasi, login, `me`, proteksi rute, logout | 1, 2, 10 | Dua role bisa masuk ke halaman masing-masing |
| M2 | CRUD fasilitas, CRUD kamar, galeri foto | 13, 12, 14 | Admin dapat menyiapkan data kamar lengkap |
| M3 | Beranda, katalog, detail, pencarian, kalender | 3, 5, 4 | Tamu dapat mencari kamar sesuai tanggal |
| M4 | Booking dengan transaksi dan kunci baris | 6 | Dua booking bersamaan tidak bisa bentrok |
| M5 | Pembayaran sandbox, webhook, job kedaluwarsa | 7 | Status berubah otomatis di semua jalur (bayar, batal, expire) |
| M6 | Riwayat, tiket, invoice PDF | 8, 9 | Tamu dapat mengunduh invoice setelah bayar |
| M7 | Monitoring reservasi, check-in, check-out | 15, 16 | Alur kedatangan sampai kepulangan berjalan |
| M8 | Dashboard dan laporan bulanan | 11, 17 | Angka cocok dengan data uji |
| M9 | Uji menyeluruh, perbaikan UI, dokumentasi, demo | semua | Daftar uji 14.2 lulus |

### 14.2 Daftar uji penerimaan (diambil dari skenario SRS)
| SF | Normal | Gagal |
| --- | --- | --- |
| 1 | Akun terbuat, masuk ke login | Email duplikat ditolak |
| 2 | Tamu → beranda, Admin → dashboard | Sandi salah ditolak |
| 3 | Beranda tampil lengkap | Tanpa token → login |
| 4 | Hasil sesuai tanggal dan kapasitas | Tanggal salah, dan tidak ada kamar |
| 5 | Detail lengkap (foto, fasilitas, kalender) | Kamar Maintenance ditolak |
| 6 | Reservasi `Pending` + kode unik | Kamar sudah diambil → 409 |
| 7 | Settlement → `Confirmed` | Cancel/Expire → `Cancelled`, kamar bebas |
| 8 | Riwayat dan tiket tampil | Belum ada reservasi → pesan kosong |
| 9 | PDF terunduh | Belum bayar → ditolak |
| 10 | Keluar → login | Sesi habis → login |
| 11 | Statistik tampil | Tamu buka URL admin → 403 |
| 12 | Tambah, ubah, hapus kamar | Data salah, atau kamar beriwayat tidak terhapus |
| 13 | CRUD fasilitas | Nama kosong/duplikat |
| 14 | Multi-upload, foto utama, hapus | Berkas bukan gambar/terlalu besar |
| 15 | Daftar, filter, detail | Filter kosong → pesan |
| 16 | Check-in lalu check-out | Kode salah, belum bayar, tanggal belum sesuai, sudah check-in |
| 17 | Laporan bulanan benar | Bulan tanpa data → pesan |

### 14.3 Definition of Done per fitur
Endpoint dan halaman jalan; skenario normal **dan** gagal lulus; validasi di server; hak akses diuji (tamu tidak bisa buka rute admin); tampilan rapi di layar ponsel dan desktop; tidak ada rahasia di repositori.

---

## 15. Asumsi, Keputusan Terbuka, dan Hal yang Perlu Dikonfirmasi

1. **Basis data MySQL** tetap dipakai (SRS Bab 2.5), kecuali Anda ubah.
2. **Tailwind CSS** dipertahankan sebagai styling frontend.
3. **Jumlah tamu:** form pencarian di SRS memiliki "jumlah tamu", tetapi ERD yang disepakati tidak punya kolom `guest_count` di `reservations`. Di PRD ini jumlah tamu hanya dipakai untuk **memfilter kapasitas** saat mencari. Jika dosen/Anda ingin jumlah tamu tersimpan, tambah kolom `guest_count` (satu perubahan kecil di ERD, SRS 3.6, dan tabel 6.2).
4. **Batas waktu bayar** 60 menit (BR-08) dan **tanpa toleransi** tanggal check-in (BR-10) adalah keputusan PRD; ubah sesuai kebijakan homestay.
5. **Pengelompokan laporan** berdasarkan bulan check-in (BR-16), karena belum ada `paid_at`.
6. **Pemetaan status** `deny` dan `failure` ke `Cancel` (6.3).
7. **Gateway:** pilih satu (Midtrans atau Xendit) sebelum M5; detail verifikasi webhook harus dicek ke dokumentasi resmi.
8. **Autentikasi token (JWT):** SRS menyebut "sesi login" secara umum; implementasi di sini berbasis token tanpa sesi server.
9. **Pustaka PDF, ORM, dan struktur folder** hanyalah rekomendasi, bukan keharusan SRS.

---

## 16. Matriks Keterlacakan (SRS → PRD)

| SF | Nama fitur SRS | Bagian PRD | Endpoint utama | Halaman |
| --- | --- | --- | --- | --- |
| 1 | Registrasi Akun Tamu | §8 SF-1 | `POST /auth/register` | `/register` |
| 2 | Login (Tamu dan Admin) | §8 SF-2 | `POST /auth/login` | `/login` |
| 3 | Beranda | §8 SF-3 | `GET /rooms?featured=true` | `/` |
| 4 | Pencarian dan Ketersediaan | §8 SF-4, §10.1 | `GET /rooms/available`, `/rooms/:id/availability` | `/search`, kalender |
| 5 | Katalog dan Detail Kamar | §8 SF-5 | `GET /rooms`, `/rooms/:id` | `/rooms`, `/rooms/:id` |
| 6 | Pemesanan | §8 SF-6, §10.3 | `POST /reservations` | `/booking/:roomId` |
| 7 | Pembayaran Daring | §8 SF-7, §10.2 | `POST /reservations/:id/pay`, `POST /payments/webhook` | `/payment/:id` |
| 8 | Riwayat dan Tiket | §8 SF-8 | `GET /reservations/me`, `/reservations/:id` | `/reservations` |
| 9 | Invoice PDF | §8 SF-9 | `GET /reservations/:id/invoice` | detail reservasi |
| 10 | Logout | §8 SF-10 | (sisi klien) | navbar |
| 11 | Dashboard Admin | §8 SF-11 | `GET /admin/dashboard` | `/admin` |
| 12 | CRUD Kamar | §8 SF-12 | `/admin/rooms` | `/admin/rooms*` |
| 13 | CRUD Fasilitas | §8 SF-13 | `/admin/facilities` | `/admin/facilities` |
| 14 | Galeri Foto | §8 SF-14 | `/admin/rooms/:id/images`, `/admin/images/:id` | `/admin/rooms/:id/gallery` |
| 15 | Reservasi Masuk | §8 SF-15 | `GET /admin/reservations` | `/admin/reservations` |
| 16 | Check-in dan Check-out | §8 SF-16 | `/admin/checkin/lookup`, `/check-in`, `/check-out` | `/admin/checkin` |
| 17 | Laporan Bulanan | §8 SF-17 | `GET /admin/reports/monthly` | `/admin/reports` |
