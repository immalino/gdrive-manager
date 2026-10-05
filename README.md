# GDrive Multi-Account Manager — Shared Virtual Drive

Aplikasi web modern berbasis Next.js App Router (Phase 4: **Shared Virtual Drive**) untuk menyatukan banyak akun Google Drive ke dalam satu penyimpanan virtual terpadu berkapasitas besar (~1.5 TB+ dari 100 akun).

Pengguna melihat satu **"My Drive"** terpadu yang menyerupai Google Drive asli tanpa perlu memusingkan di akun mana berkas tersimpan. Berkas baru secara otomatis diarahkan ke akun dengan sisa kuota terbesar, izin folder root dibagikan secara otomatis ke semua akun pool, dan integritas serta kesehatan worker dipantau secara real-time.

---

## 🌟 Arsitektur Shared Virtual Drive (Phase 4)

```text
┌─────────────────────────────────────────────────────────────┐
│                 Frontend UI (GDrive-like)                   │
│  - File Browser ("My Drive") dengan navigasi hierarkis     │
│  - Breadcrumb klikabel, Toolbar (+ New Folder, ↑ Upload)   │
│  - Grid / List View toggle, Multi-select & Bulk operations  │
│  - Worker Status Heartbeat Badge & Storage Pool Bar         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Next.js API Routes (App Router)             │
│  - Distributed Rate Limiter (PostgreSQL Sliding Window)     │
│  - Auth (Better Auth) & Guard Session                       │
│  - Setup & Permissions Service (Shared Root & Pool Sharing) │
│  - File Operations & Streaming Upload / Migration           │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      PostgreSQL Database     │ │   Background Worker Daemon │
│  - google_accounts (role)    │ │  - Heartbeat (setiap 30 dtk)│
│  - shared_roots              │ │  - Quota sync (10 mnt)     │
│  - shared_permissions        │ │  - Integrity check (30 mnt)│
│  - drive_files (cache index) │ │  - Indexing cache (60 mnt) │
│  - rate_limits (distributed) │ └────────────────────────────┘
│  - worker_status (heartbeat) │
└──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Google Drive API v3                     │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │     Akun Utama        │       │      Akun-Akun Pool   │  │
│  │   (Role: Primary)     │       │     (Role: Pool)      │  │
│  │  - Pemilik Folder Root│       │  - Akses Editor Root  │  │
│  │  - Pembuat Subfolder  │       │  - Menampung Berkas   │  │
│  │  - Pewaris Permission │       │  - Kuota Terdistribusi│  │
│  └───────────────────────┘       └───────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Konsep Inti:
1. **Satu Folder Root Terpadu**: Dibuat di akun utama saat Setup Wizard dan otomatis di-share dengan hak akses `writer` (Editor) ke semua akun pool yang terhubung.
2. **Distribusi Kuota Otomatis (Automatic Allocation)**: Setiap berkas yang diunggah otomatis dialokasikan ke akun yang memiliki sisa ruang paling besar yang muat menampung berkas. Google Drive API membebankan kuota berkas ke pengunggah (bukan pemilik folder).
3. **Struktur Folder Terpusat**: Subfolder selalu dibuat menggunakan token akun utama untuk menjamin konsistensi kepemilikan dan pewarisan izin (*inherited permissions*).
4. **Distributed Rate Limiting**: Pembatasan request berbasis tabel PostgreSQL (`rate_limits`) dengan algoritma sliding window, melindungi sistem multi-proses tanpa ketergantungan Redis.
5. **Worker Heartbeat & Integrity Check**: Worker memperbarui heartbeat setiap 30 detik ke `worker_status`. Jika permission Google Drive terputus atau hilang, worker melakukan perbaikan otomatis (*auto-repair*).

---

## 🚀 Fitur Lengkap Aplikasi

- **Setup Wizard Multi-Step**: Inisialisasi folder root di akun utama dan pembagian permission ke akun pool secara terpandu.
- **File Browser Menyerupai Google Drive**: Navigasi subfolder interaktif, breadcrumbs hierarkis, tampilan Grid card dan List table.
- **Upload Queue & Resumable Upload**:
  - Drag-and-drop langsung dari desktop.
  - Antrean upload paralel (concurrency limit 2) dengan progress bar mengambang (*drawer*).
  - Protokol resumable upload Google Drive berpotongan chunk 5 MB untuk file besar dengan fitur pemulihan saat koneksi terputus.
- **Operasi File Lengkap**:
  - Download file biner langsung dan ekspor Google Docs / Sheets / Slides ke format PDF/Office.
  - Delete file tunggal maupun bulk delete lintas akun dengan pool concurrency.
  - Rename dan Move file/folder dengan dialog folder picker.
  - Copy file dalam folder aktif.
- **Storage Balancing Engine & Migration**: Mendeteksi ketimpangan beban penyimpanan antar akun dan memindahkan kepemilikan file secara streaming in-flight antar akun di dalam shared folder yang sama.
- **Worker Heartbeat Monitoring**: Indikator visual real-time status worker di header (Active / Stale / Stopped) via `GET /api/worker/health`.
- **Statistik & Visualisasi**: Area chart riwayat penggunaan storage pool dan pie/bar breakdown jenis file dokumen, gambar, video, arsip.

---

## 📋 Prasyarat Sistem

- **Node.js**: Versi 20.x atau lebih baru (direkomendasikan v22)
- **Package Manager**: `pnpm` (v9 atau v10)
- **Docker & Docker Compose**: Untuk PostgreSQL 16
- **Google Cloud Console**: OAuth 2.0 Web Application Credentials dengan Google Drive API v3 diaktifkan

---

## 🛠️ Panduan Instalasi & Setup

### 1. Kloning Repositori
```bash
git clone <repository-url>
cd gdrive-manager
```

### 2. Jalankan Database PostgreSQL via Docker
```bash
docker compose up -d postgres
```
Periksa status container:
```bash
docker compose ps
```

### 3. Konfigurasi Environment Variables
Salin template berkas `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Hasilkan rahasia acak untuk enkripsi:
```bash
openssl rand -base64 32   # Masukkan ke TOKEN_ENCRYPTION_KEY
openssl rand -base64 32   # Masukkan ke BETTER_AUTH_SECRET
```

