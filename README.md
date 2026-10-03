# GDrive Multi-Account Manager

Aplikasi web modern berbasis Next.js App Router untuk mengelola beberapa akun Google Drive dalam satu dashboard terpadu. Pengguna dapat menghubungkan banyak akun Google, memantau penggunaan kuota agregat maupun per akun, mencari dan menelusuri file lintas akun, mengunggah file dengan seleksi akun manual, mengunduh file biner maupun mengekspor Google Docs native, membuat folder, serta menghapus file tanpa perlu berpindah-pindah tab browser Google Drive.

---

## Fitur Utama (MVP)

- **Otentikasi Pengguna**: Login dan pendaftaran mandiri aman menggunakan Better Auth (email & password).
- **Multi-Akun Google Drive**: Koneksi multi-akun Google Drive via Google OAuth 2.0 dengan penanganan refresh token otomatis.
- **Enkripsi Kredensial**: Access token dan refresh token disimpan terenkripsi dengan algoritma AES-256-GCM at-rest di database.
- **Dashboard Penyimpanan Agregat**: Kartu ringkasan total storage, ruang terpakai, ruang tersisa, jumlah akun, dan baris visualisasi per akun.
- **File Manager Lintas Akun**: Menampilkan file dari semua akun terhubung dalam satu tabel interaktif (sort, filter jenis file, filter akun, pencarian global).
- **Upload Streaming Resumable**: Unggah file langsung ke Google Drive API dengan progress bar dan validasi kuota sebelum upload.
- **Download & Ekspor Fleksibel**: Unduh file biner langsung dari Drive, serta ekspor file Google Docs / Sheets / Slides native ke format PDF/Office.
- **Folder Management & Deletion**: Pembuatan folder baru pada akun target dan penghapusan file permanen dengan konfirmasi dialog.
- **Health Status & Pemulihan Akun**: Indikator status akun (`Connected`, `Reconnect Required`, `Error`), penanganan `invalid_grant`, dan tombol Reconnect langsung.
- **Keamanan Ketat & Rate Limiting**: Proteksi endpoint mutasi (30 req/menit) dan upload (10 req/menit), isolasi data pengguna berbasis ID sesi (`user_id`).

---

## Prasyarat Sistem

- **Node.js**: Versi 20.x atau lebih baru
- **Package Manager**: `pnpm` (disarankan v9/v10)
- **Docker & Docker Compose**: Untuk menjalankan instance PostgreSQL 16
- **Google Cloud Console**: Proyek Google Cloud dengan Google Drive API diaktifkan dan kredensial OAuth 2.0 Web Application

---

## Panduan Setup Step-by-Step

### 1. Kloning dan Masuk ke Repositori

```bash
git clone <repository-url>
cd gdrive-drive
```

### 2. Jalankan Database PostgreSQL (Docker)

```bash
docker compose up -d
```

Pastikan container PostgreSQL berjalan sehat di port `5432`:
```bash
docker compose ps
```

### 3. Konfigurasi Environment Variables

Salin template berkas `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Hasilkan kunci enkripsi rahasia:
```bash
openssl rand -base64 32   # Masukkan ke TOKEN_ENCRYPTION_KEY
openssl rand -base64 32   # Masukkan ke BETTER_AUTH_SECRET
```

Isi variabel environment di dalam `.env`:
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

### 4. Instalasi Dependensi

```bash
pnpm install
```

### 5. Migrasi Database Drizzle

Terapkan skema database ke PostgreSQL:
```bash
pnpm db:migrate
```

### 6. Jalankan Server Development

```bash
pnpm dev
```

Buka peramban di `http://localhost:3000`.

### 7. Jalankan Background Worker (Sync, Health Check, Indexing)

Worker berjalan sebagai proses terpisah yang melakukan sinkronisasi kuota (setiap 10 menit), pemantauan kesehatan koneksi akun (setiap 30 menit), dan pembaruan indeks cache `drive_files` (setiap 60 menit).

- **Development / Lokal:**
  ```bash
  pnpm worker
  ```
  *(Tambahkan argumen `--once` untuk menjalankan satu putaran sinkronisasi lalu keluar: `pnpm worker --once`)*

- **Docker Compose:**
  ```bash
  docker compose up -d worker
  ```

- **VPS Produksi:**
  Di lingkungan VPS produksi, lebih direkomendasikan menjalankan worker via systemd atau PM2:
  ```bash
  pm2 start "pnpm worker" --name gdrive-worker
  ```

---

