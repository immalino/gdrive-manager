# PRD — GDrive Multi-Account Manager

| | |
|---|---|
| **Versi** | 1.0 |
| **Platform** | Web |
| **Status** | MVP Planning |
| **Target** | Personal / authorized multi-account Google Drive management |

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Problem](#2-problem)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [Target User](#4-target-user)
5. [Fitur Utama](#5-fitur-utama)
6. [Upload & Pemilihan Akun](#6-upload--pemilihan-akun)
7. [Statistik](#7-statistik)
8. [Technical Specification](#8-technical-specification)
9. [Security](#9-security)
10. [Reliability](#10-reliability)
11. [UI Design](#11-ui-design)
12. [Scope: MVP, Phase 2, Phase 3](#12-scope-mvp-phase-2-phase-3)
13. [Development Roadmap](#13-development-roadmap)
14. [Acceptance Criteria MVP](#14-acceptance-criteria-mvp)
15. [Catatan Strategi MVP](#15-catatan-strategi-mvp)

---

## 1. Overview

**GDrive Multi-Account Manager** adalah aplikasi web yang memungkinkan pengguna menghubungkan beberapa akun Google Drive miliknya, lalu mengelola file dari seluruh akun melalui satu dashboard.

Tujuan utama: menghilangkan kebutuhan login/logout Google Drive satu per satu.

```text
                GDrive Manager
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    Google #1     Google #2     Google #3
      15 GB         15 GB         15 GB
        │             │             │
        └─────────────┼─────────────┘
                      │
                Unified Dashboard
```

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
```

Pengguna ingin melihat semuanya dalam satu dashboard.

---

## 3. Goals & Non-Goals

### 3.1 Primary Goals

- Menghubungkan beberapa Google Drive.
- Menampilkan kapasitas setiap akun dan total kapasitas seluruh akun.
- Menampilkan dan mencari file dari seluruh akun.
- Upload file ke akun tertentu.
- Membuka file/folder di Google Drive.
- Menghapus file, membuat folder, dan memindahkan file.
- Menentukan akun tujuan upload secara otomatis.

### 3.2 Secondary Goals

- Statistik penggunaan storage.
- Filtering berdasarkan akun dan sorting file.
- Activity log.
- Monitoring kesehatan koneksi akun.

### 3.3 Non-Goals

MVP **tidak** bertujuan:

- Membuat Google Drive baru.
- Mengubah quota resmi Google atau membypass limit Google Drive.
- Mengakses akun tanpa izin.
- Mengotomatisasi pembuatan akun Google.
- Menghapus akun Google.
- Menyediakan storage fisik sendiri.

---

## 4. Target User

**Persona: Personal Power User**

> Developer yang memiliki beberapa akun Google dan ingin mengelola file dari seluruh akun melalui satu interface.

**Alur penggunaan:**

```text
User
 ↓
Login ke GDrive Manager
 ↓
Tambah Google Account
 ↓
OAuth Google
 ↓
Account berhasil terhubung
 ↓
Dashboard menampilkan storage
 ↓
User upload file
 ↓
Sistem memilih akun tujuan
 ↓
Upload ke Google Drive
```

---

## 5. Fitur Utama

### 5.1 Authentication

User login ke aplikasi. Untuk MVP, gunakan salah satu:

- Google OAuth
- Better Auth

User memiliki akun aplikasi sendiri.

### 5.2 Google Drive Account Management

**Halaman:** `/dashboard/accounts`

| Account | Used | Free | Status |
| --- | ---: | ---: | --- |
| account1@gmail.com | 10.2 GB | 4.8 GB | Connected |
| account2@gmail.com | 7.4 GB | 7.6 GB | Connected |
| account3@gmail.com | 14.1 GB | 0.9 GB | Connected |

**Actions:** `+ Add Account` · `Refresh` · `Disconnect` · `Open Drive`

### 5.3 Add Google Account

```text
Klik "+ Add Account"
        ↓
Google OAuth
        ↓
User memilih akun
        ↓
Grant permission
        ↓
Callback
        ↓
Backend mendapatkan token
        ↓
Encrypt token
        ↓
Simpan account
        ↓
Sync quota
        ↓
Dashboard
```

> **Penting:** refresh token harus dienkripsi sebelum disimpan. Jangan simpan sebagai plain text; gunakan encryption di server.

### 5.4 Storage Dashboard

```text
┌────────────────────────────────────────────┐
│ GDrive Manager                             │
├────────────────────────────────────────────┤
│ Total Storage        1.46 TB               │
│ Used                 243 GB                │
│ Free                 1.21 TB               │
│ Accounts             100                   │
├────────────────────────────────────────────┤
│ Accounts                                   │
│                                            │
│ account1@gmail.com                         │
│ ███████░░░░░  9.8 / 15 GB                  │
│                                            │
│ account2@gmail.com                         │
│ ████░░░░░░░░  5.2 / 15 GB                  │
└────────────────────────────────────────────┘
```

*(Angka pada mockup hanya ilustrasi.)*

### 5.5 File Manager

**Halaman:** `/dashboard/files`

```text
Files

[ Search files... ]

All Accounts ▼    All Types ▼    Sort ▼

┌──────────────────────────────────────────────┐
│ Name       Size      Account      Updated    │
├──────────────────────────────────────────────┤
│ video.mp4  2.4 GB    account1     Today      │
│ photo.zip  500 MB    account2     Today      │
│ document   12 MB     account3     Yesterday  │
└──────────────────────────────────────────────┘
```

**Actions:** Open · Download · Delete · Move · Rename · Copy · Open in Google Drive

### 5.6 Folder Management

User dapat: Create Folder, Rename Folder, Delete Folder, Move Folder.

```text
My Files
├── Documents
├── Photos
├── Videos
└── Projects
```

Folder tetap merupakan folder Google Drive.

### 5.7 Global Search

Backend mencari ke semua akun yang terhubung.

```text
Search: invoice

invoice-january.pdf    account1@gmail.com
invoice-february.pdf   account2@gmail.com
invoice-march.pdf      account4@gmail.com
```

---

## 6. Upload & Pemilihan Akun

### 6.1 Alur Upload

```text
Select files → Select account → Upload
```

Ada dua mode:

**Mode A — Manual**

```text
Upload to:

○ account1@gmail.com
○ account2@gmail.com
○ account3@gmail.com
```

**Mode B — Automatic** *(Phase 2)*

```text
Upload destination:

● Automatic
○ Specific account
```

Mode automatic memilih akun berdasarkan kapasitas yang tersedia.

```text
File: video.zip (8 GB)

Account 1 — Free: 1.2 GB   ❌
Account 2 — Free: 10.3 GB  ✅

→ Upload ke Account 2
```

### 6.2 Upload Strategy

Untuk MVP gunakan **single-account upload**. Jangan langsung melakukan file splitting.

```text
video.mp4 = 8 GB

Account 1 = 3 GB free
Account 2 = 10 GB free

→ Account 2
```

**Future:** file besar bisa dipecah ke beberapa akun.

```text
Large File → Split → Part 1 → Account A
                     Part 2 → Account B
                     Part 3 → Account C
```

Fitur ini **bukan MVP** karena kompleksitas dan risiko kehilangan data jauh lebih tinggi.

### 6.3 Automatic Account Selection

Algoritma sederhana:

```ts
function selectAccount(fileSize, accounts) {
  return accounts
    .filter(account => account.freeSpace >= fileSize)
    .sort((a, b) => b.freeSpace - a.freeSpace)
    .at(0)
}
```

Contoh:

| Account | Free |
| --- | ---: |
| A | 2 GB |
| B | 12 GB |
| C | 7 GB |

File = 5 GB → hasil: **Account B**.

### 6.4 Sync Quota

Aplikasi menyimpan cache `total`, `used`, dan `free`. Namun quota Google **tidak boleh dianggap selalu akurat** berdasarkan cache database.

Saat upload:

1. Refresh quota
2. Cek ruang tersedia
3. Upload
4. Refresh quota

---

## 7. Statistik

**Storage:** Total · Used · Free

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

## 8. Technical Specification

### 8.1 Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js |
| Language | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Server | Next.js / Hono |
| Database | PostgreSQL |
| ORM | Drizzle |
| Data fetching | TanStack Query, TanStack Table |
| Auth | Better Auth / Google OAuth |
| Storage | Google Drive (via Google Drive API) |
| Deployment | VPS / Vercel |
| Encryption | AES-256-GCM |
| Background Jobs | Redis + worker |

> Untuk MVP, Redis belum wajib. Mulai tanpa Redis agar arsitektur tidak terlalu kompleks.

### 8.2 Arsitektur

```text
Frontend
   │
   ↓
Next.js
   │
   ├── Auth
   ├── API
   └── Google Drive Service
              │
              ↓
       Google Drive API
```

### 8.3 Database Schema

**users**

```text
id, email, name, created_at, updated_at
```

**google_accounts**

```text
id, user_id, google_account_id, email, name,
access_token, refresh_token_encrypted, token_expires_at,
status, created_at, updated_at
```

**storage_snapshots**

```text
id, google_account_id, total_bytes, used_bytes, free_bytes, created_at
```

**upload_jobs**

```text
id, user_id, google_account_id, filename, file_size,
status, error_message, created_at, completed_at
```

**activity_logs**

```text
id, user_id, google_account_id, action, file_id, metadata, created_at
```

**Relasi**

```text
User
 │
 ├── GoogleAccount
 │      ├── StorageSnapshot
 │      ├── UploadJob
 │      └── ActivityLog
 │
 └── ActivityLog
```

### 8.4 API Endpoints

```text
GET    /api/accounts
POST   /api/accounts/connect
DELETE /api/accounts/:id

GET    /api/storage
GET    /api/accounts/:id/storage

GET    /api/files
POST   /api/files/upload
DELETE /api/files/:id
PATCH  /api/files/:id

POST   /api/folders
PATCH  /api/folders/:id
DELETE /api/folders/:id
```

### 8.5 Google Drive Service

Buat abstraction `GoogleDriveService` agar Google API tidak tercampur dengan business logic.

```ts
class GoogleDriveService {
  getStorageQuota()
  listFiles()
  uploadFile()
  downloadFile()
  deleteFile()
  createFolder()
  moveFile()
  renameFile()
}
```

### 8.6 Struktur Frontend

```text
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── accounts/
│   │   ├── files/
│   │   └── settings/
│   └── api/
│
├── components/
│   ├── dashboard/
│   ├── accounts/
│   ├── files/
│   └── upload/
│
├── lib/
│   ├── google-drive/
│   ├── auth/
│   └── encryption/
│
├── db/
│   ├── schema/
│   └── index.ts
│
└── types/
```

### 8.7 Dashboard Components

```text
Dashboard
├── StorageOverview
├── StorageChart
├── AccountList
├── RecentFiles
├── RecentActivity
└── QuickActions   → [ Upload ] [ Add Account ] [ File Manager ]
```

---

## 9. Security

Bagian ini **sangat penting**.

**OAuth** — Jangan pernah meminta password Google. Gunakan Google OAuth 2.0.

**Token**
- Access token: encrypted / securely managed.
- Refresh token: encrypted at rest. Jangan simpan sebagai plaintext.
- Encryption key diambil dari environment:

```env
TOKEN_ENCRYPTION_KEY=
```

**Authorization** — User hanya boleh mengakses `GoogleAccount` miliknya sendiri.

```sql
WHERE google_accounts.user_id = currentUser.id
```

**Rate Limiting** — Backend harus memiliki rate limiting, misalnya Upload API 10 request/menit. Satu user tidak boleh membuat request tanpa batas.

---

## 10. Reliability

### 10.1 Error Handling

Contoh error yang harus ditangani:

```text
Google account disconnected
Token expired
Quota exceeded
Permission denied
File not found
Upload failed
Google API unavailable
```

Contoh UI:

```text
⚠ Account disconnected

Reconnect Google Account
```

### 10.2 Account Health

| Status | Arti |
| --- | --- |
| 🟢 Connected | Akun terhubung normal |
| 🟡 Reconnect Required | Perlu otorisasi ulang |
| 🔴 Error | Terjadi kesalahan |

Background job dapat melakukan pengecekan berkala.

---

## 11. UI Design

Gaya: **Dark Dashboard · Minimal · Modern · Dense information**

**Sidebar**

```text
☁ GDrive Manager

Dashboard
Files
Accounts
Activity
Settings
```

**Header**

```text
Search files...            Refresh   + Add Account
```

**Contoh layout dashboard**

```text
┌─────────────────────────────────────────────────┐
│ GDrive Manager                    + Add Account │
├──────────────┬──────────────────────────────────┤
│              │                                  │
│ Dashboard    │  Storage Overview                │
│              │                                  │
│ Files        │  Used        Free       Accounts │
│              │  243 GB      1.21 TB       100   │
│ Accounts     │                                  │
│              │  ──────────────────────────────  │
│ Activity     │                                  │
│              │  Google Accounts                 │
│ Settings     │                                  │
│              │  account1@gmail.com              │
│              │  █████████░░░  12.4 / 15 GB      │
│              │                                  │
│              │  account2@gmail.com              │
│              │  ████░░░░░░░  5.2 / 15 GB        │
│              │                                  │
└──────────────┴──────────────────────────────────┘
```

---

## 12. Scope: MVP, Phase 2, Phase 3

### MVP

**Authentication**
- [x] Login aplikasi
- [x] Google OAuth

**Accounts**
- [x] Add Google Drive account
- [x] Remove account
- [x] List accounts
- [x] Storage quota

**Files**
- [x] List files
- [x] Search
- [x] Upload
- [x] Download
- [x] Delete
- [x] Create folder

**Dashboard**
- [x] Total storage
- [x] Used storage
- [x] Free storage
- [x] Account cards

### Phase 2 — setelah MVP stabil

- Move files
- Rename files
- Copy files
- Advanced search
- File preview
- Storage analytics
- Activity logs
- Background sync
- Automatic account selection

### Phase 3 — fitur lanjutan

- Multi-file upload
- Upload queue
- Retry failed uploads
- Large file handling
- Drag & drop
- Bulk delete
- Bulk move
- Storage balancing

---

## 13. Development Roadmap

| Sprint | Fokus | Cakupan |
| --- | --- | --- |
| 1 | Foundation | Project setup, database, authentication, dashboard layout |
| 2 | Google OAuth | Connect Google, OAuth callback, token storage, account management |
| 3 | Drive API | Storage quota, list files, folders, file metadata |
| 4 | File Operations | Upload, download, delete, rename, create folder |
| 5 | Multi Account | Account selector, global file search, automatic account selection, storage aggregation |
| 6 | Polish | Error handling, loading state, upload progress, retry, security audit, responsive UI |

---

## 14. Acceptance Criteria MVP

MVP dianggap selesai apabila user dapat:

```text
1. Login ke aplikasi
2. Connect Google Account A
3. Connect Google Account B
4. Melihat quota keduanya
5. Melihat file Account A & B
6. Upload file
7. Memilih account tujuan
8. Download file
9. Delete file
10. Disconnect account
```

Dan yang paling penting:

> **User tidak perlu membuka Google Drive satu per satu untuk melakukan operasi dasar.**

---

## 15. Catatan Strategi MVP

Jangan langsung membuat sistem "1,5 TB". Mulai dari yang kecil:

```text
2 akun → OAuth → Dashboard → File Manager → Upload → Automatic Account Selection
```

Jika sudah stabil, naikkan bertahap:

```text
2 → 5 → 10 → lebih banyak akun
```

Dengan begitu bottleneck Google API, token management, upload, rate limit, dan biaya server dapat diketahui sebelum aplikasi digunakan dalam skala besar.