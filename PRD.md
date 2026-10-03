# PRD — GDrive Shared Virtual Drive

| | |
|---|---|
| **Versi** | 2.0 |
| **Platform** | Web |
| **Status** | Phase 4 — Shared Virtual Drive |
| **Target** | Personal / authorized multi-account Google Drive management |

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Problem](#2-problem)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [Target User](#4-target-user)
5. [Konsep Arsitektur: Shared Virtual Drive](#5-konsep-arsitektur-shared-virtual-drive)
6. [Fitur Utama](#6-fitur-utama)
7. [Upload & Pemilihan Akun](#7-upload--pemilihan-akun)
8. [Statistik](#8-statistik)
9. [Technical Specification](#9-technical-specification)
10. [Security](#10-security)
11. [Reliability](#11-reliability)
12. [UI Design](#12-ui-design)
13. [Scope: MVP, Phase 2, Phase 3, Phase 4](#13-scope-mvp-phase-2-phase-3-phase-4)
14. [Development Roadmap](#14-development-roadmap)
15. [Acceptance Criteria](#15-acceptance-criteria)
16. [Catatan Strategi](#16-catatan-strategi)

---

## 1. Overview

**GDrive Shared Virtual Drive** adalah aplikasi web yang menggabungkan storage dari banyak akun Google Drive (hingga 100 akun) ke dalam **satu folder virtual terpadu** — layaknya satu Google Drive raksasa.

Satu akun dipilih sebagai **akun utama (primary account)** yang memiliki folder root. Seluruh akun lainnya di-share/diberi permission ke folder root tersebut. Ketika upload, file dikirim ke folder root oleh akun yang quota-nya paling cukup — sehingga storage terdistribusi secara otomatis.

```text
             GDrive Shared Virtual Drive
                       │
                  ┌────┴────┐
                  │  Root   │  ← Owned by Primary Account
                  │ Folder  │
                  └────┬────┘
         ┌─────────────┼─────────────┐
         │             │             │
   📁 Projects    📁 Photos     📄 file.zip
   (owner:primary) (owner:primary) (owner: akun #37, quota cukup)
         │
    ┌────┴────┐
📄 a.pdf   📄 b.mp4
(akun #12) (akun #85)
         │
         ▼
    100 akun Google, semua punya akses
    ke folder root (inherited permission)
```

Tampilan aplikasi menyerupai **Google Drive asli**: navigasi folder, breadcrumb, sidebar, grid/list view.

> Aplikasi hanya digunakan untuk akun yang pengguna miliki atau berwenang untuk mengaksesnya, dan tidak ditujukan untuk menghindari pembatasan atau kebijakan Google.

---

## 2. Problem

Saat memiliki beberapa akun Google Drive, pengguna harus:

1. Login ke akun berbeda.
2. Membuka Drive masing-masing.
3. Mengecek kapasitas secara manual.
4. Mengingat file berada di akun mana.
5. Memindahkan atau mengunggah file secara manual.
6. Membuka banyak tab/browser.

Contoh:

```text
akun1@gmail.com → 14.8 GB / 15 GB
akun2@gmail.com →  7.2 GB / 15 GB
akun3@gmail.com →  2.1 GB / 15 GB
...
akun100@gmail.com → 0.5 GB / 15 GB
─────────────────────────────────────
Total pool       → ~1.5 TB
```

Pengguna ingin melihat semuanya sebagai **satu drive tunggal** — tanpa perlu tahu file ada di akun mana.

---

## 3. Goals & Non-Goals

### 3.1 Primary Goals

- Menyatukan storage dari hingga 100 akun Google Drive ke dalam **satu folder structure**.
- Satu **akun utama** menjadi pemilik folder root dan semua subfolder.
- Upload file secara otomatis ke akun yang quota-nya cukup.
- Tampilan menyerupai Google Drive: navigasi folder, breadcrumb, file browser.
- Menampilkan total kapasitas gabungan sebagai satu pool.
- Operasi file dasar: upload, download, delete, rename, move, copy.
- Pembuatan folder (owner selalu akun utama).

### 3.2 Secondary Goals

- Statistik penggunaan storage per akun dan total.
- Activity log.
- Monitoring kesehatan koneksi akun.
- Storage balancing (migrasi file antar akun).
- Background sync.

### 3.3 Non-Goals

Aplikasi **tidak** bertujuan:

- Membuat Google Drive baru.
- Mengubah quota resmi Google atau membypass limit Google Drive.
- Mengakses akun tanpa izin.
- Mengotomatisasi pembuatan akun Google.
- Menghapus akun Google.
- Menyediakan storage fisik sendiri.
- File splitting (memecah satu file ke beberapa akun).

---

## 4. Target User

**Persona: Personal Power User**

> Developer yang memiliki beberapa akun Google dan ingin mengelola file dari seluruh akun melalui satu interface, seolah-olah memiliki satu drive raksasa.

**Alur penggunaan:**

```text
User
 ↓
Login ke GDrive Manager
 ↓
Setup Wizard (pertama kali)
 ↓
Pilih/tambah Primary Account (akun utama)
 ↓
App membuat folder root di Drive akun utama
 ↓
Tambah akun-akun lain (pool accounts)
 ↓
App otomatis share folder root ke akun-akun tersebut
 ↓
Tampilan "My Drive" — folder root & isinya
 ↓
User upload file → app pilih akun paling lapang
 ↓
File muncul di folder root (terlihat dari semua akun)
```

---

## 5. Konsep Arsitektur: Shared Virtual Drive

### 5.1 Folder Root (Shared Root)

- **Folder root** adalah satu folder Google Drive biasa, dibuat di akun utama.
- Nama default: `GDrive Pool` (atau konfigurabel oleh user).
- Folder ini menjadi "My Drive" di tampilan aplikasi.
- Semua akun lain diberi permission **Editor** ke folder root.
- Permission **inherited**: subfolder di dalamnya otomatis bisa diakses semua akun.

### 5.2 Akun Utama (Primary Account)

- Dipilih oleh user saat setup pertama kali.
- Menjadi **owner** folder root dan **semua subfolder** yang dibuat lewat app.
- Folder root berada di My Drive akun utama di Google Drive asli.
- Bisa diganti nanti (dengan proses transfer ownership).

### 5.3 Pool Accounts (Akun Kontributor)

- Semua akun yang terhubung (termasuk akun utama) berkontribusi storage.
- Ketika upload file, file di-upload menggunakan access token akun yang dipilih (berdasarkan quota), ke dalam folder root (atau subfolder) milik akun utama.
- **Quota yang terpakai = quota akun uploader** (sesuai perilaku Google Drive API — uploader menanggung quota, bukan folder owner).
- Semua akun sudah punya akses ke folder root (shared permission), sehingga file yang di-upload terlihat oleh semua akun.

### 5.4 Mekanisme Upload ke Shared Folder

```text
User klik Upload → pilih file → app memilih Akun #37 (quota cukup)
 ↓
App menggunakan access token Akun #37
 ↓
Upload file ke folder root (parent = folder root ID)
 ↓
Google Drive API menghitung quota ke Akun #37 (uploader)
 ↓
File muncul di shared folder → terlihat oleh semua 100 akun
```

Karena Akun #37 punya permission Editor ke folder root, upload ke folder tersebut diizinkan oleh Google Drive API.

### 5.5 Pembuatan Folder

- Semua folder dibuat **oleh akun utama** (menggunakan token akun utama).
- Folder secara otomatis mewarisi permission dari parent (folder root).
- User di app melihat folder structure seperti Google Drive biasa:

```text
📁 My Drive (root)
├── 📁 Documents
│   ├── 📄 invoice.pdf        ← owner: akun #12
│   └── 📄 report.docx        ← owner: akun #5
├── 📁 Photos
│   ├── 📄 vacation.jpg       ← owner: akun #88
│   └── 📄 family.png         ← owner: akun #3
├── 📁 Videos
│   └── 📄 recording.mp4      ← owner: akun #45
└── 📄 backup.zip             ← owner: akun #71
```

### 5.6 Visibility & Permission Flow

```text
┌─────────────────────────────────────────────────┐
│  Primary Account (Akun Utama)                   │
│  ├── Owner folder root "GDrive Pool"            │
│  ├── Owner semua subfolder                      │
│  └── Bisa lihat & kelola semua isi              │
├─────────────────────────────────────────────────┤
│  Pool Account #1..#99                           │
│  ├── Editor access ke folder root (shared)      │
│  ├── Inherited access ke semua subfolder        │
│  ├── Bisa upload file ke folder root/subfolder  │
│  └── Bisa lihat semua file di folder root       │
└─────────────────────────────────────────────────┘
```

---

## 6. Fitur Utama

### 6.1 Authentication

User login ke aplikasi menggunakan Better Auth (email + password).

User memiliki akun aplikasi sendiri (terpisah dari akun Google).

### 6.2 Setup Wizard (Pertama Kali)

Saat user login pertama kali dan belum ada akun utama:

```text
Step 1: Connect Primary Account
        "Hubungkan akun Google utama Anda"
        [Connect Google Account]

Step 2: Create Shared Root Folder
        "Folder root akan dibuat di Drive akun utama"
        Nama folder: [GDrive Pool]
        [Create & Continue]

Step 3: Add More Accounts
        "Tambahkan akun Google lain untuk memperluas storage"
        [+ Add Account] (bisa skip, tambah nanti)

Step 4: Done!
        "Shared Drive Anda siap digunakan"
        Total Storage: 15 GB (1 akun)
        [Go to My Drive]
```

### 6.3 My Drive (File Browser)

**Halaman utama:** `/dashboard` atau `/dashboard/files`

Tampilan menyerupai Google Drive:

```text
┌─────────────────────────────────────────────────┐
│ ☁ GDrive Pool                    🔍 Search...   │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ My Drive │  📁 My Drive                         │
│          │                                      │
│ Recent   │  Name          Size      Modified    │
│          │  ─────────────────────────────────    │
│ Accounts │  📁 Documents   —        Today       │
│          │  📁 Photos      —        Yesterday   │
│ Storage  │  📁 Videos      —        Oct 1       │
│          │  📄 backup.zip  2.4 GB   Today       │
│ Activity │  📄 notes.txt   12 KB    Sep 30      │
│          │                                      │
│ Settings │                                      │
│          │  ─────────────────────────────────    │
│          │  Storage: 243 GB / 1.46 TB            │
│          │  ████████░░░░░░░░░░░  16%             │
└──────────┴──────────────────────────────────────┘
```

**Navigasi folder:**

- Klik folder → masuk ke dalam folder, breadcrumb berubah.
- Breadcrumb: `My Drive > Documents > Reports`
- Klik item breadcrumb → navigasi ke folder tersebut.
- Tombol back → kembali ke parent folder.

### 6.4 Google Drive Account Management

**Halaman:** `/dashboard/accounts`

```text
Accounts

Primary Account ⭐
┌──────────────────────────────────────────────────┐
│ primary@gmail.com         15 GB    Connected  🟢 │
│ Role: Primary (folder owner)                     │
│ Root Folder: GDrive Pool                         │
└──────────────────────────────────────────────────┘

Pool Accounts (99)
┌──────────────────────────────────────────────────┐
│ Account               Used      Free    Status   │
├──────────────────────────────────────────────────┤
│ account1@gmail.com    10.2 GB   4.8 GB  🟢      │
│ account2@gmail.com     7.4 GB   7.6 GB  🟢      │
│ account3@gmail.com    14.1 GB   0.9 GB  🟡      │
│ ...                                              │
└──────────────────────────────────────────────────┘

[+ Add Account]  [Refresh All]
```

**Actions:** `+ Add Account` · `Refresh` · `Disconnect` · `Set as Primary`

### 6.5 Add Account Flow

```text
Klik "+ Add Account"
        ↓
Google OAuth
        ↓
User memilih akun
        ↓
Grant permission (scope: drive)
        ↓
Callback
        ↓
Backend mendapatkan token
        ↓
Encrypt token
        ↓
Simpan account (role: pool)
        ↓
Share folder root ke akun baru (Editor permission)
        ↓
Sync quota
        ↓
Dashboard
```

> **Penting:** refresh token harus dienkripsi sebelum disimpan. Jangan simpan sebagai plain text.

### 6.6 Folder Management

User dapat: Create Folder, Rename Folder, Delete Folder, Move Folder.

```text
My Drive
├── Documents
│   ├── Reports
│   └── Invoices
├── Photos
│   ├── 2024
│   └── 2025
├── Videos
└── Projects
```

Semua folder dibuat oleh **akun utama** (sebagai owner).

Folder tetap merupakan folder Google Drive biasa di shared root.

### 6.7 Global Search

Backend mencari file di dalam **shared root folder** (bukan seluruh Drive).

```text
Search: invoice

📄 invoice-january.pdf     Documents/Invoices
📄 invoice-february.pdf    Documents/Invoices
📄 invoice-march.pdf       Documents/Reports
```

Karena semua file berada di satu folder structure, search cukup dilakukan dari perspektif satu akun (akun utama) yang bisa melihat semua file.

---

## 7. Upload & Pemilihan Akun

### 7.1 Alur Upload

```text
Select files → App otomatis pilih akun → Upload ke shared folder
```

Mode utama: **Automatic** (selalu).

Upload ke folder yang sedang dibuka user di file browser (atau root jika di top level).

```text
File: video.zip (8 GB)

Akun 1 — Free: 1.2 GB   ❌
Akun 2 — Free: 10.3 GB  ✅
Akun 37 — Free: 12.1 GB ✅ (terbesar)

→ Upload menggunakan token Akun 37
→ File di-upload ke shared folder saat ini
→ Quota Akun 37 berkurang 8 GB
```

User juga bisa memilih akun secara manual jika diinginkan (advanced option).

### 7.2 Upload Strategy

Single-account upload: satu file utuh ke satu akun.

```text
video.mp4 = 8 GB

Akun 1 = 3 GB free
Akun 2 = 10 GB free
Akun 37 = 12 GB free

→ Akun 37 (sisa ruang terbesar yang muat)
```

**Future (bukan scope saat ini):** file splitting ke beberapa akun.

### 7.3 Automatic Account Selection

```ts
function selectAccount(fileSize, accounts) {
  return accounts
    .filter(account => account.freeSpace >= fileSize)
    .sort((a, b) => b.freeSpace - a.freeSpace)
    .at(0)
}
```

### 7.4 Sync Quota

Saat upload:

1. Refresh quota semua akun (atau setidaknya kandidat)
2. Pilih akun terbaik
3. Upload
4. Refresh quota akun yang dipakai

### 7.5 Upload Target Folder

File selalu di-upload ke **folder yang sedang dibuka** di file browser:

- Jika user di `My Drive` → upload ke root folder
- Jika user di `My Drive > Documents` → upload ke folder Documents

Parent folder ID dikirimkan sebagai metadata upload ke Google Drive API.

---

## 8. Statistik

**Storage (pool):**

```text
Total Pool Storage     1.46 TB
Used                   243 GB
Free                   1.21 TB
Accounts               100
```

**Per akun:**

```text
Account                Used      Total     Usage
primary@gmail.com      12.4 GB   15 GB     83%  ████████░░
account1@gmail.com      5.2 GB   15 GB     35%  ████░░░░░░
account2@gmail.com     14.1 GB   15 GB     94%  █████████░
...
```

**File:**

```text
Total Files
Documents     1,240
Images        8,432
Videos          532
Archives        123
Others          321
```

---

## 9. Technical Specification

### 9.1 Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router) |
| Language | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Server | Next.js |
| Database | PostgreSQL |
| ORM | Drizzle |
| Data fetching | TanStack Query, TanStack Table |
| Auth | Better Auth (email + password) |
| Storage | Google Drive (via Google Drive API v3) |
| Deployment | VPS |
| Encryption | AES-256-GCM |

### 9.2 Arsitektur

```text
Frontend (File Browser UI mirip GDrive)
   │
   ↓
Next.js API Routes
   │
   ├── Auth (Better Auth)
   ├── Setup Service (create root, share permissions)
   ├── File Browser Service (list files in shared folder)
   ├── Upload Service (select account → upload to shared folder)
   └── Google Drive Service
              │
              ↓
       Google Drive API v3
              │
       ┌──────┼──────┐
       │      │      │
   Akun 1  Akun 2  Akun N
   (pool)  (pool)  (pool)
```

### 9.3 Database Schema

**users** (Better Auth)

```text
id, email, name, created_at, updated_at
```

**google_accounts** (diperluas)

```text
id, user_id, google_account_id, email, name,
access_token, refresh_token_encrypted, token_expires_at,
status, role, created_at, updated_at
```

Kolom baru:
- `role`: `'primary' | 'pool'` — menandai akun utama vs akun pool.

**shared_roots** (baru)

```text
id, user_id, primary_account_id, drive_folder_id, folder_name, created_at
```

Tabel ini menyimpan informasi folder root yang dibuat di akun utama.
- `drive_folder_id`: ID folder Google Drive yang menjadi root.
- `folder_name`: Nama folder (default: "GDrive Pool").
- `primary_account_id`: FK ke `google_accounts.id`.

**shared_permissions** (baru)

```text
id, shared_root_id, google_account_id, drive_permission_id, status, created_at
```

Melacak permission yang sudah di-share ke akun pool.
- `drive_permission_id`: ID permission dari Google Drive API.
- `status`: `'active' | 'pending' | 'revoked'`.

**storage_snapshots**

```text
id, google_account_id, total_bytes, used_bytes, free_bytes, created_at
```

**upload_jobs**

```text
id, user_id, google_account_id, filename, file_size,
status, error_message, drive_file_id, parent_folder_id,
resumable_uri, uploaded_bytes,
created_at, completed_at
```

Kolom baru:
- `parent_folder_id`: ID folder tujuan upload (shared root atau subfolder).

**activity_logs**

```text
id, user_id, google_account_id, action, file_id, metadata, created_at
```

**drive_files** (index cache)

```text
id, google_account_id, drive_file_id, name, mime_type, kind,
size_bytes, modified_at, parent_id, indexed_at
```

> `parent_id` merujuk ke Drive folder ID (bukan internal DB id).

**Relasi**

```text
User
 │
 ├── SharedRoot
 │      ├── primary_account → GoogleAccount
 │      └── SharedPermission → GoogleAccount (pool)
 │
 ├── GoogleAccount (role: primary | pool)
 │      ├── StorageSnapshot
 │      ├── UploadJob
 │      └── ActivityLog
 │
 └── ActivityLog
```

### 9.4 API Endpoints

```text
# Accounts
GET    /api/accounts
POST   /api/accounts/connect
DELETE /api/accounts/:id
POST   /api/accounts/refresh
GET    /api/accounts/:id/storage

# Setup / Shared Root
POST   /api/setup/init              # setup wizard: create root folder, share
GET    /api/setup/status             # check if setup is done
POST   /api/setup/share/:accountId   # share root to new account

# Storage
GET    /api/storage

# Files (scoped to shared root)
GET    /api/files                    # list files in folder (default: root)
POST   /api/files/upload             # upload to current folder
DELETE /api/files/:id
PATCH  /api/files/:id                # rename, move
GET    /api/files/:id/download
POST   /api/files/:id/copy

# Upload (chunked)
POST   /api/files/upload/session     # init resumable
POST   /api/files/upload/chunk       # send chunk
GET    /api/files/upload/session/:id/status

# Folders
GET    /api/folders                  # list subfolders
POST   /api/folders                  # create folder (always primary account)
PATCH  /api/folders/:id
DELETE /api/folders/:id

# Bulk operations
POST   /api/files/bulk-delete
POST   /api/files/bulk-move

# Activity & Stats
GET    /api/activity
GET    /api/stats

# Worker
GET    /api/worker/health
```

### 9.5 Google Drive Service

```ts
class GoogleDriveService {
  // Existing
  getStorageQuota()
  listFiles(options)
  uploadFile(options)
  downloadFile(fileId, mimeType)
  deleteFile(fileId)
  createFolder(name, parentId)
  moveFile(fileId, params)
  renameFile(fileId, newName)
  copyFile(fileId, newName)

  // New for Shared Virtual Drive
  createSharedRootFolder(name)           // Buat folder root
  shareFolder(folderId, email, role)     // Share folder ke email
  revokePermission(folderId, permId)     // Cabut share
  listFilesInFolder(folderId, options)   // List files dalam folder tertentu
  getFile(fileId)                        // Get metadata file
}
```

### 9.6 Struktur Frontend

```text
src/
├── app/
│   ├── (auth)/sign-in/page.tsx
│   ├── (auth)/sign-up/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx            # guard session + shell (sidebar/header)
│   │   ├── page.tsx              # File Browser (My Drive) — halaman utama
│   │   ├── files/page.tsx        # alias / redirect ke page.tsx
│   │   ├── accounts/page.tsx
│   │   ├── activity/page.tsx
│   │   ├── stats/page.tsx
│   │   ├── settings/page.tsx
│   │   └── setup/page.tsx        # Setup wizard (pertama kali)
│   └── api/
│       ├── auth/[...all]/route.ts
│       ├── google/connect/route.ts
│       ├── google/callback/route.ts
│       ├── setup/
│       │   ├── init/route.ts
│       │   ├── status/route.ts
│       │   └── share/[accountId]/route.ts
│       ├── accounts/...
│       ├── storage/route.ts
│       ├── files/...
│       ├── folders/...
│       ├── activity/route.ts
│       ├── stats/route.ts
│       └── worker/health/route.ts
│
├── components/
│   ├── layout/ (sidebar.tsx, header.tsx, user-menu.tsx)
│   ├── file-browser/ (file-browser.tsx, breadcrumb.tsx, folder-tree.tsx)
│   ├── dashboard/ (storage-overview.tsx)
│   ├── accounts/ (accounts-table.tsx, add-account-button.tsx)
│   ├── files/ (files-table.tsx, file-actions.tsx, ...)
│   ├── upload/ (upload-dialog.tsx, upload-dropzone.tsx, upload-queue-drawer.tsx)
│   ├── setup/ (setup-wizard.tsx)
│   ├── activity/ (activity-table.tsx)
│   ├── stats/ (stats-cards.tsx, stats-charts.tsx)
│   └── ui/ (shadcn)
│
├── lib/
│   ├── auth.ts
│   ├── auth-client.ts
│   ├── auth-session.ts
│   ├── http.ts
│   ├── errors.ts
│   ├── encryption.ts
│   ├── rate-limit.ts
│   ├── activity.ts
│   ├── format.ts
│   ├── api-client.ts
│   ├── env.ts
│   ├── google/ (oauth.ts, tokens.ts, errors.ts)
│   ├── google-drive/ (service.ts, query.ts, types.ts)
│   ├── shared-drive/ (setup.ts, permissions.ts)   # Baru
│   ├── files/ (mime.ts, merge.ts, move-params.ts)
│   ├── upload/ (select-account.ts, upload-queue.ts, chunked-uploader.ts)
│   └── storage/ (balancing.ts)
│
├── db/
│   ├── schema/ (auth.ts, google-accounts.ts, shared-roots.ts, shared-permissions.ts,
│   │            storage-snapshots.ts, upload-jobs.ts, activity-logs.ts, drive-files.ts, index.ts)
│   └── index.ts
│
├── worker/index.ts
└── types/index.ts
```

### 9.7 Dashboard Components

```text
File Browser (halaman utama)
├── Breadcrumb (My Drive > Documents > Reports)
├── Toolbar (Upload, New Folder, View toggle, Sort, Filter)
├── FileList / FileGrid (isi folder saat ini)
│   ├── FolderItem (klik → navigate into)
│   └── FileItem (klik → preview, double-click → open)
├── UploadDropzone (drag & drop overlay)
└── UploadQueueDrawer (floating, bottom-right)

Sidebar
├── My Drive (→ root folder)
├── Recent
├── Accounts
├── Storage
├── Activity
└── Settings

Storage Bar (bottom sidebar)
└── "243 GB of 1.46 TB used" [████░░░░]
```

---

## 10. Security

**OAuth** — Jangan pernah meminta password Google. Gunakan Google OAuth 2.0.

**Token**
- Access token: encrypted at rest.
- Refresh token: encrypted AES-256-GCM.
- Encryption key dari environment.

**Authorization** — User hanya boleh mengakses `GoogleAccount` miliknya sendiri.

```sql
WHERE google_accounts.user_id = currentUser.id
```

**Shared Folder Permission** — App hanya memberi permission `writer` (Editor) ke akun pool yang dimiliki user yang sama. Tidak ada sharing ke pihak luar.

**Rate Limiting** — Backend harus memiliki rate limiting. Upload API: 10 request/menit.

---

## 11. Reliability

### 11.1 Error Handling

```text
Google account disconnected
Token expired
Quota exceeded (semua akun penuh)
Permission denied
File not found
Upload failed
Google API unavailable
Shared folder deleted/moved externally
```

### 11.2 Account Health

| Status | Arti |
| --- | --- |
| 🟢 Connected | Akun terhubung normal |
| 🟡 Reconnect Required | Perlu otorisasi ulang |
| 🔴 Error | Terjadi kesalahan |

### 11.3 Shared Root Integrity

Worker harus memverifikasi secara berkala bahwa:
- Folder root masih ada di Google Drive.
- Permission ke semua akun pool masih aktif.
- Akun utama masih bisa mengakses folder root.

---

## 12. UI Design

Gaya: **Mirip Google Drive · Dark theme · Clean · Modern**

**Sidebar**

```text
☁ GDrive Pool

  📁 My Drive
  🕐 Recent
  👥 Accounts
  💾 Storage
  📋 Activity
  ⚙ Settings

  ─────────────────
  Storage
  243 GB of 1.46 TB
  ████████░░░░░░░  16%
```

**File Browser (halaman utama)**

```text
┌─────────────────────────────────────────────────┐
│ ☁ GDrive Pool           🔍 Search...    👤 User │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ My Drive │  📁 My Drive > Documents             │
│          │                                      │
│ Recent   │  [+ New] [↑ Upload] [⊞ Grid │☰ List]│
│          │                                      │
│ Accounts │  Name          Size      Modified    │
│          │  ─────────────────────────────────    │
│ Storage  │  📁 Reports     —        Today       │
│          │  📁 Invoices    —        Yesterday   │
│ Activity │  📄 draft.docx  2.4 MB   Today       │
│          │  📄 data.xlsx   500 KB   Sep 30      │
│ Settings │                                      │
│          │                                      │
│ ──────── │                                      │
│ Storage  │                                      │
│ 243 GB   │                                      │
│ of 1.46TB│                                      │
│ ████░░░░ │                                      │
└──────────┴──────────────────────────────────────┘
```

---

## 13. Scope: MVP, Phase 2, Phase 3, Phase 4

### MVP (Sesi 1–8) ✅

- [x] Login aplikasi & Google OAuth
- [x] Add/remove Google Drive account
- [x] Storage quota per akun
- [x] List files flat (semua akun)
- [x] Upload (manual account selection)
- [x] Download, Delete, Create folder
- [x] Dashboard total storage

### Phase 2 (Sesi 9–13) ✅

- [x] Move, Rename, Copy files
- [x] Automatic account selection
- [x] Activity logs & Statistics
- [x] Background sync worker
- [x] Advanced search & File preview

### Phase 3 (Sesi 14–18) — sebagian selesai

- [x] Drag & drop + Upload queue
- [x] Resumable chunked upload
- [x] Multi-select & Bulk operations
- [ ] ~~Storage balancing & Migration~~ → diganti Phase 4
- [ ] ~~Distributed rate limit & Hardening~~ → diganti Phase 4

### Phase 4 — Shared Virtual Drive (Sesi 19+) 🆕

Transformasi arsitektur menjadi **Shared Virtual Drive**:

- [ ] Setup wizard (primary account + folder root creation)
- [ ] Auto-share folder root ke semua akun pool
- [ ] File browser mirip Google Drive (navigasi folder, breadcrumb)
- [ ] Upload otomatis ke shared folder (akun dipilih berdasarkan quota)
- [ ] Folder creation selalu oleh akun utama
- [ ] Refactor semua file listing dari flat multi-account ke folder-based
- [ ] UI revamp: sidebar, file browser, storage bar
- [ ] Background sync: verify shared root integrity
- [ ] Storage balancing & Migration (adapted for shared drive)
- [ ] Production hardening

---

## 14. Development Roadmap

| Sprint | Fokus | Cakupan |
| --- | --- | --- |
| 1–8 | MVP | ✅ Foundation → File ops → Dashboard → Polish |
| 9–13 | Phase 2 | ✅ Advanced ops → Auto upload → Stats → Search |
| 14–16 | Phase 3 (partial) | ✅ Upload queue → Resumable → Bulk ops |
| 19+ | Phase 4: Shared Virtual Drive | Setup → Sharing → File browser → UI revamp → Hardening |

---

## 15. Acceptance Criteria

### Phase 4 — Shared Virtual Drive

Phase 4 dianggap selesai apabila:

```text
1. User login ke aplikasi
2. Setup wizard: pilih primary account + buat folder root
3. Tambah 2+ pool accounts
4. Folder root otomatis ter-share ke pool accounts
5. Tampilan "My Drive" menunjukkan isi folder root
6. Buat subfolder lewat app → owner = akun utama
7. Upload file → otomatis pilih akun paling lapang
8. File muncul di folder yang sedang dibuka
9. Navigasi folder: klik folder, breadcrumb, back
10. Download, delete, rename, move file berfungsi
11. Search mencari di dalam shared folder structure
12. Storage bar menunjukkan total pool capacity
13. Disconnect pool account → permission dicabut
14. Reconnect / add new account → auto-share folder root
```

Dan yang paling penting:

> **User melihat satu "My Drive" terpadu — tanpa perlu tahu file berada di akun mana — seolah memiliki satu Google Drive berkapasitas ~1.5 TB.**

---

## 16. Catatan Strategi

Mulai dari yang sudah ada:

```text
Existing codebase (Phase 1–3) → Refactor ke shared folder model → Revamp UI
```

Perubahan kunci:
1. **Database**: tambah tabel `shared_roots` dan `shared_permissions`, tambah kolom `role` di `google_accounts`.
2. **File listing**: dari "fetch semua akun lalu merge" → "list files di shared folder".
3. **Upload**: dari "upload ke akun X" → "upload ke shared folder pakai token akun X".
4. **Folder creation**: selalu pakai token akun utama.
5. **UI**: dari flat file table → folder-based file browser dengan breadcrumb.
6. **Setup**: wizard untuk membuat folder root dan share ke akun pool.