Lengkapi berkas `.env`:
```env
DATABASE_URL=postgresql://gdrive:gdrive@localhost:5432/gdrive_manager
BETTER_AUTH_SECRET=<hasil_openssl_rand_base64>
BETTER_AUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<google_client_id_anda>
GOOGLE_CLIENT_SECRET=<google_client_secret_anda>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
TOKEN_ENCRYPTION_KEY=<hasil_openssl_rand_base64>
```

### 4. Instalasi Dependensi & Migrasi Database
```bash
pnpm install
pnpm db:migrate
```

### 5. Menjalankan Aplikasi
```bash
pnpm dev
```
Akses aplikasi melalui peramban di `http://localhost:3000`.

### 6. Menjalankan Background Worker Daemon
Worker bertugas menjaga integritas folder root, memperbarui heartbeat status, menyinkronkan kuota, dan mengindeks file:
```bash
# Mode development / terminal lokal:
pnpm worker

# Sekali jalan (verifikasi/testing):
pnpm worker --once

# Mode produksi (VPS / PM2):
pm2 start "pnpm worker" --name gdrive-worker

# Mode Docker Compose:
docker compose up -d worker
```

---

## 🔐 Konfigurasi Google Cloud Console (OAuth 2.0)

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru atau pilih proyek yang sudah ada.
3. Di **APIs & Services > Library**, aktifkan **Google Drive API**.
4. Di **APIs & Services > OAuth consent screen**:
   - Tipe: **External**.
   - Tambahkan email pengguna uji di bagian **Test users** (karena status aplikasi masih *Testing*).
5. Di **APIs & Services > Credentials**:
   - Buat kredensial **OAuth client ID** (Application type: **Web application**).
   - Masukkan **Authorized redirect URIs**: `http://localhost:3000/api/google/callback`.
   - Simpan, salin Client ID & Client Secret ke file `.env`.

---

## 📜 Skrip pnpm yang Tersedia