## Konfigurasi Google OAuth 2.0

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru atau pilih proyek yang sudah ada.
3. Masuk ke menu **APIs & Services > Library**, cari **Google Drive API**, lalu klik **Enable**.
4. Masuk ke **APIs & Services > OAuth consent screen**:
   - Pilih jenis pengguna **External**.
   - Isi informasi aplikasi (nama aplikasi, email dukungan).
   - Pada bagian **Test users**, tambahkan alamat email Google yang akan dihubungkan saat pengujian (wajib selama status aplikasi masih *Testing*).
5. Masuk ke **APIs & Services > Credentials**:
   - Klik **Create Credentials > OAuth client ID**.
   - Pilih Application type: **Web application**.
   - Tambahkan Authorized redirect URI:
     `http://localhost:3000/api/google/callback`
   - Simpan, lalu salin **Client ID** dan **Client Secret** ke file `.env`.
   - Restart server dev (`pnpm dev`) setelah memperbarui `.env`.

---

## Daftar Skrip npm / pnpm

| Skrip | Deskripsi |
| --- | --- |
| `pnpm dev` | Menjalankan Next.js development server (Turbopack) |
| `pnpm build` | Membangun build produksi Next.js |
| `pnpm start` | Menjalankan server build produksi |
| `pnpm lint` | Menjalankan ESLint pada seluruh codebase |
| `pnpm typecheck` | Menjalankan TypeScript type check tanpa emit (`tsc --noEmit`) |
| `pnpm test` | Menjalankan unit test dengan Vitest |
| `pnpm format` | Memformat kode menggunakan Prettier |
| `pnpm format:check` | Memvalidasi kepatuhan format Prettier tanpa modifikasi |
| `pnpm db:generate` | Menghasilkan berkas migrasi SQL baru dari skema Drizzle |
| `pnpm db:migrate` | Menerapkan migrasi database ke PostgreSQL |

---

## Struktur Folder Proyek

```text
src/
├── app/
│   ├── (auth)/sign-in/page.tsx       # Halaman Masuk
│   ├── (auth)/sign-up/page.tsx       # Halaman Pendaftaran
│   ├── dashboard/
│   │   ├── layout.tsx                # Guard sesi & shell navigasi
│   │   ├── page.tsx                  # Dashboard ringkasan penyimpanan
│   │   ├── error.tsx                 # Error boundary dashboard
│   │   ├── files/page.tsx            # File manager lintas akun
│   │   ├── accounts/page.tsx         # Manajemen akun Google & sinkronisasi
│   │   ├── activity/page.tsx         # Riwayat aktivitas
│   │   └── settings/page.tsx         # Pengaturan profil pengguna
│   ├── error.tsx                     # Error boundary global aplikasi
│   └── api/
│       ├── auth/[...all]/route.ts    # Handler otentikasi Better Auth
│       ├── google/connect/route.ts   # Inisiasi OAuth Google
│       ├── google/callback/route.ts  # Pertukaran kode OAuth & callback
│       ├── accounts/route.ts         # Daftar akun Google milik pengguna
│       ├── accounts/[id]/route.ts    # Hapus/putuskan akun Google
│       ├── accounts/refresh/route.ts # Sinkronisasi kuota seluruh akun
│       ├── accounts/[id]/storage/    # Riwayat snapshot kuota akun
│       ├── storage/route.ts          # Agregasi total kuota storage
│       ├── files/route.ts            # Daftar & pencarian file lintas akun
│       ├── files/upload/route.ts     # Upload file streaming & resumable
│       ├── files/[id]/route.ts       # Hapus file dari Drive
│       ├── files/[id]/download/      # Unduh/ekspor file dari Drive
│       ├── folders/route.ts          # Buat folder baru di Drive
│       └── activity/route.ts         # Baca riwayat log aktivitas
├── components/
│   ├── layout/                       # Sidebar, Header, UserMenu, MobileNav
│   ├── dashboard/                    # StorageOverview, AccountList, RecentFiles, dll.
│   ├── accounts/                     # AccountsTable, AddAccountButton
│   ├── files/                        # FilesTable, FilesFilters, FileActions
│   ├── upload/                       # UploadDialog, UploadButton
│   └── ui/                           # Primitif shadcn / Base UI
├── lib/
│   ├── encryption.ts                 # Enkripsi & dekripsi AES-256-GCM
│   ├── rate-limit.ts                 # Pembatas laju permintaan in-memory
│   ├── http.ts                       # Helper withAuth(), ok(), errorResponse()
│   ├── errors.ts                     # Definisi AppError & ApiErrorCode
│   ├── quota.ts                      # Sinkronisasi & snapshot kuota
│   ├── activity.ts                   # Pencatatan log aktivitas sistem
│   ├── google/                       # OAuth, token management, error mapping, health check
│   └── google-drive/                 # GoogleDriveService, query builder, file indexer
├── db/
│   ├── schema/                       # Skema tabel Drizzle ORM
│   └── index.ts                      # Koneksi database Postgres
├── worker/
│   └── index.ts                      # Background worker (quota sync, health check, indexer)
└── types/                            # Antarmuka DTO bersama
```

---

## Catatan Keamanan & Hasil Audit Keamanan

Sesuai dengan ketentuan **PRD §9 (Security)** dan **Global Constraints §2.5**, aplikasi ini menerapkan langkah-langkah keamanan berikut:

1. **Enkripsi Kredensial at-rest (AES-256-GCM)**: Seluruh `access_token` dan `refresh_token` disimpan dalam format ciphertext `v1.<iv>.<tag>.<ciphertext>` dengan key terisolasi di environment. Password Google tidak pernah diminta maupun disimpan.
2. **Kerahasiaan Berkas Environment**: Berkas `.env` dipastikan masuk dalam `.gitignore` dan diabaikan oleh Git.
3. **Otorisasi Ketat Berbasis Pengguna**: Seluruh query dan mutasi data akun/file selalu difilter berdasarkan `user_id = currentUser.id`. Tidak ada kebocoran data antar-pengguna aplikasi.
4. **Proteksi Route Terpadu**: Semua route API internal (kecuali endpoint publik autentikasi dan callback OAuth) diwajibkan menggunakan middleware `withAuth`.
5. **Kebersihan Log**: Tidak ada token OAuth, kunci enkripsi, atau data sensitif yang dicetak ke konsol (`console.log`) maupun database `activity_logs`.
6. **Proteksi Laju Permintaan (Rate Limiting)**:
   - Endpoint upload (`POST /api/files/upload`) dibatasi maksimal 10 permintaan/menit/pengguna.
   - Endpoint mutasi (`POST /api/folders`, `DELETE /api/files/[id]`, `DELETE /api/accounts/[id]`, `POST /api/accounts/refresh`) dibatasi maksimal 30 permintaan/menit/pengguna.

### Hasil Verifikasi Audit Keamanan

```text
[PASS] 1. Token terenkripsi di PostgreSQL (semua bernilai v1.%)
[PASS] 2. Berkas .env diabaikan oleh Git (status: ignored)
[PASS] 3. Route API non-auth seluruhnya terlindungi withAuth
[PASS] 4. Bebas pencatatan kredensial/token pada konsol/log
[PASS] 5. Seluruh query database domain terfilter scoped user_id
[PASS] 6. Rate limiter aktif pada upload (10/min) dan mutasi (30/min)
```

---

## Acceptance Criteria MVP (PRD §14)

Semua kriteria penerimaan MVP telah selesai diimplementasikan, diverifikasi secara menyeluruh, dan berfungsi dengan baik:

- [x] **1. Login ke aplikasi**: Pengguna dapat mendaftar dan masuk menggunakan akun email/password melalui Better Auth.
- [x] **2. Connect Google Account A**: Pengguna dapat menghubungkan akun Google pertama via OAuth 2.0 consent flow.
- [x] **3. Connect Google Account B**: Pengguna dapat menghubungkan akun Google kedua secara independen.
- [x] **4. Melihat quota keduanya**: Halaman Accounts dan Dashboard menampilkan kuota terpakai, kuota bebas, dan total masing-masing akun.
- [x] **5. Melihat file Account A & B**: Halaman Files menampilkan agregasi berkas dari semua akun terhubung dalam satu daftar.
- [x] **6. Upload file**: Pengguna dapat memilih dan mengunggah berkas dengan pemantauan progress.
- [x] **7. Memilih account tujuan**: Modal upload menampilkan daftar akun dengan informasi sisa kuota untuk penempatan file.
- [x] **8. Download file**: Pengguna dapat mengunduh berkas biner asli maupun berkas Google Docs native (diekspor otomatis ke PDF/Office).
- [x] **9. Delete file**: Pengguna dapat menghapus berkas permanen dari Drive melalui antarmuka dengan dialog konfirmasi.
- [x] **10. Disconnect account**: Pengguna dapat mencabut otorisasi dan memutuskan akun Google dari aplikasi kapan saja.
- [x] **Bonus**:
  - Dashboard penyimpanan terpadu (Total / Used / Free / Accounts)
  - Pencarian global lintas akun dari header bar
  - Pembuatan folder baru di Google Drive
  - Pemulihan status kesehatan akun (badge & tombol Reconnect)
  - Pembatasan laju permintaan (Rate Limiting) aktif pada seluruh mutasi