| Perintah | Deskripsi |
| --- | --- |
| `pnpm dev` | Menjalankan Next.js development server (Turbopack) |
| `pnpm build` | Membangun build produksi Next.js |
| `pnpm start` | Menjalankan server build produksi |
| `pnpm lint` | Menjalankan ESLint |
| `pnpm typecheck` | Menjalankan TypeScript typecheck (`tsc --noEmit`) |
| `pnpm test` | Menjalankan seluruh test suite unit & fetch-mocked dengan Vitest |
| `pnpm db:generate` | Menghasilkan migrasi SQL baru dari skema Drizzle |
| `pnpm db:migrate` | Menerapkan migrasi database ke PostgreSQL |
| `pnpm worker` | Menjalankan worker loop (heartbeat, sync, integrity, index) |
| `pnpm format` | Menjalankan Prettier code formatter |
| `pnpm format:check`| Memeriksa kepatuhan format kode |

---

## 🔒 Audit Keamanan (PRD §10 & Global Constraints)

Sistem telah melalui audit keamanan berkala dan memenuhi seluruh kriteria:

1. **OAuth 2.0 Tanpa Password**: Tidak pernah meminta atau menyimpan password Google pengguna.
2. **Enkripsi Kredensial at-rest (AES-256-GCM)**: `access_token` dan `refresh_token` disimpan dalam format ciphertext `v1.<iv>.<tag>.<ciphertext>` dengan key terisolasi.
3. **Anti-CSRF OAuth Flow**: State cookie menggunakan nonce bertanda waktu dengan flag `httpOnly: true`, `sameSite: 'lax'`, dan divalidasi ketat pada callback.
4. **Isolasi Data Pengguna Ketat**: Seluruh query dan mutasi data database selalu terikat pada `user_id = currentUser.id`.
5. **Shared Folder Permission Isolation**: Hak akses `writer` hanya diberikan kepada akun pool yang terdaftar di bawah user yang sama.
6. **Distributed Rate Limiting (PostgreSQL)**:
   - Endpoint upload dibatasi maksimal **10 permintaan/menit/user**.
   - Endpoint mutasi dibatasi maksimal **30 permintaan/menit/user**.
   - Bekerja secara konsisten pada lingkungan multi-instance server.
7. **Pembersihan Log**: Tidak ada token, rahasia, atau kredensial yang dicetak pada console log atau tersimpan pada tabel `activity_logs`.

---

## 🎯 Acceptance Criteria Phase 4 (PRD §15)

Seluruh 14 kriteria penerimaan Shared Virtual Drive telah selesai dan terverifikasi secara end-to-end:

- [x] **1. User login ke aplikasi**: Autentikasi aman melalui Better Auth dengan email & password.
- [x] **2. Setup wizard**: Memilih primary account dan membuat folder root terpadu di Google Drive.
- [x] **3. Tambah 2+ pool accounts**: Pengguna dapat menghubungkan beberapa akun pool secara bertahap.
- [x] **4. Auto-share folder root ke pool accounts**: Hak akses Editor folder root otomatis dibagikan ke akun pool dan dicatat di `shared_permissions`.
- [x] **5. Tampilan "My Drive" menunjukkan isi folder root**: File browser menampilkan isi folder root secara terpusat tanpa membedakan kepemilikan akun secara kasat mata.
- [x] **6. Buat subfolder lewat app**: Subfolder baru selalu dibuat menggunakan akun utama untuk menjamin hierarki dan izin pewarisan.
- [x] **7. Upload file otomatis**: Algoritma `selectAccount` memilih akun yang memiliki sisa kuota terbesar yang muat menampung berkas.
- [x] **8. File muncul di folder yang sedang dibuka**: Berkas ter-upload tepat pada folder aktif pengguna (root maupun subfolder).
- [x] **9. Navigasi folder & breadcrumb**: Navigasi klik folder, breadcrumb interaktif, dan kembali ke direktori induk berfungsi mulus.
- [x] **10. Download, delete, rename, move, copy**: Berkas dapat diunduh, dihapus, diganti nama, dipindahkan, dan disalin dengan resolved owner account otomatis.
- [x] **11. Search scoped ke shared root**: Pencarian berkas mencari secara mendalam di dalam struktur folder shared virtual drive.
- [x] **12. Storage bar total pool capacity**: Bar penyimpanan di sidebar dan storage overview menampilkan kapasitas gabungan seluruh akun pool.
- [x] **13. Disconnect pool account**: Pemutusan akun mencabut izin Google Drive dari folder root dan membersihkan baris permission.
- [x] **14. Worker: integrity check, heartbeat, sync**: Worker memantau folder root, melakukan auto-repair permission yang terputus, dan melaporkan status heartbeat real-time ke UI badge.
