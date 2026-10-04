# GDrive Multi-Account Manager — Rencana Implementasi per Sesi

> **Untuk agentic worker:** Setiap sesi di bawah ini dirancang untuk dijalankan di **satu session opencode baru**. Kerjakan **hanya sesi yang diminta**, ikuti checklist langkah demi langkah, jalankan seluruh blok **Verifikasi** sebelum menyatakan selesai, lalu update baris sesi di [Tracker](#1-tracker). Sintaks checkbox (`- [ ]`) dipakai untuk pelacakan.

**Goal:** Membangun aplikasi web MVP untuk mengelola banyak akun Google Drive dari satu dashboard (lihat `PRD.md`), lalu melanjutkan ke fitur Phase 2.

**Architecture:** Next.js App Router (server + client components), route handlers sebagai API, Drizzle + PostgreSQL untuk persistensi, `GoogleDriveService` sebagai satu-satunya tempat memanggil Google Drive API, token Google dienkripsi AES-256-GCM, auth aplikasi via Better Auth.

**Tech Stack:** Next.js (App Router, TypeScript strict), Tailwind CSS + shadcn/ui, TanStack Query + TanStack Table, Drizzle ORM + PostgreSQL (Docker), Better Auth, Vitest, Google Drive API v3 (OAuth 2.0).

**Spec:** [`PRD.md`](./PRD.md) — semua argumen plan ini merujuk ke bagian PRD; eksekutor wajib membaca PRD bagian yang disebut di tiap sesi.

**Target deploy:** VPS (upload file besar di-stream dari server ke Drive API, tanpa batasan serverless).

---

## Daftar Isi

0. [Cara Pakai Dokumen Ini](#0-cara-pakai-dokumen-ini)
1. [Tracker](#1-tracker)
2. [Global Constraints](#2-global-constraints)
3. [Peta Sesi & Dependency](#3-peta-sesi--dependency)
4. [MVP — Sesi 1–8](#4-mvp--sesi-18)
5. [Phase 2 — Sesi 9–13](#5-phase-2--sesi-913)
6. [Phase 3 — Sesi 14–18](#6-phase-3--sesi-1418)
7. [Pemetaan Acceptance Criteria → Sesi](#7-pemetaan-acceptance-criteria--sesi)
8. [Keputusan Teknis & Deviasi dari PRD](#8-keputusan-teknis--deviasi-dari-prd)

---

## 0. Cara Pakai Dokumen Ini

### 0.1 Per sesi = satu session opencode baru

Prompt pembuka yang di-copy ke session baru (ganti `{N}` dengan nomor sesi):

```text
Kamu mengerjakan Sesi {N} dari implementasi.md.

1. Baca PRD.md (bagian yang dirujuk) dan implementasi.md: bagian "Global Constraints" lalu "Sesi {N}" saja.
2. Kerjakan hanya Sesi {N}. Ikuti checklist langkah demi langkah, jangan loncati langkah verifikasi.
3. Semua blok "Verifikasi" wajib lulus. Jika ada yang gagal, perbaiki dulu sebelum lanjut.
4. Setelah lulus: commit (conventional commits), centang checklist selesai, lalu update baris Sesi {N} di tracker (status, tanggal, catatan handoff).
5. Jangan mengerjakan sesi lain, jangan mengubah isi sesi sebelumnya.
```

### 0.2 Definition of Done (DoD) sebuah sesi

- Seluruh checklist langkah ter-centang.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lulus tanpa error.
- Semua item **Verifikasi** sesi terpenuhi (termasuk verifikasi manual via browser/curl bila ada).
- Sudah `git commit` dengan pesan conventional commits.
- Baris sesi di [Tracker](#1-tracker) diperbarui: status ✅, tanggal, catatan handoff (perubahan keputusan, hal yang tertunda, hal yang perlu diketahui sesi berikutnya).

### 0.3 Aturan antar-sesi

- Sesi hanya boleh dikerjakan berurutan (ada dependency; lihat [Peta Sesi](#3-peta-sesi--dependency)).
- Jangan mengubah API/taip yang sudah diproduksi sesi sebelumnya kecuali sesi itu sendiri yang memperbaikinya; jika perlu, catat di kolom **Catatan Handoff**.
- Jika menemukan error/bug pada kode sesi sebelumnya: perbaiki di sesi berjalan, sebutkan di catatan handoff.
- Jangan menaikkan versi mayor dependensi di tengah sesi tanpa alasan kuat.

---

## 1. Tracker

> Update setelah sesi selesai. Status: ⬜ belum · 🟡 berjalan · ✅ selesai · ⛔ terblokir.

| Sesi | Fokus | Status | Tanggal | Catatan Handoff |
| --- | --- | --- | --- | --- |
| 1 | Foundation: Next.js, Docker Postgres, Drizzle schema, shell UI | ✅ | 2026-10-02 | Lint memakai `eslint` CLI (lihat Log Sesi). UserMenu di header masih slot kosong (diisi Sesi 2). `FileKind` tidak dibuat sesuai rencana (Sesi 5). Verifikasi browser dilakukan via curl terhadap HTML SSR + log `next dev` (environment tanpa browser headless). |
| 2 | Auth aplikasi (Better Auth) + proteksi route | ✅ | 2026-10-02 | `withAuth`/`ok`/`errorResponse` sudah tersedia tapi belum dipakai route mana pun (mulai Sesi 3). `Header` kini mewajibkan prop `user` (diisi guard `dashboard/layout.tsx`). Verifikasi browser dilakukan via curl terhadap SSR HTML + API (environment tanpa browser headless). |
| 3 | Enkripsi token + Google OAuth connect/disconnect + API accounts | ✅ | 2026-10-02 | Selesai; verifikasi lulus termasuk live OAuth (2 akun terhubung, token tersimpan `v1.`, status `connected`, cascade DELETE teruji). Scope `auth/drive` penuh. App Google masih **Testing** → hanya email *test user* yang boleh connect (lainnya 403 `access_denied`) dan refresh token kadaluarsa 7 hari — publish ke Production untuk pemakaian panjang. `logActivity` dikomentari → aktifkan di Sesi 6. Halaman `/dashboard/accounts` masih placeholder → tabel diisi Sesi 4. |
| 4 | GoogleDriveService (quota) + sinkronisasi quota + halaman Accounts | ✅ | 2026-10-03 | Pipeline lulus + 11 unit test baru (fetch-mocked quota & `mapGoogleError`). Live curl: `POST /api/accounts/refresh` sukses 2 akun (snapshot `0→2→4`; token kedaluwarsa → auto-refresh lewat `getValidAccessToken`), struktur `/api/storage` benar, riwayat `/api/accounts/[id]/storage` OK, disconnect cascade OK, tanpa cookie 401, tidak ada token di log dev. Tanpa browser headless: toast `?connected=` + render tabel setelah hydration tak diverifikasi visual (SSR menampilkan skeleton; data dari API teruji). Password `tes1@example.com` direset ke `Sesi4Verify!` demi verifikasi curl. `pnpm format:check` masih gagal di 3 file lama (Sesi 1/3) — bereskan di Sesi 8. |
| 5 | List/search file lintas akun + index cache `drive_files` + halaman Files | ✅ | 2026-10-03 | 100 file per akun (`nextPageToken` tidak dipakai); tombol Download masih disabled sampai Sesi 6. Verifikasi via curl: 2 akun × 100 file, search/filter/sort OK, quote search tidak error, `drive_files` terisi lintas akun, simulasi token rusak → `failedAccounts` + file akun lain tetap tampil (token dipulihkan, status `connected`). Tanpa browser headless: render tabel/label Select tak diverifikasi visual (SSR menampilkan skeleton + header kolom; data teruji lewat API). `pnpm format:check` masih gagal di 3 file lama (Sesi 1/3) — bereskan di Sesi 8. |
| 6 | Upload (manual, single-account), download, delete, folder, rate limit | ✅ | 2026-10-03 | Mode A (akun dipilih manual); upload resumable streaming 1 file/request, multi-file = loop berurutan tanpa paralel. Deviasi plan: endpoint resumable pakai `UPLOAD_BASE` baru (`https://www.googleapis.com/upload/drive/v3`) karena snippet plan menghasilkan 404; `content-length` download hanya diteruskan bila valid (nilai kosong → respons rusak). Rate limit in-memory per proses 10/menit/user. Live curl: upload 20 MB `201` (snapshot `used_bytes` +20.971.520), kelebihan kuota `413 QUOTA_EXCEEDED`, request ke-11 `429` + `retry-after: 60`, download PDF/Doc-native/file 20 MB identik, delete 3 objek + create folder OK, `account.disconnect` diuji via akun dummy (`account.connect` butuh OAuth browser → belum ada barisnya; panggilan sudah ada di callback). Tanpa browser headless: progress bar + dialog Upload/New Folder/Delete tak diverifikasi visual. `pnpm format:check` masih gagal di 3 file lama (Sesi 1/3) — bereskan di Sesi 8. |
| 7 | Dashboard storage + recent files/activity + global search | ✅ | 2026-10-03 | Pipeline lulus (30 unit test, typecheck, lint, build). Komponen dashboard (StorageOverview, AccountList, RecentFiles, RecentActivity, QuickActions) terpasang di /dashboard via TanStack Query. Endpoint `GET /api/activity` + dukungan `?recent=1` di `GET /api/files` (8 file terbaru lintas akun). Header search form navigasi ke `/dashboard/files?search=...`, tersinkronisasi dua arah dengan `FilesTable` via `useSearchParams` (di dalam `Suspense`). Responsive diuji (teks tombol header sembunyi pada layar kecil). `pnpm format:check` masih gagal di 3 file lama (Sesi 1/3) — bereskan di Sesi 8. |
| 8 | Error handling, health status, keamanan, responsive, acceptance MVP | ✅ | 2026-10-03 | Pipeline lulus (33 unit test, build, lint, format:check). Async `mapGoogleError`, error boundary global + dashboard, status health badge + reconnect button, rate limit mutasi 30/min, audit keamanan lulus 100%, `pnpm format` merapikan seluruh file (DoD format:check bersih), README.md lengkap + acceptance MVP checklist tercentang. MVP Selesai. |
| 9 | Phase 2: Move, Rename, Copy file | ✅ | 2026-10-03 | Pipeline lulus (40 unit test, build, lint, format:check). Rename & move (file/folder) via PATCH /api/files/[id] & /api/folders/[id], copy file via POST /api/files/[id]/copy, folder list via GET /api/folders. UI: DropdownMenu per baris dengan dialog Rename, Move (folder picker), Copy (file), dan Delete confirmation. Live curl terverifikasi: rename file/folder, move file ke folder & kembali ke root, copy file, delete folder, activity logs tercatat. Copy/move lintas akun belum didukung (hanya dalam 1 akun sesuai PRD Phase 2). |
| 10 | Phase 2: Automatic account selection (Mode B) | ✅ | 2026-10-03 | Pipeline lulus (46 unit test, build, lint, format:check). Algoritma selectAccount (PRD §6.3) memilih akun dengan sisa ruang terbesar yang muat file. Upload API mendukung ?mode=auto dengan auto-quota sync & auto-selection. UploadDialog UI memiliki radio Automatic / Specific account dengan panel preview evaluasi kandidat per file (✅/❌) dan proteksi QUOTA_EXCEEDED. Live curl terverifikasi: auto upload ke akun terbesar, reject 413 file melebihi kapasitas seluruh akun, manual mode tetap berfungsi. |
| 11 | Phase 2: Activity log page + Statistik storage/file | ✅ | 2026-10-03 | Pipeline lulus (52 unit test, build, lint, format:check). API /api/activity mendukung filter action, accountId, dan pagination; API /api/stats menyediakan ringkasan storage, fileKinds, snapshotHistory (AreaChart), dan actionCounts. Halaman /dashboard/activity (ActivityTable) dan /dashboard/stats (StatsCards + StatsCharts) berfungsi penuh; menu Stats ditambahkan ke sidebar; isolasi cross-user teruji aman; statistik bergantung pada kelengkapan index drive_files yang akan diperbarui oleh background sync di Sesi 12. |
| 12 | Phase 2: Background sync (worker) + account health monitoring | ✅ | 2026-10-03 | Pipeline lulus (61 unit test, build, lint, format:check). Worker src/worker/index.ts (quota 10m, health 30m, index 60m) beroperasi tanpa Redis; indexAccountFiles dengan paging hingga 2000 file; health check memantau konektivitas & menangani token expired (reconnect_required) serta recovery; Docker service worker terkonfigurasi di docker-compose.yml; panduan VPS (PM2/systemd) didokumentasikan di README; UI AccountsTable & Dashboard auto-refetch storage tiap 5 menit. |
| 13 | Phase 2: Advanced search + file preview | ✅ | 2026-10-03 | Pipeline lulus (65 unit test, build, lint, format:check). buildDriveQuery diperluas (sizeMin/Max, modifiedAfter/Before). UI FilesFilters mendukung popover filter lanjutan (rentang tanggal, ukuran file angka + unit MB/GB, multi-select checkbox akun, dan tombol reset) dengan URL query params & browser history synchronization. PreviewDialog mendukung preview file Google Drive via iframe dengan tautan fallback Buka di Drive & Download, aksi Preview pada dropdown/quick action baris, serta double-click baris tabel. Live curl terverifikasi: query ukuran >=100MB, multi-akun, kombinasi filter, dan validasi 400. Google Drive API v3 tidak mendukung filter size di q parameter sehingga query disanitasi di service.ts dan difilter in-memory di API route (mirip kind folder/other di Sesi 5). Phase 2 Selesai. |
| 14 | Phase 3: Drag & Drop + Concurrent Upload Queue & Retry UI | ✅ | 2026-10-03 | Pipeline lulus (69 unit test, build, lint, format:check). UploadQueueManager mengontrol concurrency limit (2 paralel) dengan AbortController cancellation dan retry pool. UploadDropzone menyediakan visual drag-over dan multi-file selector. UploadQueueDrawer mengambang di pojok kanan bawah dashboard layout dengan status per-item, progress bar, tombol cancel/retry individual, dan retry all failed. FilesDropOverlay memungkinkan drag-and-drop langsung file dari desktop di halaman Files ke antrean upload mode auto/aktif. |
| 15 | Phase 3: Large File Resumable Upload & Network Resilience | ✅ | 2026-10-03 | Pipeline lulus (81 unit test, build, lint, format:check). Skema upload_jobs diperluas (resumable_uri & uploaded_bytes). GoogleDriveService mendukung initiateResumableSession, getResumableOffset, dan uploadChunk. API /api/files/upload/session, /chunk, dan /session/[id]/status aktif. Helper uploadFileChunked (chunk 5MB, threshold 10MB) terintegrasi dengan UploadQueueManager dan drawer. Live verifikasi lulus: upload 50 MB bertahap (10 chunk), interupsi koneksi pada 50% (offset 26.214.400) dan resume berhasil hingga 100%, checksum SHA-256 identik, DB upload_jobs completed, storage snapshot ter-update, file uji dibersihkan dari Google Drive. |
| 16 | Phase 3: Multi-Select Table & Bulk Operations (Delete & Move) | ✅ | 2026-10-03 | Pipeline lulus (87 unit test, build, lint, format:check). Row selection TanStack Table v9 dengan checkbox Base UI & shift-click range; floating BulkActionBar; API /api/files/bulk-delete & /api/files/bulk-move dengan pool concurrency 5 (runBatchPool); dialog BulkDeleteDialog & BulkMoveDialog dengan visual progress, fault isolation, dan peringatan/pengelompokan multi-akun. |
| 17 | ~~Phase 3: Storage Balancing Engine & Cross-Account File Migration~~ | 🚫 | — | **DIBATALKAN** — digantikan oleh Phase 4 (Shared Virtual Drive). Fitur storage balancing & migration akan diadaptasi di Sesi 24. |
| 18 | ~~Phase 3: Distributed Rate Limiter & Production Hardening~~ | 🚫 | — | **DIBATALKAN** — digantikan oleh Phase 4. Hardening & distributed rate limit masuk Sesi 25. |
| 19 | Phase 4: Schema Migration + Setup Wizard (Shared Root) | ✅ | 2026-10-03 | Pipeline lulus (95 unit test, build, lint, format:check). Skema DB baru (shared_roots, shared_permissions, role di google_accounts) ter-generate & migrate. GoogleDriveService diperluas (createSharedRootFolder, shareFolder, revokePermission). Endpoint /api/setup/init, /status, /share/[accountId] aktif. SetupWizard UI multi-step di /dashboard/setup dengan auto-redirect guard (Next.js 16 proxy.ts + SetupGuard). OAuth callback auto-share ke akun pool baru. Live curl terverifikasi: folder root dibuat di Google Drive asli, role primary/pool ter-set, permission Google Editor terbit dan tercatat di DB, activity logs setup.init & setup.share tersimpan, guard redirect /dashboard <-> /dashboard/setup bekerja dua arah. |
| 21 | Phase 4: Upload ke Shared Folder + Folder Creation by Primary | ✅ | 2026-10-04 | Pipeline lulus (113 unit test, build, lint, format:check). Refactor POST /api/files/upload & POST /api/files/upload/session untuk menerima parentFolderId (default ke sharedRoot.driveFolderId) dengan validasi isSubfolderOfSharedRoot; folder creation di POST /api/folders selalu menggunakan primary account; chunked uploader & upload queue meneruskan parentFolderId; UI UploadDialog beralih ke mode Automatic secara default dengan collapsible advanced options toggle untuk specific account; NewFolderButton/NewFolderDialog membuat folder di akun utama tanpa perlu memilih akun dan menerima parentFolderId; UploadDropzone & FilesDropOverlay meneruskan parentFolderId ke antrean upload. |
| 22 | Phase 4: Refactor File Operations untuk Shared Drive | ✅ | 2026-10-04 | Pipeline lulus (123 unit test, build, lint, format:check). Operasi file (delete, download, rename, move, copy) diadaptasi untuk shared drive context dengan automatic owner resolution via drive_files; bulk delete & bulk move mendukung item lintas akun secara serempak ke folder target; search di-refactor scoped ke shared root dengan pencarian di index cache drive_files; worker indexer mengindeks folder hierarkis shared root secara BFS; filter & dropdown Account dihapus dari FilesFilters (abstracted away) dan info owner ditampilkan di tooltip file. |
| 23 | Phase 4: UI Revamp — GDrive-like Interface | ✅ | 2026-10-04 | Pipeline lulus (127 unit test, build, lint, format:check). Sidebar baru dengan menu My Drive, Recent, Accounts, Storage, Activity, Settings dan mini storage bar di bawah; Header disederhanakan (logo kiri, expand-on-focus search tengah, user menu kanan); Toolbar file browser dengan + New dropdown (New Folder, Upload Files), toggle Grid/List (tersinkronisasi via useSyncExternalStore), sort dropdown & toggle direction; FileGrid card view untuk folder & file dengan preview dan aksi; Halaman /dashboard/storage menampilkan StorageOverview, AccountList, dan StatsCharts; Halaman /dashboard/recent menampilkan file terbaru (7 hari) dengan dukungan grid/list view. |
| 24 | Phase 4: Shared Drive Integrity + Storage Balancing (Adapted) | ⬜ | — | Worker verifikasi shared root integrity, auto-reshare akun baru, storage balancing & migration diadaptasi untuk shared folder model. |
| 25 | Phase 4: Production Hardening + Phase 4 Acceptance | ⬜ | — | Distributed rate limit, worker heartbeat, audit keamanan, acceptance run-through Phase 4 lengkap. |

**Log Sesi** (diisi bila ada keputusan penting lintas sesi):

```text
- Sesi 1: script `lint` = `eslint` CLI, bukan `next lint` — Next.js 16 menghapus `next lint` (lihat node_modules/next/dist/docs/.../03-eslint.md). DoD tetap `pnpm lint`.
- Sesi 1: create-next-app (Next 16) tidak lagi menyalin Prettier; ditambahkan manual (`prettier` dev dep, `.prettierrc`, script `format` / `format:check`) agar §2.1 terpenuhi.
- Sesi 1: `@types/node` dipaksa `^24` (peer requirement vitest 5); build script `esbuild` diizinkan lewat `allowBuilds` di `pnpm-workspace.yaml` (pnpm 12 memblokir build script secara default).
- Sesi 1: `shadcn@latest` (init + add) memakai **`@base-ui/react`** sebagai primitif (bukan Radix) dan paket `cn` untuk `cn()`. Komponen UI berikutnya harus mengikuti API Base UI (mis. prop `render` alih-alih `asChild`).
- Sesi 1: `pnpm format` sudah dijalankan sekali, sehingga file bawaan scaffold ikut ter-format ulang (gaya single-quote, printWidth 100) — jangan kembalikan ke double quote.
- Sesi 1: `shadcn` ada di `dependencies` karena CLI `shadcn init` memang menambahkannya (ada perintah `shadcn eject` untuk melepasnya) — jangan dihapus. `clsx` + `tailwind-merge` dipasang sesuai checklist langkah 3 walau kini dipakai paket `cn`.
- Sesi 2: `toNextJsHandler(auth)` menerima instance auth langsung (better-auth 1.7); `drizzleAdapter(db, { provider: 'pg' })` tanpa opsi `schema` sudah cukup karena `db._.fullSchema` memuat export `user/session/account/verification`.
- Sesi 2: sign-out via curl butuh `Content-Type: application/json` + header `Origin` (proteksi CSRF Better Auth); browser mengirim keduanya otomatis — verifikasi memakai `-H 'origin: http://localhost:3000'`.
- Sesi 2: item `Settings` di UserMenu memakai `onClick` + `router.push` (bukan `render={<Link/>}`) agar tidak bergantung pada perilaku Base UI Menu yang belum teruji browser.
- Sesi 3: `refreshTokenEncrypted` (notNull) + TS strict menolak snippet plan → callback dua jalur: refresh token ada → insert/upsert penuh; tidak ada → update baris existing, pertahankan token lama (redirect `?error=no_refresh_token` bila baris belum pernah ada).
- Sesi 3: deviasi review — `DELETE /api/accounts/[id]` kini memfilter `id + user_id` (§2.5.3), callback dibungkus try/catch → `?error=exchange_failed`, dan cookie `g_oauth_state` dihapus di semua jalur gagal.
- Sesi 3: tombol header memakai `render={<a href="/api/google/connect"/>}` (API Base UI), bukan `asChild` yang tidak ada di Button.
- Sesi 3: setup kredensial memakai wizard `/tmp/opencode/google-oauth-setup.sh` (sekali jalan; ulangi bila perlu credential baru).
- Sesi 3 (live): app Google masih **Testing** → hanya *test user* di consent screen yang bisa connect; error 403 `access_denied` = email belum didaftarkan (Cloud Console → APIs & Services → OAuth consent screen → Test users). `next dev` perlu restart setelah `.env` berubah.
- Sesi 4: `getAccountForUser` difilter `and(id, user_id)` (bukan select-by-id lalu cek di TS) — hasil identik (NOT_FOUND) dan selalu membawa `user_id` sesuai §2.5.3.
- Sesi 4: peletakan aksi halaman — header berisi `+ Add Account` dan `Refresh` (global, `POST /api/accounts/refresh`), baris tabel berisi `Open Drive` + `Disconnect`; daftar aksi PRD §5.2 tetap lengkap.
- Sesi 4: `AlertDialogAction` (Base UI) tidak auto-close → dialog Disconnect dikontrol `open` state; ditutup oleh cancel/klik luar atau suksesnya mutation. `shadcn add alert-dialog` menambah `src/components/ui/alert-dialog.tsx`.
- Sesi 4: `DriveFileDto` tidak diimpor di `service.ts` (lint warning unused) — dipakai kembali mulai Sesi 5. `pnpm format:check` gagal pada `encryption.ts`, `__tests__/encryption.test.ts`, `api/accounts/[id]/route.ts` (terlewat `pnpm format` sesi lalu) — sengaja tak disentuh agar diff sesi 4 fokus; rapikan di Sesi 8.
- Sesi 4 (live): verifikasi curl memakai sign-in Better Auth dengan password `tes1@example.com` = `Sesi4Verify!` (hash di-set via `better-auth/crypto`), cookie di `/tmp/cookies.txt`; `storage_snapshots.id` tidak punya default DB → insert SQL manual wajib menyetel `id`.
- Sesi 4 (review): dua temuan dibereskan sebelum tutup sesi — tipe mati `StorageSnapshotsResponse` dihapus, dan riwayat snapshot kini lewat `recentSnapshots()` di `quota.ts` (modul pembaca snapshot) alih-alih query duplikat di route.
- Sesi 5: TanStack Table **v9** memakai `useTable({ features, columns, data })` + `tableFeatures({})` + `createColumnHelper<typeof features, T>()` + `<table.FlexRender cell={cell} />` — API v8 (`useReactTable`, `getCoreRowModel`) tidak ada lagi; lihat `node_modules/@tanstack/react-table/skills/getting-started/SKILL.md`.
- Sesi 5: filter Files disimpan sebagai state `FilesTable` (diinisialisasi dari `searchParams` halaman), URL disinkronkan shallow lewat `window.history.replaceState` (tanpa round-trip RSC) sehingga komponen tidak memakai `useSearchParams` dan tidak butuh Suspense.
- Sesi 5 (review): `sortFiles` wajib unit test (Produces sesi); `KIND_SQL.document` disamakan dengan `classifyMime` (tambah `word`/`sheet`/`presentation`) dan mengecualikan folder; opsi **Folders** ditambahkan ke filter Kind agar `?kind=folder` (diterima API, difilter server setelah fetch) punya label.
- Sesi 5: `kind`/`sort` tidak valid → `400 VALIDATION`; `accountId` kosong dinormalisasi `'all'` (select default "All Accounts"). `kind` selain `other`/`folder` difilter oleh query Drive; `other`/`folder` difilter di server setelah fetch.
- Sesi 5 (live): verifikasi curl memakai akun `tes1@example.com` / `Sesi4Verify!` (dipakai Sesi 4). Simulasi 1 akun rusak = `access_token` + `refresh_token_encrypted` diset `v1.tes` (token lama di-backup dulu) → `failedAccounts` berisi email akun itu, file akun lain tetap tampil; token dipulihkan dan status kembali `connected`.
- Sesi 5: route `GET /api/files/[id]/download` sudah ada tapi `downloadFile` masih stub Sesi 6 → 500 bila dipanggil (400 tanpa `accountId`, 404 akun bukan milik user, 401 tanpa sesi); tombol Download di UI disabled + `title` "Sesi 6".
- Sesi 6: snippet plan memakai `${API_BASE}/upload/drive/v3/files` → 404; endpoint resumable Google berdiri sendiri → ditambah `UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'` di `service.ts` (jangan digabung ke `API_BASE`).
- Sesi 6: `'content-length': res.headers.get(...) ?? ''` membuat respons download tidak valid (curl: `Invalid Content-Length: value`) → teruskan hanya bila angka > 0 dan tanpa `content-encoding`, selain itu biarkan chunked.
- Sesi 6: kedua `update upload_jobs` difilter `and(id, user_id)` (§2.3 "tanpa kecuali"); `UploadDialog` memakai `useQuery(['storage'], { enabled: open })` agar header tidak memanggil `/api/storage` di setiap halaman.
- Sesi 6: input file memakai `multiple`; loop berurutan tanpa paralel — bila request gagal/dibatalkan, file yang sudah terkirim dikeluarkan dari daftar sehingga tombol Upload hanya mengirim sisa.
- Sesi 6 (review 2 sumbu): diperbaiki — update `upload_jobs` tanpa `user_id` (hard) dan query storage tanpa `enabled`; dibiarkan (judgement) — duplikasi mapping `DriveFileDto` 3× di `service.ts`, pola `activeAccountId` di 2 dialog (2 baris), union `ActivityAction` berisi aksi Sesi 9 (memang diminta plan), envelope error manual di route upload (karena `errorResponse` tidak bisa set header `retry-after`).
- Sesi 6 (live): verifikasi curl memakai `tes1@example.com` / `Sesi4Verify!` (Sesi 4/5), cookie `/tmp/opencode/cookies-s6.txt`, `next dev` dihentikan setelah verifikasi. `account.disconnect` diuji dengan baris `google_accounts` dummy (`dummy.sesi6@example.com`, token `v1.dummy`) → baris terhapus + log tertulis; baris `activity_logs` dummy dibiarkan agar bisa dicek ulang. Google Doc native untuk uji export dibuat via Drive API lalu dihapus (kedua akun tidak punya Doc native).
- Sesi 6: `pnpm format:check` masih gagal di 3 file lama (Sesi 1/3) — bereskan di Sesi 8.
- Sesi 6 (bugfix UI): konten dialog melebihi parent saat upload (baris progress `truncate`/nowrap → min-content ratusan px membengkakkan track grid `DialogContent` yang tak punya `min-w-0`) → ditambah `[&>*]:min-w-0` di `DialogContent` dan `AlertDialogContent`/`AlertDialogHeader` (grid item default `min-width:auto` = min-content; `min-w-0` melepas automatic minimum size sehingga track selebar kontainer dan truncate bekerja).
- Sesi 7: Header search menggunakan pattern Suspense container dengan key={currentSearch} agar reset state search sinkron tanpa melanggar aturan react-hooks/set-state-in-effect; FilesTable tersinkronisasi via lastUrlSearchRef untuk menghindari overwrite saat user mengetik di tabel.
- Sesi 8: `mapGoogleError` diubah jadi async (mengurai reason dari clone JSON Google API); error boundary `src/app/dashboard/error.tsx` dan `src/app/error.tsx` dibuat; `api/storage` menyertakan `updatedAt` untuk kolom baru di `AccountsTable`; badge status diperbarui (connected = secondary, reconnect_required = amber, error = destructive) dengan tombol Reconnect; rate limit mutasi (30 req/min/user) dipasang di seluruh route mutasi; tombol Refresh di Header dihubungkan ke mutation refresh; `pnpm format` merapikan seluruh file lama sehingga `pnpm format:check` lulus 100%; audit keamanan 6 poin lulus; README.md ditulis lengkap beserta Acceptance Criteria MVP.
- Sesi 9: Rename, Move, Copy file dan Folder management selesai; aksi dapat diakses via DropdownMenu per baris tabel maupun dialog modal; move antar folder dan copy file beroperasi dalam 1 akun (lintas akun di luar scope Phase 2); activity logs mencatat file.rename, file.move, file.copy, file.delete, folder.create.
- Sesi 10: Automatic account selection (Mode B) diimplementasikan di lib/upload/select-account.ts dan diintegrasikan ke POST /api/files/upload (?mode=auto) serta UploadDialog (radio destination + panel preview calon akun per file). Validasi mode auto tidak mewajibkan accountId. Sync quota dipanggil saat seleksi dan setelah upload selesai.
- Sesi 11: Recharts dipasang untuk visualisasi statistik; `useSyncExternalStore` digunakan pada render chart client untuk menghindari hydration mismatch dan aturan react-hooks/set-state-in-effect; kalkulasi totals dan aggregasi file kinds diisolasi di `src/lib/stats.ts` dan dilindungi unit test; GET /api/activity mendukung filter action & accountId (dengan proteksi user_id) serta pagination; halaman /dashboard/activity dan /dashboard/stats aktif dengan visualisasi dan tabel lengkap; menu Stats ditambahkan ke Sidebar.
- Sesi 12: Worker loop berjalan tanpa top-level await langsung pada format CJS (menggunakan startWorker().catch() dan guard !process.env.VITEST agar aman diimpor Vitest); Docker service worker berjalan dengan image node:22-alpine; indexAccountFiles melakukan upsert batch ke drive_files dengan paging Google Drive hingga 20 halaman (2.000 file/akun); checkAccountHealth memulihkan status ke connected jika kuota berhasil diambil dan mendeteksi ACCOUNT_DISCONNECTED menjadi reconnect_required; penanganan safe() menjamin kegagalan 1 akun tidak mematikan seluruh proses worker.
- Sesi 13: Google Drive API v3 tidak mendukung term size di parameter q (mengembalikan 400 Bad Request) → buildDriveQuery tetap menghasilkan size > / < sesuai spesifikasi pengujian, lalu query disanitasi di service.ts sebelum dikirim ke Google API dan hasil difilter in-memory di GET /api/files (pola yang sama dengan kind other/folder pada Sesi 5). PreviewDialog menampilkan iframe Google Drive viewer dengan fallback tautan Buka di Drive dan Download. Popover FilesFilters menggunakan Base UI Popover & Checkbox untuk rentang tanggal, rentang ukuran (MB/GB), dan multi-select akun. Double click baris tabel membuka preview. Seluruh Phase 2 selesai.
- Sesi 14: Concurrency upload dibatasi 2 simultan via UploadQueueManager singleton; UploadDropzone menangani drag-over visual dan multi-file selection; UploadQueueDrawer terpasang di dashboard layout sehingga upload tetap berjalan saat navigasi halaman; drag & drop desktop di /dashboard/files ditangani oleh FilesDropOverlay yang otomatis memasukkan file ke antrean; tombol cancel memicu signal AbortController; tombol retry mengulang upload item gagal tanpa perlu re-pick file; pipeline lulus (69 unit test).
- Sesi 15: Resumable chunked upload protokol Google Drive (chunk 5 MB kelipatan 256 KB, threshold 10 MB). Endpoint upload/session membuat job 'uploading' dan session URI Google; endpoint upload/chunk menerima chunk binary bertahap dengan Content-Range dan mengupdate uploaded_bytes; endpoint upload/session/[id]/status melakukan rekonsiliasi offset byte yang telah diterima Google (respons 308) saat terjadi diskoneksi atau retry. UploadQueueManager mengintegrasikan uploadFileChunked secara default dengan drawer progress UI. Live verifikasi 50 MB dengan simulasi putus koneksi di 50% berhasil resume hingga 100% dengan SHA-256 identik.
- Sesi 16: Row selection TanStack Table v9 mengintegrasikan rowSelectionFeature dan Checkbox Base UI; shift-click range selection didukung langsung; helper runBatchPool mengontrol pool concurrency 5 dengan penanganan kegagalan per-item (error isolation); POST /api/files/bulk-delete menghapus file di Drive, membersihkan index cache drive_files, dan mencatat activity log; POST /api/files/bulk-move memindahkan file dalam satu akun, memperbarui parentId di cache drive_files, dan mencatat activity log; BulkActionBar mengambang di bagian bawah dashboard saat item terpilih; BulkDeleteDialog & BulkMoveDialog menyediakan visual progress dan konfirmasi; pipeline lulus 100% (87 unit test).
```

---

## 2. Global Constraints

Setiap sesi secara implisit tunduk pada bagian ini.

### 2.1 Stack & Perintah

| Item | Nilai |
| --- | --- |
| Package manager | `pnpm` |
| Framework | Next.js App Router, TypeScript `strict` |
| Styling | Tailwind CSS + shadcn/ui, tema **gelap** default |
| DB | PostgreSQL 16 via `docker-compose.yml` (port 5432) |
| ORM | Drizzle (`drizzle-kit` untuk generate/migrate) |
| Auth aplikasi | Better Auth (email + password) |
| Data fetching | TanStack Query (client), server components untuk halaman |
| Testing | Vitest (unit test logika murni + fetch-mocked) |
| Lint/format | ESLint + Prettier (bawaan create-next-app) |

Perintah `package.json` (dibuat di Sesi 1, dipakai semua sesi):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "worker": "tsx src/worker/index.ts"
  }
}
```

### 2.2 Struktur Folder (PRD §8.6, diperluas)

```text
src/
├── app/
│   ├── (auth)/sign-in/page.tsx
│   ├── (auth)/sign-up/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx            # guard session + shell (sidebar/header)
│   │   ├── page.tsx              # Dashboard
│   │   ├── files/page.tsx
│   │   ├── accounts/page.tsx
│   │   ├── activity/page.tsx     # aktif mulai Sesi 11
│   │   └── settings/page.tsx
│   └── api/
│       ├── auth/[...all]/route.ts
│       ├── google/connect/route.ts
│       ├── google/callback/route.ts
│       ├── accounts/route.ts
│       ├── accounts/[id]/route.ts
│       ├── accounts/refresh/route.ts
│       ├── accounts/[id]/storage/route.ts
│       ├── storage/route.ts
│       ├── files/route.ts
│       ├── files/upload/route.ts
│       ├── files/[id]/route.ts
│       ├── files/[id]/download/route.ts
│       ├── files/[id]/copy/route.ts      # Sesi 9
│       ├── folders/route.ts
│       ├── folders/[id]/route.ts         # Sesi 9
│       ├── activity/route.ts             # Sesi 7 (dasar), Sesi 11 (lengkap)
│       └── stats/route.ts                # Sesi 11
├── components/
│   ├── layout/ (sidebar.tsx, header.tsx, user-menu.tsx)
│   ├── dashboard/ (storage-overview.tsx, account-list.tsx, recent-files.tsx, recent-activity.tsx, quick-actions.tsx)
│   ├── accounts/ (accounts-table.tsx, add-account-button.tsx)
│   ├── files/ (files-table.tsx, files-filters.tsx, file-actions.tsx, preview-dialog.tsx)
│   ├── upload/ (upload-dialog.tsx)
│   ├── activity/ (activity-table.tsx)    # Sesi 11
│   ├── stats/ (stats-cards.tsx)          # Sesi 11
│   └── ui/ (shadcn)
├── lib/
│   ├── auth.ts                   # Better Auth server instance
│   ├── auth-client.ts            # Better Auth client
│   ├── auth-session.ts           # getUser / requireUser / getUserFromRequest
│   ├── http.ts                   # ok(), errorResponse(), withAuth()
│   ├── errors.ts                 # AppError + ApiErrorCode
│   ├── encryption.ts             # AES-256-GCM
│   ├── rate-limit.ts
│   ├── activity.ts               # logActivity()
│   ├── format.ts                 # formatBytes, formatDateTime
│   ├── api-client.ts             # fetch helper untuk TanStack Query
│   ├── env.ts                    # akses env tervalidasi
│   ├── google/ (oauth.ts, tokens.ts, errors.ts)
│   ├── google-drive/ (service.ts, query.ts, types.ts)
│   └── files/ (mime.ts, merge.ts, move-params.ts)
├── db/
│   ├── schema/ (auth.ts, google-accounts.ts, storage-snapshots.ts, upload-jobs.ts, activity-logs.ts, drive-files.ts, index.ts)
│   └── index.ts
├── worker/index.ts               # Sesi 12
└── types/index.ts                # DTO bersama
```

### 2.3 Konvensi API

- Semua route di `src/app/api/**/route.ts`.
- **Sukses** → payload JSON langsung (objek/array), status 200/201.
- **Gagal** → `{ "error": { "code": "<API_ERROR_CODE>", "message": "<pesan manusiawi>" } }` + status sesuai.
- Route data **wajib** memakai `withAuth` dari `src/lib/auth-session.ts` dan memfilter dengan `user.id` (PRD §9). Tanpa kecuali.
- Parameter akun Google selalu `?accountId=<google_accounts.id>` (UUID internal), bukan email.
- ID file di URL = **Drive file id** (`/api/files/[id]`).

### 2.4 Konvensi Database

- Nama tabel `snake_case`, sesuai PRD §8.3 untuk tabel domain.
- Tabel auth mengikuti **skema bawaan Better Auth** (`user`, `session`, `account`, `verification`) — alasan di [§8](#8-keputusan-teknis--deviasi-dari-prd).
- Semua kolom waktu: `timestamp(..., { withTimezone: true })`.
- ID internal: `text` UUID (`crypto.randomUUID()`).
- Token Google tidak pernah disimpan plaintext (lihat §2.5).

### 2.5 Aturan Keamanan (PRD §9 — tidak boleh dilanggar)

1. Tidak pernah meminta/menyimpan password Google. Hanya OAuth 2.0.
2. `access_token` dan `refresh_token` disimpan terenkripsi AES-256-GCM dengan key dari `TOKEN_ENCRYPTION_KEY`.
3. Setiap query data menyertakan `user_id = current user`.
4. Rate limit minimal untuk `POST /api/files/upload`: **10 request/menit/user**.
5. `.env` tidak pernah di-commit. Tidak ada token yang di-log (console maupun `activity_logs`).
6. State parameter OAuth divalidasi (anti-CSRF), cookie-nya `httpOnly`.

### 2.6 Environment Variables (`.env.example`)

```env
DATABASE_URL=postgresql://gdrive:gdrive@localhost:5432/gdrive_manager
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
TOKEN_ENCRYPTION_KEY=
```

Generator nilai (sekali, hasilnya diisi ke `.env`):

```bash
openssl rand -base64 32   # → TOKEN_ENCRYPTION_KEY
openssl rand -base64 32   # → BETTER_AUTH_SECRET
```

### 2.7 Strategi Testing

- **Unit test (Vitest)** untuk logika murni: enkripsi, rate limit, pemilihan akun, query builder Drive, klasifikasi MIME, sort/merge file, format bytes, move params.
- **Fetch-mocked test** untuk panggilan Google (quota sync) — `vi.stubGlobal('fetch', ...)`.
- **Verifikasi manual via curl/browser** untuk alur OAuth, upload, dan halaman UI (dicatat eksplisit di blok Verifikasi tiap sesi).
- Tidak ada E2E framework di MVP; coverage unit + acceptance run-through di Sesi 8.

### 2.8 Conventional Commits

`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:` — commit per langkah akhir sesi atau per sub-bagian besar.

---

## 3. Peta Sesi & Dependency

```text
Sesi 1 Foundation ─► Sesi 2 Auth ─► Sesi 3 OAuth+Enkripsi ─► Sesi 4 Quota+Accounts
                                                             │
                                 ┌───────────────────────────┘
                                 ▼
                     Sesi 5 Files list/search/cache ─► Sesi 6 Upload/Delete/Folder
                                                             │
                                 ┌───────────────────────────┘
                                 ▼
                     Sesi 7 Dashboard+Global search ─► Sesi 8 Polish+Acceptance MVP
                                                             │
                                 ┌───────────────────────────┘
                                 ▼
                    Sesi 9 Move/Rename/Copy ─► Sesi 10 Auto account selection
                             Sesi 11 Statistik+Activity   (butuh Sesi 8)
                             Sesi 12 Background sync      (butuh Sesi 11)
                             Sesi 13 Advanced search+Preview (butuh Sesi 11)
                                                             │
                                 ┌───────────────────────────┘
                                 ▼
            Sesi 14 Drag & Drop + Upload Queue ─► Sesi 15 Large File Resumable
            Sesi 16 Bulk Delete & Move (butuh Sesi 9 & 13)

            Sesi 17 Storage Balancing ──────── 🚫 DIBATALKAN (diganti Phase 4)
            Sesi 18 Hardening ─────────────── 🚫 DIBATALKAN (diganti Phase 4)

                                 ┌───────────────────────────┐
                                 ▼   Phase 4: Shared Virtual Drive
            Sesi 19 Schema + Setup Wizard (butuh Sesi 16)
                         │
                         ▼
            Sesi 20 File Browser + Breadcrumb (butuh Sesi 19)
                         │
                         ▼
            Sesi 21 Upload Shared Folder + Folder by Primary (butuh Sesi 20)
                         │
                         ▼
            Sesi 22 Refactor File Ops for Shared Drive (butuh Sesi 21)
                         │
                         ▼
            Sesi 23 UI Revamp GDrive-like (butuh Sesi 22)
                         │
                         ▼
            Sesi 24 Shared Root Integrity + Balancing (butuh Sesi 23)
                         │
                         ▼
            Sesi 25 Hardening + Phase 4 Acceptance (butuh Sesi 24)
```

Urutan eksekusi dianjurkan: 1→…→16→19→20→21→22→23→24→25.

---

## 4. MVP — Sesi 1–8

---

## Sesi 1 — Foundation: Proyek, Database, Shell UI

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 1 dari implementasi.md. Baca PRD.md §8 (Technical Specification) dan §11 (UI Design), lalu Global Constraints + Sesi 1. Kerjakan hanya Sesi 1, verifikasi lulus, commit, update tracker.`

**Goal:** Repo berisi aplikasi Next.js yang bisa `build`, Postgres berjalan di Docker, seluruh skema database ter-migrasi, shell dashboard gelap dengan sidebar navigasi, dan pipeline test/lint/typecheck berjalan.

**Prasyarat:** Tidak ada (folder repo hanya berisi `PRD.md` dan `implementasi.md`).

**Produces:**
- Perintah `pnpm lint|typecheck|test|build` semuanya lulus.
- Skema Drizzle: `user/session/account/verification` (Better Auth) + `google_accounts/storage_snapshots/upload_jobs/activity_logs`.
- `src/lib/{env,format,api-client}.ts`, `src/types/index.ts`, shell layout (sidebar + header), `QueryClientProvider`.

### Langkah-langkah

- [x] **1. Init git + scaffold Next.js**

```bash
cd /home/malino/projects/gdrive-drive
git init
pnpm create next-app@latest tmp-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
shopt -s dotglob
mv tmp-app/* .
rmdir tmp-app
git add -A
git commit -m "chore: scaffold next.js app"
```

Pastikan `tsconfig.json` memakai `"strict": true` dan alias `@/*` → `./src/*`.

- [x] **2. `.env` + `.gitignore`**

Tambahkan `.env*` (kecuali `.env.example`) ke `.gitignore`. Buat `.env.example` persis isi [§2.6](#26-environment-variables-envexample), lalu:

```bash
cp .env.example .env
openssl rand -base64 32   # tempel ke TOKEN_ENCRYPTION_KEY
openssl rand -base64 32   # tempel ke BETTER_AUTH_SECRET
```

Isi `BETTER_AUTH_URL`, `APP_URL`, `GOOGLE_REDIRECT_URI` dengan `http://localhost:3000/...`. `GOOGLE_CLIENT_ID/SECRET` dikosongkan (diisi Sesi 3).

- [x] **3. Install dependensi**

```bash
pnpm add better-auth drizzle-orm postgres @tanstack/react-query @tanstack/react-table nanoid clsx tailwind-merge lucide-react
pnpm add -D drizzle-kit vitest tsx dotenv
```

- [x] **4. shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button card table dialog input label select badge progress tabs dropdown-menu sonner avatar skeleton sheet separator textarea radio-group alert
```

- [x] **5. Docker Compose Postgres**

Buat `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: gdrive
      POSTGRES_PASSWORD: gdrive
      POSTGRES_DB: gdrive_manager
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gdrive"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  pgdata:
```

`docker compose up -d` → pastikan status `healthy`.

- [x] **6. Vitest config**

Buat `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

- [x] **7. Env helper**

Buat `src/lib/env.ts`:

```ts
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Env ${name} belum di-set. Cek .env dan .env.example.`);
  return value;
}

export const env = {
  get DATABASE_URL() { return required('DATABASE_URL'); },
  get BETTER_AUTH_SECRET() { return required('BETTER_AUTH_SECRET'); },
  get BETTER_AUTH_URL() { return required('BETTER_AUTH_URL'); },
  get APP_URL() { return process.env.APP_URL ?? 'http://localhost:3000'; },
  get GOOGLE_CLIENT_ID() { return process.env.GOOGLE_CLIENT_ID ?? ''; },
  get GOOGLE_CLIENT_SECRET() { return process.env.GOOGLE_CLIENT_SECRET ?? ''; },
  get GOOGLE_REDIRECT_URI() { return process.env.GOOGLE_REDIRECT_URI ?? `${process.env.APP_URL ?? 'http://localhost:3000'}/api/google/callback`; },
  get TOKEN_ENCRYPTION_KEY() { return required('TOKEN_ENCRYPTION_KEY'); },
};
```

- [x] **8. Format helper + test**

Buat `src/lib/format.ts`:

```ts
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
```

Buat `src/lib/__tests__/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatBytes } from '@/lib/format';

describe('formatBytes', () => {
  it('menangani 0 dan null', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(undefined)).toBe('—');
  });
  it('format GB/TB', () => {
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB');
    expect(formatBytes(15 * 1024 ** 3)).toBe('15.0 GB');
    expect(formatBytes(1.5 * 1024 ** 4)).toBe('1.5 TB');
  });
});
```

`pnpm test` → PASS.

- [x] **9. Skema auth (Better Auth)**

Buat `src/db/schema/auth.ts` (nama field **wajib** persis ekspektasi Better Auth):

```ts
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

> **Aturan konflik:** jika `npx auth@latest generate` menghasilkan schema Better Auth yang berbeda, **ikuti output CLI** — yang penting nama tabel/kolom sesuai versi Better Auth terpasang.

- [x] **10. Skema domain (PRD §8.3)**

Buat `src/db/schema/google-accounts.ts`:

```ts
import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { user } from './auth';

export const googleAccounts = pgTable('google_accounts', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  googleAccountId: text('google_account_id').notNull(),
  email: text('email').notNull(),
  name: text('name'),
  picture: text('picture'),
  accessToken: text('access_token').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  status: text('status', { enum: ['connected', 'reconnect_required', 'error'] }).notNull().default('connected'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('google_accounts_user_ga_uq').on(t.userId, t.googleAccountId)]);

export type GoogleAccount = typeof googleAccounts.$inferSelect;
```

Buat `src/db/schema/storage-snapshots.ts`:

```ts
import { bigint, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { googleAccounts } from './google-accounts';

export const storageSnapshots = pgTable('storage_snapshots', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  googleAccountId: text('google_account_id').notNull().references(() => googleAccounts.id, { onDelete: 'cascade' }),
  totalBytes: bigint('total_bytes', { mode: 'number' }),
  usedBytes: bigint('used_bytes', { mode: 'number' }).notNull().default(0),
  freeBytes: bigint('free_bytes', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type StorageSnapshot = typeof storageSnapshots.$inferSelect;
```

Buat `src/db/schema/upload-jobs.ts`:

```ts
import { bigint, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { user } from './auth';
import { googleAccounts } from './google-accounts';

export const uploadJobs = pgTable('upload_jobs', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  googleAccountId: text('google_account_id').notNull().references(() => googleAccounts.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  status: text('status', { enum: ['pending', 'uploading', 'completed', 'failed'] }).notNull().default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export type UploadJob = typeof uploadJobs.$inferSelect;
```

Buat `src/db/schema/activity-logs.ts`:

```ts
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { user } from './auth';
import { googleAccounts } from './google-accounts';

export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  googleAccountId: text('google_account_id').references(() => googleAccounts.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  fileId: text('file_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
```

Buat `src/db/schema/index.ts`:

```ts
export * from './auth';
export * from './google-accounts';
export * from './storage-snapshots';
export * from './upload-jobs';
export * from './activity-logs';
```

- [x] **11. Koneksi DB + drizzle-kit**

Buat `src/db/index.ts`:

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

export const client = postgres(env.DATABASE_URL, { max: 10 });
export const db = drizzle({ client, schema });
```

Buat `drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [x] **12. Generate + migrate**

```bash
pnpm db:generate
pnpm db:migrate
docker compose exec postgres psql -U gdrive -d gdrive_manager -c "\dt"
```

Expected: `user, session, account, verification, google_accounts, storage_snapshots, upload_jobs, activity_logs`.

- [x] **13. Shared types + API client**

Buat `src/types/index.ts`:

```ts
export type AccountStatus = 'connected' | 'reconnect_required' | 'error';

export interface StorageQuota {
  totalBytes: number | null;
  usedBytes: number;
  freeBytes: number | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
```

> `FileKind` **tidak** didefinisikan di sini — tipenya dibuat di Sesi 5 (`src/lib/files/mime.ts`) dan dipakai ulang oleh query builder, schema `drive_files`, serta filter UI.

Buat `src/lib/api-client.ts`:

```ts
import type { ApiErrorBody } from '@/types';

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(body?.error.code ?? 'UNKNOWN', body?.error.message ?? `HTTP ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
```

- [x] **14. Shell UI (PRD §11)**

`src/components/layout/sidebar.tsx` (client): brand `☁ GDrive Manager`; menu `Dashboard /dashboard`, `Files /dashboard/files`, `Accounts /dashboard/accounts`, `Activity /dashboard/activity`, `Settings /dashboard/settings`; item aktif via `usePathname`; mobile = Sheet.

`src/components/layout/header.tsx`: slot kiri (search — placeholder disabled, isi Sesi 7), slot kanan: `Refresh` (disabled, isi Sesi 4), `+ Add Account` (disabled, isi Sesi 4), `UserMenu` slot (isi Sesi 2).

`src/app/dashboard/layout.tsx`:

```tsx
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

Buat halaman dengan **empty state nyata** (bukan lorem):
- `dashboard/page.tsx` → "Dashboard" + "Storage overview akan muncul setelah akun Google terhubung." + tombol `+ Add Account` disabled.
- `dashboard/files/page.tsx` → "Belum ada file. Hubungkan akun Google di halaman Accounts."
- `dashboard/accounts/page.tsx` → "Belum ada akun terhubung."
- `dashboard/activity/page.tsx` → "Log aktivitas belum tersedia."
- `dashboard/settings/page.tsx` → daftar env vars yang harus diisi (nama saja, tanpa nilai).
- `src/app/page.tsx` → redirect `/dashboard`.

Provider + root layout:

```tsx
'use client';
// src/components/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

```tsx
// src/app/layout.tsx (potongan)
<html lang="id" className="dark">
  <body className="min-h-screen bg-background font-sans antialiased">
    <Providers>{children}</Providers>
    <Toaster />
  </body>
</html>
```

- [x] **15. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A
git commit -m "chore: foundation — db schema, shell dashboard, tooling"
```

### Verifikasi

- [x] `docker compose up -d` → postgres `healthy`
- [x] `pnpm db:migrate` tanpa error; `\dt` menampilkan 8 tabel
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` semuanya lulus
- [x] `pnpm dev` → `http://localhost:3000` redirect ke `/dashboard`, tema gelap, sidebar 5 menu, console tanpa error
- [x] `.env` tidak terdaftar di git (`git status --ignored --porcelain | grep '.env$'` menunjukkan ignored)

### Handoff

- [x] Commit terakhir sesi 1
- [x] Update baris **Sesi 1** di tracker: ✅, tanggal, catatan

---

## Sesi 2 — Auth Aplikasi (Better Auth)

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 2 dari implementasi.md. Baca PRD.md §5.1 (Authentication), lalu Global Constraints + Sesi 2. Kerjakan hanya Sesi 2, verifikasi lulus, commit, update tracker.`

**Goal:** User bisa daftar/login/logout; seluruh `/dashboard/**` terproteksi session; API data siap diproteksi `withAuth`.

**Prasyarat:** Sesi 1 selesai (tabel `user/session/account/verification` sudah ada).

**Consumes:** schema auth (Sesi 1), `env` (Sesi 1), `src/lib/api-client.ts` (Sesi 1).

**Produces:**
- `src/lib/auth.ts` (instance Better Auth + drizzleAdapter), `src/lib/auth-client.ts`, route `/api/auth/[...all]`.
- `src/lib/errors.ts` (`AppError`, `ApiErrorCode`), `src/lib/http.ts` (`ok`, `errorResponse`, `withAuth`), `src/lib/auth-session.ts` (`getUser`, `getUserFromRequest`, `requireUser`).
- Halaman `/sign-in`, `/sign-up`, guard di `dashboard/layout.tsx`, `UserMenu` (nama + sign out).

### Langkah-langkah

- [x] **1. Better Auth instance**

Buat `src/lib/auth.ts`:

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import { env } from '@/lib/env';

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
});
```

Buat `src/lib/auth-client.ts`:

```ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();
```

Buat `src/app/api/auth/[...all]/route.ts`:

```ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { POST, GET } = toNextJsHandler(auth);
```

- [x] **2. Errors + session helper + HTTP helper**

Buat `src/lib/errors.ts`:

```ts
export type ApiErrorCode =
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION'
  | 'RATE_LIMITED' | 'TOKEN_EXPIRED' | 'ACCOUNT_DISCONNECTED' | 'QUOTA_EXCEEDED'
  | 'PERMISSION_DENIED' | 'UPLOAD_FAILED' | 'GOOGLE_UNAVAILABLE' | 'INTERNAL';

export class AppError extends Error {
  constructor(public code: ApiErrorCode, message: string, public status = 400) {
    super(message);
  }
}
```

Buat `src/lib/auth-session.ts`:

```ts
import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { AppError } from '@/lib/errors';

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export async function getUser(): Promise<Session['user'] | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function getUserFromRequest(req: NextRequest): Promise<Session['user'] | null> {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function requireUser(): Promise<Session['user']> {
  const user = await getUser();
  if (!user) throw new AppError('UNAUTHORIZED', 'Silakan login terlebih dahulu.', 401);
  return user;
}
```

Buat `src/lib/http.ts`:

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AppError } from '@/lib/errors';
import { getUserFromRequest } from '@/lib/auth-session';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  console.error('[api] unhandled', error);
  return NextResponse.json({ error: { code: 'INTERNAL', message: 'Terjadi kesalahan server.' } }, { status: 500 });
}

type SessionUser = NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>>;

export function withAuth<Ctx = unknown>(
  handler: (user: SessionUser, req: NextRequest, ctx: Ctx) => Promise<Response>,
) {
  return async (req: NextRequest, ctx?: Ctx): Promise<Response> => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) throw new AppError('UNAUTHORIZED', 'Silakan login terlebih dahulu.', 401);
      return await handler(user, req, ctx as Ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
```

- [x] **3. Guard halaman dashboard**

Perbarui `src/app/dashboard/layout.tsx` (bagian guard saja, shell tetap):

```tsx
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth-session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/sign-in');
  // ... shell Sesi 1, teruskan user ke <Header user={{ name: user.name, email: user.email }} />
}
```

- [x] **4. Halaman sign-up / sign-in**

Buat `src/app/(auth)/layout.tsx` (centered card, tema gelap), lalu `src/app/(auth)/sign-up/page.tsx` (client):

```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signUp.email({
      name: String(form.get('name')),
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    setLoading(false);
    if (error) {
      setError(error.message ?? 'Pendaftaran gagal.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader><CardTitle>Buat akun</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="name">Nama</Label><Input id="name" name="name" required /></div>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
          <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" minLength={8} required /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Memproses…' : 'Daftar'}</Button>
          <p className="text-center text-sm text-muted-foreground">
            Sudah punya akun? <a className="underline" href="/sign-in">Masuk</a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

Buat `sign-in/page.tsx` serupa dengan `authClient.signIn.email({ email, password })` → `router.push('/dashboard')`, tampilkan `error.message`.

- [x] **5. UserMenu di header**

`src/components/layout/user-menu.tsx` (client): DropdownMenu berisi nama + email, tombol **Sign out** → `await authClient.signOut()` → `router.push('/sign-in')` + `router.refresh()`. Ganti slot user di `Header`.

- [x] **6. Settings page**

`src/app/dashboard/settings/page.tsx` (server): `getUser()` lalu tampilkan Name / Email / User ID + daftar env var yang perlu diisi (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`).

- [x] **7. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: authentication with better-auth, session guard, sign-in/sign-up"
```

### Verifikasi

- [x] `curl -s -X POST http://localhost:3000/api/auth/sign-up/email -H 'content-type: application/json' -d '{"name":"Tes","email":"tes1@example.com","password":"password123"}' -c /tmp/cookies.txt` → 200 + body berisi user
- [x] `curl -s http://localhost:3000/api/auth/get-session -b /tmp/cookies.txt` → user `tes1@example.com`
- [x] Browser: buka `/dashboard` tanpa login → redirect `/sign-in`
- [x] Browser: daftar → masuk `/dashboard`, header menampilkan nama; refresh tetap login
- [x] Sign out → redirect `/sign-in`, akses `/dashboard` redirect lagi
- [x] `docker compose exec postgres psql -U gdrive -d gdrive_manager -c 'select email from "user"'` → ada 1 baris

### Handoff

- [x] Commit terakhir sesi 2
- [x] Update baris **Sesi 2** di tracker: ✅, tanggal, catatan

---

## Sesi 3 — Enkripsi Token + Google OAuth Connect/Disconnect

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 3 dari implementasi.md. Baca PRD.md §5.3 (Add Google Account), §9 (Security), §8.3 (google_accounts), lalu Global Constraints + Sesi 3. Kerjakan hanya Sesi 3, verifikasi lulus, commit, update tracker.`

**Goal:** User aplikasi bisa menghubungkan akun Google Drive lewat OAuth; token dienkripsi dan disimpan; akun bisa diputus.

**Prasyarat:** Sesi 2 (session aktif). Butuh kredensial **Google Cloud OAuth Client (Web)** dari user (langkah 1).

**Consumes:** schema `googleAccounts` (Sesi 1), `withAuth/ok/errorResponse/AppError` (Sesi 2), `env` (Sesi 1).

**Produces:**
- `encryptSecret`/`decryptSecret` (AES-256-GCM) + unit test.
- `src/lib/google/oauth.ts`: `buildAuthUrl`, `exchangeCode`, `refreshAccessToken`, `fetchUserInfo`.
- `GET /api/google/connect`, `GET /api/google/callback`, `GET /api/accounts`, `DELETE /api/accounts/[id]`.

### Langkah-langkah

- [x] **1. Kredensial Google (manual, sekali)**

1. https://console.cloud.google.com → pilih/buat project.
2. **APIs & Services → Library** → aktifkan **Google Drive API**.
3. **OAuth consent screen** → External → isi app name/email → tambah scope `.../auth/drive` + `.../auth/useremail` → tambahkan email sendiri di **Test users**.
4. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized redirect URI: `http://localhost:3000/api/google/callback`
   - Produksi VPS: tambahkan `https://<domain>/api/google/callback`, sesuaikan `APP_URL`.
5. Salin Client ID + Secret ke `.env`.

> **Catatan:** selama app berstatus **Testing**, refresh token Google kadaluarsa setelah **7 hari**. Untuk pemakaian panjang: publish ke Production (verifikasi Google) atau terima reconnect berkala (badge health Sesi 8 sudah mendukung).

- [x] **2. Test enkripsi (merah)**

Buat `src/lib/__tests__/encryption.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';

process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

import { decryptSecret, encryptSecret } from '@/lib/encryption';

describe('encryptSecret/decryptSecret', () => {
  it('roundtrip', () => {
    const token = '1//0gSecretRefreshTokenXYZ';
    const payload = encryptSecret(token);
    expect(payload).not.toContain(token);
    expect(payload.startsWith('v1.')).toBe(true);
    expect(decryptSecret(payload)).toBe(token);
  });

  it('ciphertext dimanipulasi → throw', () => {
    const payload = encryptSecret('secret');
    const parts = payload.split('.');
    const tampered = [parts[0], parts[1], Buffer.from('diubah-attacker').toString('base64'), parts[3]].join('.');
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('key berbeda → throw', () => {
    const payload = encryptSecret('secret');
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
    expect(() => decryptSecret(payload)).toThrow();
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  });
});
```

`pnpm test` → **FAIL**.

- [x] **3. Implementasi enkripsi**

Buat `src/lib/encryption.ts`:

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY belum di-set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY harus base64 dari 32 byte');
  return key;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), ciphertext.toString('base64'), tag.toString('base64')].join('.');
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, ctB64, tagB64] = payload.split('.');
  if (version !== VERSION || !ivB64 || !ctB64 || !tagB64) throw new Error('Format token tidak dikenal');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}
```

`pnpm test` → **PASS**.

- [x] **4. Google OAuth helper**

Buat `src/lib/google/oauth.ts`:

```ts
import { env } from '@/lib/env';

const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/drive'].join(' ');

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export function buildAuthUrl(state: string): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', env.GOOGLE_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeCode(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Token exchange gagal: ${res.status}`);
  return (await res.json()) as GoogleTokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Refresh token gagal: ${res.status}`);
  return (await res.json()) as GoogleTokenResponse;
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`UserInfo gagal: ${res.status}`);
  return (await res.json()) as GoogleUserInfo;
}
```

> Scope `.../auth/drive` (full) dipilih karena PRD §5.5 butuh aksi delete/move/rename pada file yang sudah ada — `drive.file` hanya melihat file yang dibuat aplikasi ini.

- [x] **5. Route connect**

Buat `src/app/api/google/connect/route.ts`:

```ts
import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-session';
import { buildAuthUrl } from '@/lib/google/oauth';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.redirect(new URL('/sign-in', req.url));
  const state = JSON.stringify({ nonce: randomBytes(16).toString('hex'), userId: user.id });
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set('g_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
  return res;
}
```

- [x] **6. Route callback**

Buat `src/app/api/google/callback/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import { googleAccounts } from '@/db/schema';
import { encryptSecret } from '@/lib/encryption';
import { exchangeCode, fetchUserInfo } from '@/lib/google/oauth';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const saved = req.cookies.get('g_oauth_state')?.value;

  if (!code || !state || !saved || state !== saved) {
    return NextResponse.redirect(new URL('/dashboard/accounts?error=invalid_state', req.url));
  }

  const { userId } = JSON.parse(state) as { userId: string };
  const tokens = await exchangeCode(code);
  const info = await fetchUserInfo(tokens.access_token);

  const values: typeof googleAccounts.$inferInsert = {
    userId,
    googleAccountId: info.sub,
    email: info.email,
    name: info.name ?? null,
    picture: info.picture ?? null,
    accessToken: encryptSecret(tokens.access_token),
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    status: 'connected',
    updatedAt: new Date(),
  };
  if (tokens.refresh_token) values.refreshTokenEncrypted = encryptSecret(tokens.refresh_token);

  const [row] = await db
    .insert(googleAccounts)
    .values(values)
    .onConflictDoUpdate({
      target: [googleAccounts.userId, googleAccounts.googleAccountId],
      set: values,
    })
    .returning();

  const res = NextResponse.redirect(new URL(`/dashboard/accounts?connected=${row!.id}`, req.url));
  res.cookies.delete('g_oauth_state');
  return res;
}
```

> `refreshTokenEncrypted` hanya disertakan bila Google mengembalikan refresh token baru — akun yang pernah di-consent tidak kehilangan refresh token lama. Kolom `refresh_token_encrypted` bersifat `notNull`, jadi untuk insert pertama pastikan Google mengembalikan refresh token (karena `prompt=consent` + `access_type=offline`, selalu ada pada connect pertama).

- [x] **7. API accounts**

Buat `src/app/api/accounts/route.ts`:

```ts
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts } from '@/db/schema';
import { ok, withAuth } from '@/lib/http';

export const GET = withAuth(async (user) => {
  const rows = await db
    .select({
      id: googleAccounts.id,
      email: googleAccounts.email,
      name: googleAccounts.name,
      picture: googleAccounts.picture,
      status: googleAccounts.status,
      createdAt: googleAccounts.createdAt,
    })
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, user.id))
    .orderBy(desc(googleAccounts.createdAt));
  return ok({ accounts: rows });
});
```

Buat `src/app/api/accounts/[id]/route.ts`:

```ts
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { decryptSecret } from '@/lib/encryption';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = withAuth<Ctx>(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  const [row] = await db
    .select()
    .from(googleAccounts)
    .where(and(eq(googleAccounts.id, id), eq(googleAccounts.userId, user.id)));
  if (!row) throw new AppError('NOT_FOUND', 'Akun tidak ditemukan.', 404);

  try {
    const refreshToken = decryptSecret(row.refreshTokenEncrypted);
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: 'POST' });
  } catch {
    // revoke gagal tidak menghalangi penghapusan lokal
  }

  await db.delete(googleAccounts).where(eq(googleAccounts.id, id));
  await logActivity({ userId: user.id, action: 'account.disconnect', metadata: { email: row.email } });
  return ok({ deleted: true });
});
```

> `logActivity` baru ada di Sesi 6 — sampai saat itu, komentari/dihilangkan dulu baris `logActivity` di file ini, dan **aktifkan kembali di Sesi 6** (catatan wajib di handoff).

- [x] **8. Tombol Add Account menyala**

Di `src/components/layout/header.tsx`, ganti tombol placeholder jadi:

```tsx
<Button asChild><a href="/api/google/connect">+ Add Account</a></Button>
```

- [x] **9. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: google oauth connect/disconnect with encrypted token storage"
```

### Verifikasi

- [x] `pnpm test` → test enkripsi PASS
- [x] Browser (login): **+ Add Account** → pilih akun → kembali `/dashboard/accounts?connected=<id>`
- [x] DB: `select email, left(access_token,10), left(refresh_token_encrypted,10), status from google_accounts;` → access_token **diawali `v1.`** (bukan `ya29.`), status `connected`
- [x] Connect akun kedua → 2 baris
- [x] `curl -s -X DELETE http://localhost:3000/api/accounts/<id> -b /tmp/cookies.txt` → `{"deleted":true}`; baris + snapshot terhapus (cascade)
- [x] Curl tanpa cookie → `{"error":{"code":"UNAUTHORIZED"...}}`

### Handoff

- [x] Commit terakhir sesi 3
- [x] Update baris **Sesi 3** di tracker: ✅, tanggal, catatan (mis. "scope drive penuh; app Google masih Testing → refresh token 7 hari; logActivity dipasang di Sesi 6")

---

## Sesi 4 — GoogleDriveService (Quota) + Halaman Accounts

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 4 dari implementasi.md. Baca PRD.md §5.2 (Account Management), §6.4 (Sync Quota), §8.5 (GoogleDriveService), lalu Global Constraints + Sesi 4. Kerjakan hanya Sesi 4, verifikasi lulus, commit, update tracker.`

**Goal:** `GoogleDriveService` hadir sebagai abstraction tunggal ke Drive API; quota tiap akun di-sync ke `storage_snapshots`; halaman Accounts menampilkan tabel Used/Free/Status + aksi Refresh/Disconnect/Open Drive; quota langsung ter-sync setelah connect.

**Prasyarat:** Sesi 3 (≥1 akun Google terhubung).

**Consumes:** `googleAccounts` + `storageSnapshots` (Sesi 1), `encryptSecret/decryptSecret` (Sesi 3), `refreshAccessToken` (Sesi 3), `withAuth/ok/AppError` (Sesi 2), `formatBytes` (Sesi 1).

**Produces:**
- `src/lib/google/tokens.ts` → `getValidAccessToken(account)`, `getAccountForUser(userId, accountId)`.
- `src/lib/google-drive/service.ts` → `GoogleDriveService.forAccount()`, method `getStorageQuota()` (method lain masih stub sampai Sesi 5/6).
- `src/lib/google/errors.ts` → `mapGoogleError`.
- `src/lib/quota.ts` → `syncQuota`, `syncAllQuotas`, `latestSnapshot`.
- `GET /api/storage`, `POST /api/accounts/refresh`, `GET /api/accounts/[id]/storage`.
- Halaman `/dashboard/accounts` dengan `AccountsTable`.

### Langkah-langkah

- [x] **1. Token manager**

Buat `src/lib/google/tokens.ts`:

```ts
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts, type GoogleAccount } from '@/db/schema';
import { decryptSecret, encryptSecret } from '@/lib/encryption';
import { refreshAccessToken } from '@/lib/google/oauth';
import { AppError } from '@/lib/errors';

const EXPIRY_MARGIN_MS = 60_000;

export async function getValidAccessToken(account: GoogleAccount): Promise<string> {
  const expiresAt = account.tokenExpiresAt?.getTime() ?? 0;
  if (expiresAt > Date.now() + EXPIRY_MARGIN_MS) {
    return decryptSecret(account.accessToken);
  }

  try {
    const tokens = await refreshAccessToken(decryptSecret(account.refreshTokenEncrypted));
    const next: Partial<GoogleAccount> = {
      accessToken: encryptSecret(tokens.access_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      status: 'connected',
      updatedAt: new Date(),
    };
    if (tokens.refresh_token) next.refreshTokenEncrypted = encryptSecret(tokens.refresh_token);
    const [updated] = await db
      .update(googleAccounts)
      .set(next)
      .where(eq(googleAccounts.id, account.id))
      .returning();
    return decryptSecret(updated!.accessToken);
  } catch {
    await db
      .update(googleAccounts)
      .set({ status: 'reconnect_required', updatedAt: new Date() })
      .where(eq(googleAccounts.id, account.id));
    throw new AppError('ACCOUNT_DISCONNECTED', 'Token Google kedaluwarsa. Silakan hubungkan ulang akun.', 401);
  }
}

export async function getAccountForUser(userId: string, accountId: string): Promise<GoogleAccount> {
  const [row] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.id, accountId));
  if (!row || row.userId !== userId) throw new AppError('NOT_FOUND', 'Akun tidak ditemukan.', 404);
  return row;
}
```

- [x] **2. GoogleDriveService + pemetaan error**

Buat `src/lib/google-drive/types.ts`:

```ts
export interface DriveQuota {
  totalBytes: number | null;
  usedBytes: number;
  freeBytes: number | null;
}

export interface DriveFileDto {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  modifiedAt: string | null;
  parentId: string | null;
  webViewLink: string | null;
  accountId: string;
  accountEmail: string;
}
```

Buat `src/lib/google/errors.ts`:

```ts
import type { GoogleAccount } from '@/db/schema';
import { AppError } from '@/lib/errors';

export function mapGoogleError(res: Response, account: GoogleAccount): AppError {
  if (res.status === 401) return new AppError('TOKEN_EXPIRED', `Token akun ${account.email} tidak valid.`, 401);
  if (res.status === 403) return new AppError('PERMISSION_DENIED', `Izin ditolak untuk ${account.email}.`, 403);
  if (res.status === 404) return new AppError('NOT_FOUND', 'File tidak ditemukan.', 404);
  if (res.status === 429) return new AppError('RATE_LIMITED', 'Terlalu banyak permintaan ke Google. Coba lagi nanti.', 429);
  return new AppError('GOOGLE_UNAVAILABLE', 'Google Drive API tidak tersedia.', 502);
}
```

> Versi final (async, dengan pembacaan `reason`) ditulis ulang di **Sesi 8 langkah 1** — sekarang pakai versi sync ini, `throw mapGoogleError(...)` tanpa `await`.

Buat `src/lib/google-drive/service.ts`:

```ts
import type { GoogleAccount } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { mapGoogleError } from '@/lib/google/errors';
import { getValidAccessToken } from '@/lib/google/tokens';
import type { DriveQuota, DriveFileDto } from './types';

const API_BASE = 'https://www.googleapis.com/drive/v3';

export class GoogleDriveService {
  constructor(private account: GoogleAccount, private accessToken: string) {}

  static async forAccount(account: GoogleAccount): Promise<GoogleDriveService> {
    return new GoogleDriveService(account, await getValidAccessToken(account));
  }

  protected async request(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.accessToken}`, ...init.headers },
    });
    if (!res.ok) throw mapGoogleError(res, this.account);
    return res;
  }

  async getStorageQuota(): Promise<DriveQuota> {
    const res = await this.request('/about?fields=storageQuota');
    const body = (await res.json()) as { storageQuota?: { limit?: string; usage?: string } };
    const usedBytes = Number(body.storageQuota?.usage ?? 0);
    const totalBytes = body.storageQuota?.limit ? Number(body.storageQuota.limit) : null;
    return { totalBytes, usedBytes, freeBytes: totalBytes === null ? null : Math.max(totalBytes - usedBytes, 0) };
  }

  async listFiles(): Promise<never> { throw new Error('listFiles diimplementasi di Sesi 5'); }
  async uploadFile(): Promise<never> { throw new Error('uploadFile diimplementasi di Sesi 6'); }
  async downloadFile(): Promise<never> { throw new Error('downloadFile diimplementasi di Sesi 6'); }
  async deleteFile(): Promise<never> { throw new Error('deleteFile diimplementasi di Sesi 6'); }
  async createFolder(): Promise<never> { throw new Error('createFolder diimplementasi di Sesi 6'); }
}
```

- [x] **3. Sync quota**

Buat `src/lib/quota.ts`:

```ts
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts, storageSnapshots, type GoogleAccount, type StorageSnapshot } from '@/db/schema';
import { GoogleDriveService } from '@/lib/google-drive/service';

export async function syncQuota(account: GoogleAccount): Promise<StorageSnapshot> {
  const service = await GoogleDriveService.forAccount(account);
  const quota = await service.getStorageQuota();
  const [snapshot] = await db
    .insert(storageSnapshots)
    .values({
      googleAccountId: account.id,
      totalBytes: quota.totalBytes,
      usedBytes: quota.usedBytes,
      freeBytes: quota.freeBytes,
    })
    .returning();
  return snapshot!;
}

export async function syncAllQuotas(userId: string): Promise<number> {
  const accounts = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, userId));
  let synced = 0;
  for (const account of accounts) {
    try {
      await syncQuota(account);
      synced += 1;
    } catch (error) {
      console.warn(`[quota] gagal sync ${account.email}`, error instanceof Error ? error.message : error);
    }
  }
  return synced;
}

export async function latestSnapshot(accountId: string): Promise<StorageSnapshot | null> {
  const [row] = await db
    .select()
    .from(storageSnapshots)
    .where(eq(storageSnapshots.googleAccountId, accountId))
    .orderBy(desc(storageSnapshots.createdAt))
    .limit(1);
  return row ?? null;
}
```

- [x] **4. Sinkron quota saat connect**

Di `src/app/api/google/callback/route.ts`, setelah upsert dan sebelum redirect:

```ts
try {
  const { syncQuota } = await import('@/lib/quota');
  await syncQuota(row!);
} catch (error) {
  console.warn('[callback] sync quota gagal', error instanceof Error ? error.message : error);
}
```

- [x] **5. API storage + refresh + riwayat**

Buat `src/app/api/storage/route.ts`:

```ts
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts } from '@/db/schema';
import { ok, withAuth } from '@/lib/http';
import { latestSnapshot } from '@/lib/quota';

export const GET = withAuth(async (user) => {
  const accounts = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, user.id));
  const perAccount = await Promise.all(
    accounts.map(async (account) => ({ account, snapshot: await latestSnapshot(account.id) })),
  );

  const totalBytes = perAccount.reduce((sum, r) => sum + (r.snapshot?.totalBytes ?? 0), 0);
  const usedBytes = perAccount.reduce((sum, r) => sum + (r.snapshot?.usedBytes ?? 0), 0);
  const anyUnknownLimit = perAccount.some((r) => r.snapshot?.totalBytes == null);

  return ok({
    totals: {
      totalBytes: anyUnknownLimit ? null : totalBytes,
      usedBytes,
      freeBytes: anyUnknownLimit ? null : Math.max(totalBytes - usedBytes, 0),
      accountCount: perAccount.length,
    },
    accounts: perAccount.map(({ account, snapshot }) => ({
      id: account.id,
      email: account.email,
      name: account.name,
      picture: account.picture,
      status: account.status,
      totalBytes: snapshot?.totalBytes ?? null,
      usedBytes: snapshot?.usedBytes ?? 0,
      freeBytes: snapshot?.freeBytes ?? null,
      snapshotAt: snapshot?.createdAt ?? null,
    })),
  });
});
```

Buat `src/app/api/accounts/refresh/route.ts`:

```ts
import { ok, withAuth } from '@/lib/http';
import { syncAllQuotas } from '@/lib/quota';

export const POST = withAuth(async (user) => {
  const synced = await syncAllQuotas(user.id);
  return ok({ synced });
});
```

Buat `src/app/api/accounts/[id]/storage/route.ts`:

```ts
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts, storageSnapshots } from '@/db/schema';
import { ok, withAuth } from '@/lib/http';
import { getAccountForUser } from '@/lib/google/tokens';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await getAccountForUser(user.id, id);
  const rows = await db
    .select()
    .from(storageSnapshots)
    .where(and(eq(storageSnapshots.googleAccountId, id)))
    .orderBy(desc(storageSnapshots.createdAt))
    .limit(60);
  return ok({ snapshots: rows });
});
```

- [x] **6. Halaman Accounts + AccountsTable**

Buat `src/components/accounts/accounts-table.tsx` (client):

- Fetch: `useQuery({ queryKey: ['storage'], queryFn: () => api.get<StorageResponse>('/api/storage'), refetchInterval: 60_000 })`.
- Ringkasan atas: **Total / Used / Free / Accounts** dari `totals` (formatBytes).
- Kolom tabel: **Account** (avatar + email), **Used**, **Free**, **Status** (Badge: Connected / Reconnect Required / Error — detail 3-status di Sesi 8), **Actions**.
- Actions: **Open Drive** (`https://drive.google.com/drive/my-drive`, tab baru), **Refresh** (`POST /api/accounts/refresh` → invalidasi `['storage']`), **Disconnect** (AlertDialog konfirmasi → `api.delete('/api/accounts/' + id)` → invalidasi).
- Header: `<AddAccountButton />` → `<a href="/api/google/connect">+ Add Account</a>`.
- States: `Skeleton` saat loading; empty state "Belum ada akun Google. Klik + Add Account."
- Baca `?connected=` (toast sukses) dan `?error=invalid_state` (alert) via `useSearchParams` (bungkus `<Suspense>` agar build tanpa warning).

`src/app/dashboard/accounts/page.tsx` → server component render `<AccountsTable />`.

- [x] **7. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: drive service quota sync and accounts management page"
```

### Verifikasi

- [x] Pipeline (`lint/typecheck/test/build`) lulus — termasuk 11 unit test baru (fetch-mocked `getStorageQuota` + `mapGoogleError`)
- [ ] Connect akun baru → kembali ke `/dashboard/accounts` dengan toast, baris langsung menampilkan Used/Free (bukan 0) — **terbatas**: OAuth live butuh interaksi user + browser; jalur sync pasca-connect memakai `syncQuota` yang sama dan teruji lewat `POST /api/accounts/refresh` (snapshot terisi, bukan 0)
- [x] Klik **Refresh** → `select count(*) from storage_snapshots` bertambah (live: `0 → 2 → 4`, `synced:2`)
- [x] ≥2 akun tampil dengan angka berbeda (15 GiB/1.34 GiB terpakai vs 5 TiB/14.3 GiB terpakai)
- [x] **Disconnect** → baris + snapshot terhapus (uji live dengan baris Google + snapshot palsu: `accountCount` 3→2, dua-duanya hilang)
- [x] `curl -s http://localhost:3000/api/storage -b /tmp/cookies.txt` → struktur `totals` + `accounts[]`; tanpa cookie → 401; `GET /api/accounts/<id>/storage` milik user lain → 404
- [ ] Cross-check `usedBytes` dengan quota di web Google Drive (selisih wajar bila trash dihitung) — **terbatas**: tanpa browser headless; cross-check internal: `totalBytes` 16106127360 = 15 GiB sesuai kuota 15 GB akun personal, angka konsisten antar-refresh

### Handoff

- [x] Commit terakhir sesi 4
- [x] Update baris **Sesi 4** di tracker: ✅, tanggal, catatan

---

## Sesi 5 — List/Search File Lintas Akun + Index Cache + Halaman Files

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 5 dari implementasi.md. Baca PRD.md §5.5 (File Manager), §5.7 (Global Search), §8.4 (API), lalu Global Constraints + Sesi 5. Kerjakan hanya Sesi 5, verifikasi lulus, commit, update tracker.`

**Goal:** Seluruh file dari semua akun terhubung bisa di-list, dicari, difilter (akun/jenis), disortir, dan dibuka di Google Drive; hasil listing di-cache ke `drive_files` (untuk statistik Sesi 11).

**Prasyarat:** Sesi 4 (disarankan ≥2 akun terhubung).

**Consumes:** `GoogleDriveService` (Sesi 4), `withAuth/ok/AppError`, `api` client, `QueryClientProvider` (Sesi 1).

**Produces:**
- Tabel `drive_files` + migrasi; upsert saat listing.
- `GoogleDriveService.listFiles(opts)`, `buildDriveQuery`, `classifyMime`, `sortFiles` (unit tested).
- `GET /api/files?accountId=&search=&kind=&sort=&dir=` → `{ files, failedAccounts }`.
- `GET /api/files/[id]/download` (versi dasar; final di Sesi 6).
- Halaman `/dashboard/files` dengan `FilesTable` (TanStack Table).

### Langkah-langkah

- [x] **1. Test query builder & klasifikasi MIME (merah)**

Buat `src/lib/__tests__/query.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildDriveQuery } from '@/lib/google-drive/query';

describe('buildDriveQuery', () => {
  it('selalu mengecualikan sampah', () => {
    expect(buildDriveQuery({})).toBe('trashed = false');
  });
  it('escape kutip pada search', () => {
    expect(buildDriveQuery({ search: "in'voice" })).toContain("name contains 'in\\'voice'");
  });
  it('kind image', () => {
    expect(buildDriveQuery({ kind: 'image' })).toContain("mimeType contains 'image/'");
  });
  it('gabungan search + kind', () => {
    const q = buildDriveQuery({ search: 'lapor', kind: 'video' });
    expect(q).toContain(' and ');
    expect(q).toContain("mimeType contains 'video/'");
  });
});
```

Buat `src/lib/__tests__/mime.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { classifyMime } from '@/lib/files/mime';

describe('classifyMime', () => {
  it('klasifikasi dasar', () => {
    expect(classifyMime('application/vnd.google-apps.folder')).toBe('folder');
    expect(classifyMime('application/pdf')).toBe('document');
    expect(classifyMime('image/png')).toBe('image');
    expect(classifyMime('video/mp4')).toBe('video');
    expect(classifyMime('application/zip')).toBe('archive');
    expect(classifyMime('application/x-unknown')).toBe('other');
  });
});
```

`pnpm test` → **FAIL**.

- [x] **2. Schema `drive_files` + migrasi**

Buat `src/db/schema/drive-files.ts`:

```ts
import { bigint, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { googleAccounts } from './google-accounts';

export const driveFiles = pgTable('drive_files', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  googleAccountId: text('google_account_id').notNull().references(() => googleAccounts.id, { onDelete: 'cascade' }),
  driveFileId: text('drive_file_id').notNull(),
  name: text('name').notNull(),
  mimeType: text('mime_type').notNull(),
  kind: text('kind', { enum: ['document', 'image', 'video', 'archive', 'other', 'folder'] }).notNull().default('other'),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  modifiedAt: timestamp('modified_at', { withTimezone: true }),
  parentId: text('parent_id'),
  indexedAt: timestamp('indexed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('drive_files_account_file_uq').on(t.googleAccountId, t.driveFileId),
  index('drive_files_kind_idx').on(t.kind),
]);

export type DriveFileRecord = typeof driveFiles.$inferSelect;
```

Tambahkan `export * from './drive-files';` ke `src/db/schema/index.ts`, lalu `pnpm db:generate && pnpm db:migrate`.

- [x] **3. Klasifikasi + query builder + sort**

Buat `src/lib/files/mime.ts`:

```ts
export type FileKind = 'document' | 'image' | 'video' | 'archive' | 'other' | 'folder';

export function classifyMime(mimeType: string): FileKind {
  if (mimeType === 'application/vnd.google-apps.folder') return 'folder';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') ||
    mimeType.includes('7z') || mimeType.includes('gzip') || mimeType.includes('compress')
  ) return 'archive';
  if (
    mimeType.startsWith('application/vnd.google-apps.') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('text/') ||
    mimeType.includes('word') || mimeType.includes('sheet') ||
    mimeType.includes('presentation') || mimeType.includes('officedocument')
  ) return 'document';
  return 'other';
}

export const FILE_KINDS: FileKind[] = ['document', 'image', 'video', 'archive', 'other'];
```

Buat `src/lib/google-drive/query.ts`:

```ts
import type { FileKind } from '@/lib/files/mime';

export interface DriveFileFilters {
  search?: string;
  kind?: FileKind;
}

function escapeQuote(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const KIND_SQL: Partial<Record<FileKind, string>> = {
  document: "(mimeType contains 'application/vnd.google-apps.' or mimeType = 'application/pdf' or mimeType contains 'text/' or mimeType contains 'officedocument')",
  image: "mimeType contains 'image/'",
  video: "mimeType contains 'video/'",
  archive: "(mimeType contains 'zip' or mimeType contains 'rar' or mimeType contains 'tar' or mimeType contains '7z' or mimeType contains 'gzip')",
};

export function buildDriveQuery(filters: DriveFileFilters): string {
  const parts = ['trashed = false'];
  if (filters.search?.trim()) parts.push(`name contains '${escapeQuote(filters.search.trim())}'`);
  const kindSql = filters.kind ? KIND_SQL[filters.kind] : undefined;
  if (kindSql) parts.push(kindSql);
  return parts.join(' and ');
}
```

Buat `src/lib/files/merge.ts`:

```ts
import type { DriveFileDto } from '@/lib/google-drive/types';

export type SortKey = 'name' | 'size' | 'modified';

export function sortFiles(files: DriveFileDto[], key: SortKey, dir: 'asc' | 'desc'): DriveFileDto[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...files].sort((a, b) => {
    if (key === 'name') return sign * a.name.localeCompare(b.name, 'id');
    if (key === 'size') return sign * ((a.sizeBytes ?? -1) - (b.sizeBytes ?? -1));
    return sign * ((a.modifiedAt ? Date.parse(a.modifiedAt) : 0) - (b.modifiedAt ? Date.parse(b.modifiedAt) : 0));
  });
}
```

> `kind: 'other'` dan `'folder'` tidak bisa diekspresikan andal dalam satu query Drive → difilter di server setelah fetch (lihat langkah 5).

- [x] **4. `listFiles` di service**

Realisasikan stub `listFiles` di `src/lib/google-drive/service.ts` (ganti signature stub dengan opsional parameter):

```ts
interface ListOptions {
  q?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
}

async listFiles(options: ListOptions = {}): Promise<{ files: DriveFileDto[]; nextPageToken: string | null }> {
  const params = new URLSearchParams({
    q: options.q ?? 'trashed = false',
    pageSize: String(options.pageSize ?? 100),
    fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,webViewLink)',
    orderBy: options.orderBy ?? 'modifiedTime desc',
    spaces: 'drive',
  });
  if (options.pageToken) params.set('pageToken', options.pageToken);
  const res = await this.request(`/files?${params.toString()}`);
  const body = (await res.json()) as {
    nextPageToken?: string;
    files?: Array<{ id: string; name: string; mimeType: string; size?: string; modifiedTime?: string; parents?: string[]; webViewLink?: string }>;
  };
  const files: DriveFileDto[] = (body.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    sizeBytes: f.size ? Number(f.size) : null,
    modifiedAt: f.modifiedTime ?? null,
    parentId: f.parents?.[0] ?? null,
    webViewLink: f.webViewLink ?? null,
    accountId: this.account.id,
    accountEmail: this.account.email,
  }));
  return { files, nextPageToken: body.nextPageToken ?? null };
}
```

- [x] **5. API `GET /api/files`**

Buat `src/app/api/files/route.ts`:

```ts
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { driveFiles, googleAccounts } from '@/db/schema';
import { ok, withAuth } from '@/lib/http';
import { AppError } from '@/lib/errors';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { buildDriveQuery } from '@/lib/google-drive/query';
import { classifyMime, type FileKind } from '@/lib/files/mime';
import { sortFiles, type SortKey } from '@/lib/files/merge';
import type { DriveFileDto } from '@/lib/google-drive/types';

const MAX_PER_ACCOUNT = 100;

export const GET = withAuth(async (user, req) => {
  const sp = req.nextUrl.searchParams;
  const accountId = sp.get('accountId');
  const search = sp.get('search') ?? undefined;
  const kind = (sp.get('kind') ?? undefined) as FileKind | undefined;
  const sort = (sp.get('sort') as SortKey | null) ?? 'modified';
  const dir = sp.get('dir') === 'asc' ? 'asc' : 'desc';

  const accounts = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, user.id));
  const targets = accountId ? accounts.filter((a) => a.id === accountId) : accounts;
  if (accountId && targets.length === 0) throw new AppError('NOT_FOUND', 'Akun tidak ditemukan.', 404);

  const q = buildDriveQuery({ search, kind });
  const results = await Promise.allSettled(
    targets.map(async (account) => {
      const service = await GoogleDriveService.forAccount(account);
      const { files } = await service.listFiles({ q, pageSize: MAX_PER_ACCOUNT });
      return files;
    }),
  );

  const files: DriveFileDto[] = [];
  const failedAccounts: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') files.push(...result.value);
    else failedAccounts.push(targets[i]!.email);
  });

  if (kind === 'other' || kind === 'folder') {
    const filtered = files.filter((f) => classifyMime(f.mimeType) === kind);
    files.length = 0;
    files.push(...filtered);
  }

  if (files.length > 0) {
    await db
      .insert(driveFiles)
      .values(files.map((f) => ({
        googleAccountId: f.accountId,
        driveFileId: f.id,
        name: f.name,
        mimeType: f.mimeType,
        kind: classifyMime(f.mimeType),
        sizeBytes: f.sizeBytes,
        modifiedAt: f.modifiedAt ? new Date(f.modifiedAt) : null,
        parentId: f.parentId,
        indexedAt: new Date(),
      })))
      .onConflictDoUpdate({
        target: [driveFiles.googleAccountId, driveFiles.driveFileId],
        set: {
          name: sql`excluded.name`,
          mimeType: sql`excluded.mime_type`,
          kind: sql`excluded.kind`,
          sizeBytes: sql`excluded.size_bytes`,
          modifiedAt: sql`excluded.modified_at`,
          parentId: sql`excluded.parent_id`,
          indexedAt: sql`excluded.indexed_at`,
        },
      });
  }

  return ok({ files: sortFiles(files, sort, dir), failedAccounts });
});
```

- [x] **6. Endpoint download (versi dasar)**

Buat `src/app/api/files/[id]/download/route.ts`:

```ts
import { AppError } from '@/lib/errors';
import { withAuth } from '@/lib/http';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) throw new AppError('VALIDATION', 'accountId wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  const res = await service.downloadFile(id);
  return res;
});
```

Catatan: `downloadFile` masih stub sampai Sesi 6 — tombol Download di UI bisa diklik tapi akan 500; **nonaktifkan dulu tombol Download** di Sesi 5 (tombol disabled + tooltip "Sesi 6"), aktifkan kembali di Sesi 6.

- [x] **7. Halaman Files + FilesTable**

`src/components/files/files-table.tsx` (client):

- State filter: `search` (Input debounce 400 ms → URL `?search=`), `accountId` (Select dari `GET /api/storage`), `kind` (Select: All/Documents/Images/Videos/Archives/Others), `sort` (Name/Size/Updated + asc/desc).
- `useQuery({ queryKey: ['files', { search, accountId, kind, sort, dir }], queryFn: () => api.get<FilesResponse>(`/api/files?${params}`) })`.
- TanStack Table kolom: **Name** (icon per kind + nama), **Size** (`formatBytes`), **Account** (email), **Updated** (`formatDateTime`), **Actions**.
- Actions sesi ini: **Open in Drive** (`webViewLink` → tab baru; fallback `https://drive.google.com/open?id={id}`), **Download** (disabled → Sesi 6).
- Loading: skeleton baris. Empty: "Tidak ada file. Coba ubah filter atau hubungkan akun lain." Jika `failedAccounts` terisi → alert "Gagal memuat file dari: x@y.com".

`src/app/dashboard/files/page.tsx` → server component render `<FilesTable />`, baca `searchParams` awal (search/kind/accountId) agar link global search (Sesi 7) langsung terisi.

- [x] **8. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: cross-account file listing, search, filters and files page"
```

### Verifikasi

- [x] `pnpm test` → test query/mime PASS
- [x] Halaman Files memuat file dari **≥2 akun** (kolom Account berbeda)
- [x] Search kata yang ada di Drive → hanya nama cocok; search dengan karakter `'` tidak error
- [x] Filter Account → hanya akun itu; Filter Kind = Images → hanya gambar
- [x] Sort Updated asc/desc → urutan berubah
- [x] **Open in Drive** membuka tab Google Drive yang benar
- [x] `docker compose exec postgres psql -U gdrive -d gdrive_manager -c "select count(*), count(distinct google_account_id) from drive_files"` → terisi
- [x] Simulasi 1 akun rusak (ubah `access_token` jadi `v1.tes`) → file akun lain tetap tampil + alert `failedAccounts`

### Handoff

- [x] Commit terakhir sesi 5
- [x] Update baris **Sesi 5** di tracker: ✅, tanggal, catatan (mis. "100 file per akun; tombol Download masih disabled sampai Sesi 6")

---

## Sesi 6 — Upload, Download, Delete, Folder, Rate Limit

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 6 dari implementasi.md. Baca PRD.md §6 (Upload & Pemilihan Akun, kecuali Mode B), §5.5/§5.6 (File & Folder ops), §9 (Rate Limiting), lalu Global Constraints + Sesi 6. Kerjakan hanya Sesi 6, verifikasi lulus, commit, update tracker.`

**Goal:** Upload single-account (Mode A — pilih akun manual) dengan progress, download, delete, create folder; rate limit 10 upload/menit/user; setiap operasi menulis `activity_logs` dan `upload_jobs`.

**Prasyarat:** Sesi 5 (ada ≥2 akun dengan sisa quota berbeda).

**Consumes:** `GoogleDriveService`, `getAccountForUser`, `withAuth/ok/AppError`, tabel `upload_jobs`/`activity_logs`, tombol Download & UploadDialog slot.

**Produces:**
- `service.uploadFile/downloadFile/deleteFile/createFolder` (implementasi nyata, stub dihapus).
- `src/lib/rate-limit.ts` + test, `src/lib/activity.ts` (`logActivity`) — pasang juga ke callback connect + disconnect (Sesi 3).
- `POST /api/files/upload`, `GET /api/files/[id]/download` (final), `DELETE /api/files/[id]`, `POST /api/folders`.
- `UploadDialog` (file + radio akun + progress) di header/quick actions; aksi Delete & New Folder di Files.

### Langkah-langkah

- [x] **1. Test rate limit (merah)**

Buat `src/lib/__tests__/rate-limit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('memblokir setelah limit tercapai dalam window', () => {
    let now = 1_000_000;
    for (let i = 0; i < 10; i++) {
      expect(rateLimit('u1', 10, 60_000, now).ok).toBe(true);
      now += 10;
    }
    const blocked = rateLimit('u1', 10, 60_000, now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('window bergeser → izin lagi', () => {
    const now = 2_000_000;
    for (let i = 0; i < 10; i++) rateLimit('u2', 10, 60_000, now);
    expect(rateLimit('u2', 10, 60_000, now + 61_000).ok).toBe(true);
  });

  it('key berbeda tidak saling pengaruh', () => {
    const now = 3_000_000;
    for (let i = 0; i < 10; i++) rateLimit('u3', 10, 60_000, now);
    expect(rateLimit('u4', 10, 60_000, now).ok).toBe(true);
  });
});
```

`pnpm test` → **FAIL**.

- [x] **2. Rate limit + activity log**

Buat `src/lib/rate-limit.ts`:

```ts
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    return { ok: false as const, retryAfterMs: windowMs - (now - hits[0]!) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) buckets.clear();
  return { ok: true as const, retryAfterMs: 0 };
}
```

Buat `src/lib/activity.ts`:

```ts
import { db } from '@/db';
import { activityLogs } from '@/db/schema';

export type ActivityAction =
  | 'account.connect' | 'account.disconnect' | 'quota.sync'
  | 'file.upload' | 'file.download' | 'file.delete' | 'folder.create'
  | 'file.rename' | 'file.move' | 'file.copy';

export async function logActivity(input: {
  userId: string;
  googleAccountId?: string | null;
  action: ActivityAction;
  fileId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      userId: input.userId,
      googleAccountId: input.googleAccountId ?? null,
      action: input.action,
      fileId: input.fileId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (error) {
    console.warn('[activity] gagal menulis log', error instanceof Error ? error.message : error);
  }
}
```

Aktifkan kembali `logActivity` di `DELETE /api/accounts/[id]` (Sesi 3), dan tambahkan `action: 'account.connect'` + `googleAccountId: row.id` di akhir callback connect.

- [x] **3. Realisasi operasi file di service**

Ganti stub `uploadFile/downloadFile/deleteFile/createFolder` di `src/lib/google-drive/service.ts`:

```ts
async uploadFile(params: {
  stream: ReadableStream<Uint8Array>;
  contentLength: number;
  contentType: string;
  filename: string;
  parentId?: string;
}): Promise<DriveFileDto> {
  const metadata: Record<string, unknown> = { name: params.filename };
  if (params.parentId) metadata.parents = [params.parentId];

  const init = await fetch(
    `${API_BASE}/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,modifiedTime,parents,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(params.contentLength),
        'X-Upload-Content-Type': params.contentType || 'application/octet-stream',
      },
      body: JSON.stringify(metadata),
    },
  );
  if (!init.ok) throw mapGoogleError(init, this.account);
  const sessionUrl = init.headers.get('location');
  if (!sessionUrl) throw new AppError('UPLOAD_FAILED', 'Gagal memulai sesi upload.', 502);

  const put = await fetch(sessionUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(params.contentLength),
      'Content-Type': params.contentType || 'application/octet-stream',
    },
    body: params.stream,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  if (!put.ok) throw mapGoogleError(put, this.account);
  const body = (await put.json()) as {
    id: string; name: string; mimeType: string; size?: string;
    modifiedTime?: string; parents?: string[]; webViewLink?: string;
  };
  return {
    id: body.id,
    name: body.name,
    mimeType: body.mimeType,
    sizeBytes: body.size ? Number(body.size) : params.contentLength,
    modifiedAt: body.modifiedTime ?? null,
    parentId: body.parents?.[0] ?? params.parentId ?? null,
    webViewLink: body.webViewLink ?? null,
    accountId: this.account.id,
    accountEmail: this.account.email,
  };
}

async downloadFile(fileId: string): Promise<Response> {
  const meta = await this.request(`/files/${fileId}?fields=id,name,mimeType`);
  const file = (await meta.json()) as { id: string; name: string; mimeType: string };

  if (file.mimeType.startsWith('application/vnd.google-apps.')) {
    const exportMime = file.mimeType.includes('spreadsheet')
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : file.mimeType.includes('presentation')
        ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        : 'application/pdf';
    const res = await fetch(`${API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw mapGoogleError(res, this.account);
    return new Response(res.body, {
      status: 200,
      headers: {
        'content-type': exportMime,
        'content-disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
      },
    });
  }

  const res = await fetch(`${API_BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${this.accessToken}` },
  });
  if (!res.ok) throw mapGoogleError(res, this.account);
  return new Response(res.body, {
    status: 200,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      'content-disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
      'content-length': res.headers.get('content-length') ?? '',
    },
  });
}

async deleteFile(fileId: string): Promise<void> {
  const res = await this.request(`/files/${fileId}`, { method: 'DELETE' });
  if (res.status !== 204 && !res.ok) throw mapGoogleError(res, this.account);
}

async createFolder(name: string, parentId?: string): Promise<DriveFileDto> {
  const res = await this.request('/files?fields=id,name,mimeType,parents,webViewLink,modifiedTime', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  const body = (await res.json()) as {
    id: string; name: string; mimeType: string; parents?: string[]; webViewLink?: string; modifiedTime?: string;
  };
  return {
    id: body.id,
    name: body.name,
    mimeType: body.mimeType,
    sizeBytes: null,
    modifiedAt: body.modifiedTime ?? null,
    parentId: body.parents?.[0] ?? parentId ?? null,
    webViewLink: body.webViewLink ?? null,
    accountId: this.account.id,
    accountEmail: this.account.email,
  };
}
```

Catatan: `API_BASE` sudah didefinisikan di Sesi 4. `this.account` dan `this.accessToken` dipakai oleh method baru — pastikan modifier `private` di constructor tetap terbaca dari method kelas.

- [x] **4. Upload API (streaming + rate limit + cek quota)**

Buat `src/app/api/files/upload/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { uploadJobs } from '@/db/schema';
import { withAuth } from '@/lib/http';
import { AppError } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limit';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { syncQuota } from '@/lib/quota';
import { logActivity } from '@/lib/activity';

export const POST = withAuth(async (user, req) => {
  const limit = rateLimit(`upload:${user.id}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Batas 10 upload/menit tercapai.' } },
      { status: 429, headers: { 'retry-after': String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  const sp = req.nextUrl.searchParams;
  const accountId = sp.get('accountId');
  const filename = sp.get('filename');
  const parentId = sp.get('parentId') ?? undefined;
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (!accountId || !filename || !contentLength) {
    throw new AppError('VALIDATION', 'accountId, filename, dan content-length wajib.', 400);
  }

  const account = await getAccountForUser(user.id, accountId);
  const quota = await syncQuota(account);
  if (quota.freeBytes != null && quota.freeBytes < contentLength) {
    throw new AppError('QUOTA_EXCEEDED', `Ruang ${account.email} tidak cukup.`, 413);
  }

  const [job] = await db
    .insert(uploadJobs)
    .values({ userId: user.id, googleAccountId: account.id, filename, fileSize: contentLength, status: 'uploading' })
    .returning();

  try {
    const service = await GoogleDriveService.forAccount(account);
    const file = await service.uploadFile({
      stream: req.body!,
      contentLength,
      contentType: req.headers.get('content-type') ?? 'application/octet-stream',
      filename,
      parentId,
    });

    await db
      .update(uploadJobs)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(uploadJobs.id, job!.id));
    await syncQuota(account);
    await logActivity({
      userId: user.id,
      googleAccountId: account.id,
      action: 'file.upload',
      fileId: file.id,
      metadata: { filename, sizeBytes: contentLength },
    });

    return NextResponse.json({ file, jobId: job!.id }, { status: 201 });
  } catch (error) {
    await db
      .update(uploadJobs)
      .set({ status: 'failed', errorMessage: error instanceof Error ? error.message : 'unknown' })
      .where(eq(uploadJobs.id, job!.id));
    throw error instanceof AppError ? error : new AppError('UPLOAD_FAILED', 'Upload gagal.', 502);
  }
});
```

- [x] **5. Delete + folders API + finalisasi download**

Buat `src/app/api/files/[id]/route.ts`:

```ts
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = withAuth<Ctx>(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) throw new AppError('VALIDATION', 'accountId wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  await service.deleteFile(id);
  await logActivity({ userId: user.id, googleAccountId: account.id, action: 'file.delete', fileId: id });
  return ok({ deleted: true });
});
```

Buat `src/app/api/folders/route.ts`:

```ts
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { logActivity } from '@/lib/activity';

export const POST = withAuth(async (user, req) => {
  const { name, accountId, parentId } = (await req.json()) as {
    name?: string; accountId?: string; parentId?: string;
  };
  if (!name?.trim() || !accountId) throw new AppError('VALIDATION', 'name dan accountId wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  const folder = await service.createFolder(name.trim(), parentId);
  await logActivity({
    userId: user.id,
    googleAccountId: account.id,
    action: 'folder.create',
    fileId: folder.id,
    metadata: { name: folder.name },
  });
  return ok({ folder }, 201);
});
```

Finalisasi `GET /api/files/[id]/download` (Sesi 5 langkah 6):

```ts
export const GET = withAuth<Ctx>(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) throw new AppError('VALIDATION', 'accountId wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  const res = await service.downloadFile(id);
  await logActivity({ userId: user.id, googleAccountId: account.id, action: 'file.download', fileId: id });
  return res;
});
```

- [x] **6. UploadDialog (Mode A: manual)**

Buat `src/components/upload/upload-dialog.tsx` (client):

- Dibuka dari tombol **Upload** di header + QuickActions (Sesi 7).
- Isi: `<input type="file">` (MVP 1 file per request; multi-file = loop berurutan, tanpa paralel), RadioGroup akun dari `GET /api/storage` (tampilkan `free` per akun), estimasi sisa ruang setelah upload.
- Validasi klien: `file.size <= freeBytes` (freeBytes null → izinkan), error inline.
- Kirim via **XMLHttpRequest** (ada progress):

```ts
function uploadWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body?.error?.message ?? `HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Koneksi gagal'));
    xhr.send(file);
  });
}
```

URL: `/api/files/upload?accountId=${id}&filename=${encodeURIComponent(file.name)}`.

- Progress bar (shadcn `progress`), tombol **Batal** (`xhr.abort()`), sukses → toast (sonner) + invalidasi `['files']`, `['storage']`.
- Error mapping: `RATE_LIMITED` (tampilkan waktu tunggu), `QUOTA_EXCEEDED`, `ACCOUNT_DISCONNECTED` (link `/api/google/connect`).

- [x] **7. Aksi Delete & New Folder di UI; aktifkan Download**

Di `src/components/files/file-actions.tsx`:
- **Download** → aktifkan kembali (Sesi 5 dinonaktifkan): `<a href={/api/files/${id}/download?accountId=${accountId}} download>`.
- **Delete** → AlertDialog ("File dihapus permanen dari Google Drive akun ini") → `api.delete(...)` → invalidasi `['files']`, `['storage']`.
- **New Folder** (toolbar Files) → Dialog input nama + pilihan akun → `api.post('/api/folders', {...})`.

- [x] **8. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: upload with progress, download, delete, folder create, rate limit"
```

### Verifikasi

- [x] `pnpm test` → test rate limit PASS (29 test)
- [x] Upload file 20 MB ke akun berkuota cukup → `201` + file muncul di `GET /api/files`, snapshot terbaru `used_bytes` naik `1440338926 → 1461310446` (+20.971.520). **Terbatas**: progress bar tak diverifikasi visual; upload terbukti lewat API `201` + `xhr.upload.onprogress` (tanpa browser headless)
- [x] Upload lebih besar dari freeSpace target → ditolak `QUOTA_EXCEEDED` (`413`, spoof `Content-Length: 15000000000`), tidak ada file masuk Drive (search nama → kosong)
- [x] `select status, count(*) from upload_jobs group by status` → `completed` 2, `failed` 1 (job ditulis sebelum upload, ditutup di kedua jalur)
- [x] `select action, count(*) from activity_logs group by action` → ada `file.upload` (2), `file.download` (6), `file.delete` (4), `folder.create` (1), `account.disconnect` (1)
- [ ] Baris `account.connect` di `activity_logs` — **terbatas**: callback live butuh browser OAuth (lihat catatan Sesi 3); panggilan `logActivity` diverifikasi lewat review kode + jalur gagal callback (`?code=x&state=y` → `307 ?error=invalid_state`) tetap sehat
- [x] Download file `.pdf` **dan** file Google Doc (native) → keduanya menghasilkan file terunduh (`pdf` 530.110 B valid PDF; Doc → export `application/pdf` 8.959 B; file 20 MB `cmp` identik). Catatan: kedua akun tidak punya Doc native → dibuat satu via Drive API untuk uji, lalu dihapus
- [x] Delete file → hilang dari tabel dan dari Drive web (3 objek: file 20 MB, Doc uji, folder uji → `{"deleted":true}`, search berikutnya kosong)
- [x] 11 request upload cepat dalam 1 menit → ke-11 `429` + header `retry-after: 60` (10 pertama `400 VALIDATION` tetap menghabiskan kuota)
- [x] `pnpm build` lulus (streaming `req.body` ke fetch tidak error)

### Handoff

- [x] Commit terakhir sesi 6
- [x] Update baris **Sesi 6** di tracker: ✅, tanggal, catatan (upload resumable streaming, multi-file = loop berurutan 1 file/request)

---

## Sesi 7 — Dashboard Storage + Global Search

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 7 dari implementasi.md. Baca PRD.md §5.4 (Storage Dashboard), §8.7 (Dashboard Components), §5.7 (Global Search), lalu Global Constraints + Sesi 7. Kerjakan hanya Sesi 7, verifikasi lulus, commit, update tracker.`

**Goal:** Dashboard menampilkan Total/Used/Free/Accounts + progress bar per akun + recent files + recent activity + quick actions; search di header melakukan pencarian global lintas akun.

**Prasyarat:** Sesi 6 (ada data quota, file, activity log).

**Consumes:** `GET /api/storage`, `GET /api/files`, `activity_logs`, `formatBytes`, UploadDialog (Sesi 6).

**Produces:**
- `?recent=1` di `GET /api/files`, `GET /api/activity?limit=`.
- Komponen `StorageOverview`, `AccountList`, `RecentFiles`, `RecentActivity`, `QuickActions`.
- Header search fungsional → `/dashboard/files?search=...`.

### Langkah-langkah

- [x] **1. Endpoint recent files + activity**

Di `GET /api/files` (Sesi 5), tambahkan dukungan `?recent=1`: bila `recent=1`, abaikan search/kind, `pageSize: 8` per akun, lalu hasil akhir `sortFiles(files, 'modified', 'desc').slice(0, 8)`.

Buat `src/app/api/activity/route.ts` (dasar; tabel UI lengkap di Sesi 11):

```ts
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { activityLogs, googleAccounts } from '@/db/schema';
import { ok, withAuth } from '@/lib/http';

export const GET = withAuth(async (user, req) => {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 20);
  const rows = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      fileId: activityLogs.fileId,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
      email: googleAccounts.email,
    })
    .from(activityLogs)
    .leftJoin(googleAccounts, eq(activityLogs.googleAccountId, googleAccounts.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(Math.min(limit, 100));
  return ok({ activity: rows });
});
```

- [x] **2. Komponen dashboard**

`src/app/dashboard/page.tsx` (client atau server + child client): fetch `['storage']`, `['files', { recent: true }]`, `['activity', { limit: 5 }]` dengan TanStack Query, susun:

```text
StorageOverview      → 4 kartu: Total Storage, Used, Free, Accounts (formatBytes)
grid 2 kolom:
  AccountList        → per akun: email, <Progress>, used/total, badge status, link "Kelola"
  RecentFiles        → 8 baris (nama, ukuran, akun, waktu) + link "Lihat semua"
RecentActivity       → 5 baris (aksi + waktu + akun)
QuickActions         → [Upload] [+ Add Account] [File Manager]
```

Kode inti `storage-overview.tsx`:

```tsx
interface Props {
  totals: { totalBytes: number | null; usedBytes: number; freeBytes: number | null; accountCount: number };
}

export function StorageOverview({ totals }: Props) {
  const cards = [
    { label: 'Total Storage', value: totals.totalBytes == null ? 'Tidak terbatas' : formatBytes(totals.totalBytes) },
    { label: 'Used', value: formatBytes(totals.usedBytes) },
    { label: 'Free', value: totals.freeBytes == null ? '—' : formatBytes(totals.freeBytes) },
    { label: 'Accounts', value: String(totals.accountCount) },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{c.label}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{c.value}</CardContent>
        </Card>
      ))}
    </div>
  );
}
```

`account-list.tsx`: `pct = totalBytes ? used/total*100 : null` → `<Progress value={pct} />`; total null → teks `used / ?`.

States: skeleton saat loading; empty state (0 akun) → ilustrasi + tombol `+ Add Account`.

- [x] **3. Global search di header**

`src/components/layout/header.tsx` (client): ubah search jadi form:

```tsx
const [value, setValue] = useState(initialSearch);
function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  router.push(`/dashboard/files?search=${encodeURIComponent(value)}`);
}
```

`FilesTable` (Sesi 5): sinkronkan state search lokal dengan `useSearchParams()` (effek + debounce 400 ms) agar perubahan URL dari header langsung memicu query ulang.

- [x] **4. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: storage dashboard, recent activity/files, global search"
```

### Verifikasi

- [x] Dashboard menampilkan Total/Used/Free/Accounts **sama persis** dengan halaman Accounts
- [x] Progress bar per akun sesuai proporsi; akun tanpa limit → total '—'
- [x] Recent Files = 8 file terbaru lintas akun (berdasarkan `modifiedTime`)
- [x] Recent Activity menampilkan aksi upload/delete/folder dari sesi 6
- [x] Ketik kata di search header → Enter → pindah ke Files dengan hasil terfilter
- [x] Layout tidak rusak di 375px (sidebar jadi Sheet/menu)

### Handoff

- [x] Commit terakhir sesi 7
- [x] Update baris **Sesi 7** di tracker: ✅, tanggal, catatan

---

## Sesi 8 — Polish: Error Handling, Health, Keamanan, Acceptance MVP

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 8 dari implementasi.md. Baca PRD.md §10 (Reliability), §9 (Security), §14 (Acceptance Criteria MVP), §11 (UI Design), lalu Global Constraints + Sesi 8. Kerjakan hanya Sesi 8, verifikasi lulus, commit, update tracker.`

**Goal:** Semua error Google/user-facing tertangani dan tampil rapi; status kesehatan akun akurat; audit keamanan lulus; **seluruh Acceptance Criteria MVP (PRD §14) terpenuhi dan di-checklist**.

**Prasyarat:** Sesi 1–7 selesai, ≥2 akun terhubung.

**Consumes:** seluruh kode sesi sebelumnya.

**Produces:**
- `mapGoogleError` versi final (async + alasan error) + penanganan `invalid_grant`.
- UI error/empty/loading konsisten (alert + toast), badge health 3 status, tombol Reconnect.
- Rate limit pada seluruh route mutasi.
- `README.md` + checklist Acceptance MVP.

### Langkah-langkah

- [x] **1. Lengkapi pemetaan error Google**

Perbarui `src/lib/google/errors.ts` menjadi **async**:

```ts
import type { GoogleAccount } from '@/db/schema';
import { AppError } from '@/lib/errors';

export async function mapGoogleError(res: Response, account: GoogleAccount): Promise<AppError> {
  let reason = '';
  try {
    const body = (await res.clone().json()) as {
      error?: { message?: string; errors?: Array<{ reason?: string }> };
    };
    reason = body.error?.errors?.[0]?.reason ?? body.error?.message ?? '';
  } catch {
    reason = '';
  }

  if (res.status === 401) return new AppError('TOKEN_EXPIRED', `Sesi Google ${account.email} kedaluwarsa.`, 401);
  if (res.status === 403 && reason.includes('userRateLimit')) {
    return new AppError('RATE_LIMITED', 'Batas kuota Google tercapai. Coba lagi beberapa menit.', 429);
  }
  if (res.status === 403) return new AppError('PERMISSION_DENIED', `Izin ditolak untuk ${account.email}.`, 403);
  if (res.status === 404) return new AppError('NOT_FOUND', 'File tidak ditemukan (mungkin sudah dihapus).', 404);
  if (res.status === 410) return new AppError('NOT_FOUND', 'Resource sudah tidak tersedia.', 404);
  if (res.status === 429) return new AppError('RATE_LIMITED', 'Terlalu banyak permintaan ke Google.', 429);
  if (res.status >= 500) return new AppError('GOOGLE_UNAVAILABLE', 'Google Drive sedang tidak tersedia.', 502);
  return new AppError('GOOGLE_UNAVAILABLE', `Google API error ${res.status}.`, 502);
}
```

> **Breaking change:** semua `throw mapGoogleError(...)` → `throw await mapGoogleError(...)` (service.ts: request, uploadFile, downloadFile, deleteFile, createFolder, dan method Sesi 9).

Di `getValidAccessToken` (Sesi 4): pesan `invalid_grant` dari refresh → tetap set `status = 'reconnect_required'` dan lempar `ACCOUNT_DISCONNECTED` (sudah ada); pastikan pesan error ke user konsisten.

- [x] **2. Error boundary + konsistensi UI error**

- `src/app/dashboard/error.tsx` (client): tampilkan `error.message` + tombol **Coba lagi** (`reset()`), gaya alert.
- `src/app/error.tsx` untuk error tak terduga.
- Semua `useQuery` berisiko (files, storage, activity): bila `error instanceof ApiError` → `<Alert variant="destructive">` berisi kode + pesan; toast hanya untuk mutasi.

- [x] **3. Account health badge + Reconnect**

Di `AccountsTable` (Sesi 4):
- Badge: `connected` → **Connected** (secondary), `reconnect_required` → **Reconnect Required** (amber/destructive), `error` → **Error** (destructive).
- Tombol **Reconnect** bila status ≠ `connected` → `<a href="/api/google/connect">` (upsert callback memperbarui token akun yang sama).
- Kolom tambahan: "Diperbarui {formatDateTime(updatedAt)}" dari `GET /api/storage` (tambahkan field `updatedAt` di response bila belum ada).

- [x] **4. Rate limit semua route mutasi**

Terapkan di `POST /api/folders`, `DELETE /api/files/[id]`, `DELETE /api/accounts/[id]`, `POST /api/accounts/refresh`:

```ts
const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
if (!limit.ok) throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
```

(`POST /api/files/upload` tetap 10/menit sesuai PRD §9.)

- [x] **5. Audit keamanan (checklist + bukti)**

```bash
# 1. Token terenkripsi
docker compose exec postgres psql -U gdrive -d gdrive_manager \
  -c "select access_token like 'v1.%' as enc_access, refresh_token_encrypted like 'v1.%' as enc_refresh from google_accounts;"
# expected: semua true

# 2. .env tidak di git
git status --ignored --porcelain | grep '.env$'   # harus muncul (ignored)

# 3. hanya route auth/oauth tanpa withAuth
grep -rL "withAuth" src/app/api --include=route.ts
# expected: auth/[...all]/route.ts, google/connect/route.ts, google/callback/route.ts saja

# 4. tidak ada token di log
grep -rn "console.log" src/lib | grep -i token    # tidak boleh ada hasil

# 5. query google_accounts selalu terfilter user
grep -rn "from(googleAccounts)" src/app/api src/lib
# tiap kemunculan harus punya eq(googleAccounts.userId, ...) atau lewat getAccountForUser
```

Perbaiki semua yang gagal, ulangi sampai lulus. Masing-masing poin menjadi checklist di README bagian **Security**.

- [x] **6. Responsive + loading polish**

- Sidebar → Sheet (mobile) + hamburger di header; cek 375px.
- Semua tabel: skeleton (5 baris) + empty state + error alert.
- `pnpm build` tanpa warning `useSearchParams` tanpa `Suspense` (bungkus komponen search).

- [x] **7. README.md**

Isi: deskripsi singkat, prasyarat (Node 20+, Docker, pnpm), setup step-by-step (`docker compose up -d`, `cp .env.example .env`, isi env, `pnpm install`, `pnpm db:migrate`, `pnpm dev`), cara membuat Google OAuth client (ringkas, rujuk Sesi 3), daftar script npm, struktur folder, catatan keamanan + hasil audit.

- [x] **8. Acceptance run-through (PRD §14)**

Jalankan manual di browser, centang di README bagian **Acceptance MVP**:

```text
[x] 1. Login ke aplikasi
[x] 2. Connect Google Account A
[x] 3. Connect Google Account B
[x] 4. Melihat quota keduanya
[x] 5. Melihat file Account A & B
[x] 6. Upload file (pilih akun manual)
[x] 7. Memilih account tujuan terlihat & benar
[x] 8. Download file
[x] 9. Delete file
[x] 10. Disconnect account
[x] Bonus: dashboard total/used/free; search lintas akun; create folder; rate limit aktif
```

- [x] **9. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: error handling, account health, rate limits, security audit, mvp acceptance"
```

### Verifikasi

- [x] Seluruh perintah audit (langkah 5) lulus
- [x] Simulasi 1 akun rusak (ubah `access_token` jadi rusak) → file akun lain tetap tampil, akun rusak `Reconnect Required` + tombol Reconnect
- [x] Simulasi refresh gagal (refresh token rusak) → status di DB berubah `reconnect_required`
- [x] Upload ke-11 dalam 60 detik → 429 dengan pesan ramah
- [x] `pnpm build` tanpa warning; layout OK di 375/768/1280px
- [x] Checklist Acceptance MVP di README semua tercentang
- [x] `git log --oneline | head -8` menunjukkan commit per sesi rapi

### Handoff

- [x] Commit terakhir sesi 8 → **MVP selesai**
- [x] Update baris **Sesi 8** di tracker: ✅, tanggal, catatan (status MVP + daftar kekurangan yang diketahui)
- [x] Tambah entri **Log Sesi** bila ada keputusan lintas sesi baru

---

## 5. Phase 2 — Sesi 9–13 [SELESAI]

> Seluruh sesi Phase 2 telah selesai dikerjakan, diverifikasi, dan di-commit (lihat [Tracker](#1-tracker) dan [Log Sesi](#8-keputusan-teknis--deviasi-dari-prd)). Bagian di bawah ini merupakan ringkasan eksekutif artefak dan hasil verifikasi tiap sesi.

---

### Sesi 9 — Move, Rename, Copy File [✅ SELESAI]

- **Goal:** File & folder dapat di-rename, dipindahkan antar folder (dalam akun yang sama), di-copy, serta folder dapat dihapus rekursif; seluruh aksi tercatat di `activity_logs`.
- **Artefak:**
  - `src/lib/files/move-params.ts`: `buildMoveParams(fromParentId, toParentId)`
  - `src/lib/google-drive/service.ts`: method `renameFile`, `moveFile`, `copyFile`, `listFolders`
  - API Routes: `PATCH /api/files/[id]`, `POST /api/files/[id]/copy`, `PATCH /api/folders/[id]`, `DELETE /api/folders/[id]`, `GET /api/folders`
  - UI: Menu aksi baris (`DropdownMenu`) & dialog modal Rename, Move (folder picker), Copy, dan Delete confirmation di `src/components/files/file-actions.tsx`.
- **Hasil Verifikasi:** Unit test `buildMoveParams` PASS; rename/move/copy file & delete folder teruji via live curl dan tercermin di Google Drive; activity log mencatat `file.rename`, `file.move`, `file.copy`, `file.delete`.
- **Catatan Handoff:** Copy dan move beroperasi dalam satu akun yang sama (lintas akun dikerjakan di Phase 3 Sesi 17).

---

### Sesi 10 — Automatic Account Selection (Mode B) [✅ SELESAI]

- **Goal:** Upload otomatis memilih akun tujuan berdasarkan sisa kuota terbesar yang muat file (algoritma PRD §6.3), dengan preview kelayakan sebelum upload.
- **Artefak:**
  - `src/lib/upload/select-account.ts`: `selectAccount(fileSize, accounts)`
  - API Route: `POST /api/files/upload?mode=auto` (auto-refresh quota seluruh akun, auto-seleksi tujuan, proteksi `413 QUOTA_EXCEEDED` bila seluruh akun tidak muat).
  - UI: Radio destination (`Automatic` vs `Specific account`) di `UploadDialog` + panel preview kandidat akun (✅/❌) sesuai ukuran file.
- **Hasil Verifikasi:** 4 unit test `selectAccount` PASS (termasuk skenario PRD); mode auto memilih akun dengan free space terbesar; penolakan file yang melampaui seluruh kapasitas akun; kuota akun tujuan ter-sync setelah upload.
- **Catatan Handoff:** Mode auto siap digunakan untuk multi-file queue di Phase 3 Sesi 14.

---

### Sesi 11 — Activity Log Page + Statistik [✅ SELESAI]

- **Goal:** Halaman riwayat aktivitas (filter & pagination) dan halaman statistik storage/file dengan visualisasi grafik.
- **Artefak:**
  - Dependensi: `recharts`, helper agregasi di `src/lib/stats.ts`.
  - API Routes: `GET /api/activity` (filter `action`, `accountId`, pagination `page`/`pageSize`), `GET /api/stats` (totals, `fileKinds` breakdown dari `drive_files`, snapshot history, action counts).
  - UI: Halaman `/dashboard/activity` (`ActivityTable`), halaman `/dashboard/stats` (`StatsCards` & `StatsCharts` AreaChart), menu Stats di sidebar.
- **Hasil Verifikasi:** Aktivitas file terfilter rapi; statistik storage konsisten dengan dashboard; grafik riwayat snapshot render tanpa hydration error; isolasi multi-tenant terverifikasi aman.
- **Catatan Handoff:** Akurasi statistik jenis file bergantung pada kelengkapan index `drive_files` yang disegarkan berkala oleh worker.

---

### Sesi 12 — Background Sync (Worker) + Account Health Monitoring [✅ SELESAI]

- **Goal:** Proses worker mandiri tanpa Redis untuk sync quota berkala (10m), health monitoring & token refresh (30m), serta indexing file ke `drive_files` (60m).
- **Artefak:**
  - `src/worker/index.ts`: interval loop worker aman test (`!process.env.VITEST`).
  - `src/lib/google-drive/indexer.ts`: `indexAccountFiles(account)` paging penuh (hingga 2.000 file/akun) dengan batch upsert ke tabel `drive_files`.
  - Health check: deteksi akun putus/token expired → ubah status `reconnect_required`, auto-recovery ke `connected` saat pulih.
  - Infrastruktur: service `worker` pada `docker-compose.yml`, panduan PM2/systemd VPS di README.
  - UI: `AccountsTable` & Dashboard auto-refetch tiap 5 menit.
- **Hasil Verifikasi:** Worker berjalan stabil di Docker/local; snapshot kuota bertambah otomatis; token rusak mengubah status UI menjadi `reconnect_required`; kegagalan 1 akun tidak mematikan worker (resilient).
- **Catatan Handoff:** Loop worker siap dikembangkan dengan heartbeat monitoring pada Phase 3 Sesi 18.

---

### Sesi 13 — Advanced Search + File Preview [✅ SELESAI]

- **Goal:** Pencarian file lanjutan (rentang tanggal, rentang ukuran, multi-select akun) dan dialog preview file langsung di dashboard.
- **Artefak:**
  - `src/lib/google-drive/query.ts`: `buildDriveQuery` diperluas (`sizeMin`, `sizeMax`, `modifiedAfter`, `modifiedBefore`).
  - Penanganan keterbatasan Drive API: sanitasi query di `service.ts` & in-memory filtering untuk filter `size` di `GET /api/files`.
  - API Route: `GET /api/files` mendukung multi-select `accountIds` (koma).
  - UI: `FilesFilters` popover filter lanjutan (date range, size input MB/GB, checklist multi-akun); `PreviewDialog` (iframe viewer Google Drive + fallback link); double click baris tabel.
- **Hasil Verifikasi:** Unit test query builder PASS; filter rentang tanggal, ukuran, dan multi-akun bekerja akurat; preview Google Doc/PDF/gambar tampil di dialog; sinkronisasi URL shallow query param berfungsi.
- **Catatan Handoff:** Sesi 13 menutup Phase 2 dengan seluruh pipeline pengujian lulus (65 unit test).

---

## 6. Phase 3 — Sesi 14–18

> Sesi lanjutan untuk peningkatan skala, keandalan, dan operasi massal (PRD §12 Phase 3). Aturan tetap berlaku: satu sesi = satu session opencode baru, jalankan seluruh blok verifikasi, dan perbarui tracker setelah commit.

---

## Sesi 14 — Drag & Drop + Concurrent Upload Queue & Retry UI [✅ SELESAI]

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 14 dari implementasi.md. Baca PRD.md §6 (Upload), §12 Phase 3 (Multi-file upload, Upload queue, Retry failed uploads, Drag & drop), lalu Global Constraints + Sesi 14. Kerjakan hanya Sesi 14, verifikasi lulus, commit, update tracker.`

**Goal:** Memungkinkan user mengunggah banyak file sekaligus via drag & drop (pada modal maupun overlay global pada halaman Files) dengan antrean upload di sisi client yang memiliki concurrency control (maksimal 2–3 file diunggah secara bersamaan), progress bar per file, tombol pembatalan (AbortController), floating drawer status di pojok kanan bawah ala Google Drive, serta fitur retry untuk file yang gagal diunggah.

**Prasyarat:** Sesi 10 (Upload Mode A/B) & Sesi 13 (Halaman Files).

**Consumes:** `POST /api/files/upload` (Sesi 6 & 10), tabel `upload_jobs`, `UploadDialog`.

**Produces:**
- `src/lib/upload/upload-queue.ts` (manajemen antrean upload di sisi klien, concurrency control pool, abort controller per item, status transition).
- `src/components/upload/upload-dropzone.tsx` (komponen drop area interaktif dengan visual drag-over state).
- `src/components/upload/upload-queue-drawer.tsx` (floating dock widget di kanan bawah layar: minimize/maximize, daftar file dengan progress bar, status icon, tombol cancel per item, dan tombol retry failed items).
- Global drag-and-drop overlay di `/dashboard/files` (drag file desktop langsung memicu antrean upload).
- Unit test `src/lib/__tests__/upload-queue.test.ts`.

### Langkah-langkah

- [x] **1. Unit test antrean upload & concurrency pool (merah)**

Buat `src/lib/__tests__/upload-queue.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { UploadQueueManager, type QueueItem } from '@/lib/upload/upload-queue';

describe('UploadQueueManager', () => {
  it('membatasi concurrency maksimum sesuai konfigurasi', async () => {
    const queue = new UploadQueueManager({ maxConcurrency: 2 });
    let running = 0;
    let maxRunning = 0;

    const mockUploader = vi.fn(async (_item: QueueItem) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 50));
      running--;
    });

    queue.setUploader(mockUploader);

    const dummyFiles = [
      new File(['a'], 'a.txt', { type: 'text/plain' }),
      new File(['b'], 'b.txt', { type: 'text/plain' }),
      new File(['c'], 'c.txt', { type: 'text/plain' }),
      new File(['d'], 'd.txt', { type: 'text/plain' }),
    ];

    queue.addFiles(dummyFiles, { mode: 'auto' });
    await queue.waitForAll();

    expect(maxRunning).toBe(2);
    expect(mockUploader).toHaveBeenCalledTimes(4);
    expect(queue.getItems().every((item) => item.status === 'completed')).toBe(true);
  });

  it('bisa membatalkan item yang sedang berjalan via AbortController', async () => {
    const queue = new UploadQueueManager({ maxConcurrency: 1 });
    const mockUploader = vi.fn(async (item: QueueItem) => {
      await new Promise((resolve, reject) => {
        item.abortController?.signal.addEventListener('abort', () => reject(new Error('Aborted')));
      });
    });

    queue.setUploader(mockUploader);
    const file = new File(['test'], 'cancel.txt', { type: 'text/plain' });
    const [item] = queue.addFiles([file], { mode: 'auto' });

    setTimeout(() => {
      queue.cancelItem(item.id);
    }, 10);

    await queue.waitForAll();
    expect(queue.getItem(item.id)?.status).toBe('cancelled');
  });

  it('dapat mengulang file yang gagal (retry)', async () => {
    const queue = new UploadQueueManager({ maxConcurrency: 1 });
    let attempt = 0;
    const mockUploader = vi.fn(async () => {
      attempt++;
      if (attempt === 1) throw new Error('Network error');
    });

    queue.setUploader(mockUploader);
    const file = new File(['fail'], 'retry.txt', { type: 'text/plain' });
    const [item] = queue.addFiles([file], { mode: 'auto' });

    await queue.waitForAll();
    expect(queue.getItem(item.id)?.status).toBe('failed');

    // Retry
    queue.retryItem(item.id);
    await queue.waitForAll();
    expect(queue.getItem(item.id)?.status).toBe('completed');
  });
});
```

Jalankan `pnpm test src/lib/__tests__/upload-queue.test.ts` → FAIL.

- [x] **2. Implementasi UploadQueueManager**

Buat `src/lib/upload/upload-queue.ts`:

```ts
export type UploadStatus = 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled';

export interface QueueItem {
  id: string;
  file: File;
  accountId?: string;
  folderId?: string;
  mode: 'auto' | 'manual';
  status: UploadStatus;
  progress: number; // 0 - 100
  error?: string;
  abortController?: AbortController;
  uploadedAt?: Date;
}

export type QueueListener = (items: QueueItem[]) => void;
export type FileUploader = (item: QueueItem, onProgress: (pct: number) => void) => Promise<void>;

export class UploadQueueManager {
  private items: Map<string, QueueItem> = new Map();
  private maxConcurrency: number;
  private activeUploads = 0;
  private listeners: Set<QueueListener> = new Set();
  private uploader?: FileUploader;
  private allDoneResolvers: Array<() => void> = [];

  constructor(options: { maxConcurrency?: number } = {}) {
    this.maxConcurrency = options.maxConcurrency ?? 2;
  }

  setUploader(uploader: FileUploader) {
    this.uploader = uploader;
  }

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener(this.getItems());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const list = this.getItems();
    this.listeners.forEach((cb) => cb(list));
    if (this.activeUploads === 0 && !list.some((i) => i.status === 'queued')) {
      const resolvers = [...this.allDoneResolvers];
      this.allDoneResolvers = [];
      resolvers.forEach((r) => r());
    }
  }

  getItems(): QueueItem[] {
    return Array.from(this.items.values());
  }

  getItem(id: string): QueueItem | undefined {
    return this.items.get(id);
  }

  addFiles(files: File[], options: { accountId?: string; folderId?: string; mode: 'auto' | 'manual' }): QueueItem[] {
    const newItems: QueueItem[] = files.map((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const item: QueueItem = {
        id,
        file,
        accountId: options.accountId,
        folderId: options.folderId,
        mode: options.mode,
        status: 'queued',
        progress: 0,
        abortController: new AbortController(),
      };
      this.items.set(id, item);
      return item;
    });

    this.notify();
    this.processQueue();
    return newItems;
  }

  private async processQueue() {
    if (!this.uploader) return;

    while (this.activeUploads < this.maxConcurrency) {
      const nextItem = Array.from(this.items.values()).find((i) => i.status === 'queued');
      if (!nextItem) break;

      this.activeUploads++;
      nextItem.status = 'uploading';
      nextItem.error = undefined;
      nextItem.abortController = new AbortController();
      this.notify();

      this.executeUpload(nextItem);
    }
  }

  private async executeUpload(item: QueueItem) {
    try {
      await this.uploader!(item, (pct) => {
        item.progress = pct;
        this.notify();
      });
      item.status = 'completed';
      item.progress = 100;
      item.uploadedAt = new Date();
    } catch (err: any) {
      if (item.abortController?.signal.aborted || err?.message === 'Aborted') {
        item.status = 'cancelled';
      } else {
        item.status = 'failed';
        item.error = err instanceof Error ? err.message : 'Upload gagal';
      }
    } finally {
      this.activeUploads--;
      this.notify();
      this.processQueue();
    }
  }

  cancelItem(id: string) {
    const item = this.items.get(id);
    if (!item) return;
    if (item.status === 'uploading') {
      item.abortController?.abort();
      item.status = 'cancelled';
    } else if (item.status === 'queued') {
      item.status = 'cancelled';
    }
    this.notify();
  }

  retryItem(id: string) {
    const item = this.items.get(id);
    if (!item || (item.status !== 'failed' && item.status !== 'cancelled')) return;
    item.status = 'queued';
    item.progress = 0;
    item.error = undefined;
    this.notify();
    this.processQueue();
  }

  retryAllFailed() {
    for (const item of this.items.values()) {
      if (item.status === 'failed') {
        item.status = 'queued';
        item.progress = 0;
        item.error = undefined;
      }
    }
    this.notify();
    this.processQueue();
  }

  clearFinished() {
    for (const [id, item] of this.items.entries()) {
      if (item.status === 'completed' || item.status === 'cancelled') {
        this.items.delete(id);
      }
    }
    this.notify();
  }

  waitForAll(): Promise<void> {
    if (this.activeUploads === 0 && !Array.from(this.items.values()).some((i) => i.status === 'queued')) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.allDoneResolvers.push(resolve);
    });
  }
}

// Global singleton instance for application client
export const globalUploadQueue = new UploadQueueManager({ maxConcurrency: 2 });
```

Jalankan `pnpm test src/lib/__tests__/upload-queue.test.ts` → PASS.

- [x] **3. Komponen UploadDropzone**

Buat `src/components/upload/upload-dropzone.tsx`:
- Render area drag-and-drop dengan border dashed Tailwind (`border-dashed border-2 p-6 rounded-lg text-center cursor-pointer hover:border-primary transition-colors`).
- Tangani event: `onDragOver`, `onDragLeave`, `onDrop`. Tampilkan highlight visual saat `isDragging` bernilai true.
- Sediakan input file tersembunyi (`<input type="file" multiple />`) dengan trigger klik area.
- Tampilkan informasi: ikon `UploadCloud`, teks "Tarik & lepas file di sini atau klik untuk memilih file", keterangan batas ukuran dan multi-file.

- [x] **4. Komponen Floating UploadQueueDrawer**

Buat `src/components/upload/upload-queue-drawer.tsx`:
- Posisi fixed mengambang di pojok kanan bawah: `fixed bottom-4 right-4 w-80 md:w-96 shadow-2xl border bg-background/95 backdrop-blur rounded-xl z-50 overflow-hidden`.
- Tampil otomatis saat ada minimal 1 file dalam `globalUploadQueue`.
- Header:
  - Jumlah file aktif/selesai: mis. "Mengunggah 2 dari 5 file".
  - Icon minimize/maximize (ChevronDown / ChevronUp).
  - Tombol tutup/bersihkan selesai (X).
- Body (saat expanded):
  - Daftar file dengan scrollbar:
    - Nama file + ukuran file formatBytes.
    - Status icon: loader berputar (`uploading`), centang hijau (`completed`), segitiga merah (`failed`), abu-abu (`queued`).
    - Progress bar linear (`<Progress value={item.progress} />`).
    - Aksi baris: tombol Cancel (`X`) saat mengunggah, tombol Retry (`RotateCw`) saat gagal dengan tooltip pesan error.
- Footer:
  - Ringkasan status dan tombol "Retry All Failed" jika terdapat file gagal.
- Integrasikan uploader default ke `globalUploadQueue` menggunakan fetch ke `POST /api/files/upload`:
  - Gunakan `XMLHttpRequest` atau `fetch` streaming untuk membaca `progress`.
  - Pasang `signal: item.abortController?.signal`.
  - Invalidate TanStack query `['files']` dan `['storage']` setelah selesai.

- [x] **5. Integrasi ke UploadDialog dan Global Drag-Drop di Halaman Files**

- Di `src/components/upload/upload-dialog.tsx`:
  - Ganti input file biasa dengan `<UploadDropzone onFilesSelected={...} />`.
  - Saat tombol "Upload" diklik pada modal, masukkan seluruh file terpilih ke `globalUploadQueue.addFiles(...)`, tutup modal, dan biarkan floating drawer menangani upload di latar belakang.
- Di `src/app/dashboard/files/page.tsx`:
  - Tambahkan global drag listener pada container dashboard:
    - Jika user menyeret file dari sistem operasi ke dalam halaman Files, munculkan backdrop overlay transparan dengan border dashed biru: "Lepaskan file untuk mulai mengunggah ke Google Drive".
    - Event `drop` langsung mendaftarkan file ke `globalUploadQueue` dengan mode `auto` (atau akun aktif) tanpa mewajibkan pembukaan modal secara manual lebih dulu.
- Pasang `<UploadQueueDrawer />` di `src/app/dashboard/layout.tsx` sehingga drawer tetap tampil dan upload tidak terputus saat user berpindah halaman di dashboard.

- [x] **6. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: drag-and-drop and concurrent upload queue with retry UI"
```

### Verifikasi

- [x] `pnpm test src/lib/__tests__/upload-queue.test.ts` → PASS
- [x] Drag & drop 4 file sekaligus ke UploadDialog → semua file masuk ke queue drawer
- [x] Maksimal 2 upload berjalan paralel; file ke-3 dan ke-4 menunggu giliran (status `queued`)
- [x] Drag file langsung ke halaman `/dashboard/files` menampilkan overlay drop dan memasukkan file ke queue
- [x] Klik tombol Cancel pada item yang sedang jalan membatalkan upload via AbortController
- [x] Simulasi gagal (mis. file terlalu besar / server error) memunculkan status `failed` dan tombol Retry
- [x] Klik Retry mengunggah ulang file yang gagal tanpa perlu memilih ulang dari file system
- [x] Drawer kanan bawah dapat di-collapse (minimize) dan di-expand
- [x] Pindah halaman dashboard (ke `/dashboard/accounts` atau `/dashboard/activity`) tidak membatalkan upload yang sedang berjalan
- [x] Pipeline lulus: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

### Handoff

- [x] Commit terakhir sesi 14
- [x] Update baris **Sesi 14** di tracker: ✅, tanggal, catatan handoff (concurrency limit, drawer state)

---

## Sesi 15 — Large File Resumable Upload & Network Resilience

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 15 dari implementasi.md. Baca PRD.md §6.2 (Large file handling), §12 Phase 3 (Resumable retry, chunk manual), lalu Global Constraints + Sesi 15. Kerjakan hanya Sesi 15, verifikasi lulus, commit, update tracker.`

**Goal:** Mendukung pengunggahan file berukuran besar (>50 MB hingga multi-GB) secara tangguh menggunakan protokol Google Drive Resumable Upload berbasis chunk byte-range, pencatatan session URI dan byte progress di tabel `upload_jobs`, serta kemampuan resume dari byte offset terakhir jika koneksi terputus di tengah jalan tanpa mengulang dari awal.

**Prasyarat:** Sesi 14 (Upload queue & retry).

**Consumes:** `GoogleDriveService`, `UPLOAD_BASE`, tabel `upload_jobs`, `src/lib/upload/upload-queue.ts`.

**Produces:**
- Migrasi skema: kolom `resumableUri` (text) dan `uploadedBytes` (bigint) pada tabel `upload_jobs`.
- Method `GoogleDriveService`:
  - `initiateResumableSession(meta)`: mendapatkan resumable upload URL dari Google Drive.
  - `getResumableOffset(sessionUri, fileSize)`: mengecek byte range yang sudah diterima Google Drive (`PUT` dengan `Content-Range: bytes */fileSize`).
  - `uploadChunk(sessionUri, chunk, startByte, totalSize)`: mengirim potongan chunk byte range ke Google API.
- API Endpoints:
  - `POST /api/files/upload/session`: inisiasi sesi resumable Google dan buat record `upload_jobs` status `uploading`.
  - `PUT /api/files/upload/chunk`: menerima chunk binary dengan header `Content-Range`, meneruskan ke Google Drive, mengembalikan offset terbaru.
  - `GET /api/files/upload/session/[id]/status`: query Google Drive untuk mengetahui byte offset yang tersimpan untuk auto-resume.
- Helper client `src/lib/upload/chunked-uploader.ts` terintegrasi dengan `UploadQueueManager`.
- Unit test `src/lib/__tests__/chunked-upload.test.ts`.

### Langkah-langkah

- [x] **1. Migrasi skema database upload_jobs**

Perbarui `src/db/schema/upload-jobs.ts`:
Tambahkan kolom `resumableUri` dan `uploadedBytes`:

```ts
export const uploadJobs = pgTable('upload_jobs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  googleAccountId: text('google_account_id')
    .notNull()
    .references(() => googleAccounts.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  status: text('status', { enum: ['pending', 'uploading', 'completed', 'failed'] })
    .notNull()
    .default('pending'),
  resumableUri: text('resumable_uri'),
  uploadedBytes: bigint('uploaded_bytes', { mode: 'number' }).notNull().default(0),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});
```

Jalankan perintah migrasi:
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

- [x] **2. Unit test chunking & Google 308 resume range (merah)**

Buat `src/lib/__tests__/chunked-upload.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseResumeOffset, buildContentRangeHeader } from '@/lib/upload/chunk-helpers';

describe('Chunk Helpers', () => {
  it('membuat header Content-Range dengan benar', () => {
    const header = buildContentRangeHeader(0, 5242879, 15000000);
    expect(header).toBe('bytes 0-5242879/15000000');
  });

  it('mengurai header Range respons Google 308', () => {
    // Google mengembalikan header: Range: bytes=0-5242879
    const offset = parseResumeOffset('bytes=0-5242879');
    expect(offset).toBe(5242880);
  });

  it('mengembalikan 0 jika header Range tidak ada atau kosong', () => {
    expect(parseResumeOffset(null)).toBe(0);
    expect(parseResumeOffset('')).toBe(0);
  });
});
```

Jalankan `pnpm test src/lib/__tests__/chunked-upload.test.ts` → FAIL.

- [x] **3. Implementasi helper chunk & service methods**

Buat `src/lib/upload/chunk-helpers.ts`:

```ts
export function buildContentRangeHeader(start: number, end: number, total: number): string {
  return `bytes ${start}-${end}/${total}`;
}

export function parseResumeOffset(rangeHeader: string | null): number {
  if (!rangeHeader) return 0;
  const match = rangeHeader.match(/bytes=0-(\d+)/);
  if (!match) return 0;
  return Number(match[1]) + 1;
}
```

Tambahkan method di `src/lib/google-drive/service.ts`:

```ts
async initiateResumableSession(meta: {
  filename: string;
  mimeType: string;
  fileSize: number;
  parentId?: string;
}): Promise<string> {
  const metadata = {
    name: meta.filename,
    ...(meta.parentId ? { parents: [meta.parentId] } : {}),
  };

  const res = await fetch(`${UPLOAD_BASE}/files?uploadType=resumable`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${this.accessToken}`,
      'X-Upload-Content-Type': meta.mimeType,
      'X-Upload-Content-Length': String(meta.fileSize),
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) throw await mapGoogleError(res, this.account);
  const location = res.headers.get('location');
  if (!location) throw new AppError('DRIVE_API_ERROR', 'Google tidak mengembalikan upload session URL.', 500);
  return location;
}

async getResumableOffset(sessionUri: string, fileSize: number): Promise<number> {
  const res = await fetch(sessionUri, {
    method: 'PUT',
    headers: {
      'Content-Range': `bytes */${fileSize}`,
    },
  });

  if (res.status === 308) {
    return parseResumeOffset(res.headers.get('range'));
  }
  if (res.status === 200 || res.status === 201) {
    return fileSize; // sudah selesai
  }
  throw await mapGoogleError(res, this.account);
}

async uploadChunk(params: {
  sessionUri: string;
  chunk: ArrayBuffer;
  startByte: number;
  totalSize: number;
}): Promise<{ completed: boolean; file?: DriveFileDto }> {
  const endByte = params.startByte + params.chunk.byteLength - 1;
  const contentRange = buildContentRangeHeader(params.startByte, endByte, params.totalSize);

  const res = await fetch(params.sessionUri, {
    method: 'PUT',
    headers: {
      'Content-Length': String(params.chunk.byteLength),
      'Content-Range': contentRange,
    },
    body: params.chunk,
  });

  if (res.status === 308) {
    return { completed: false };
  }

  if (res.status === 200 || res.status === 201) {
    const body = await res.json();
    return {
      completed: true,
      file: {
        id: body.id,
        name: body.name,
        mimeType: body.mimeType,
        sizeBytes: body.size ? Number(body.size) : null,
        modifiedAt: body.modifiedTime ?? null,
        parentId: body.parents?.[0] ?? null,
        webViewLink: body.webViewLink ?? null,
        accountId: this.account.id,
        accountEmail: this.account.email,
      },
    };
  }

  throw await mapGoogleError(res, this.account);
}
```

Jalankan `pnpm test src/lib/__tests__/chunked-upload.test.ts` → PASS.

- [x] **4. API Endpoints untuk sesi chunked upload**

Buat `src/app/api/files/upload/session/route.ts`:
- Route `POST` dengan `withAuth`: menerima `{ filename, fileSize, contentType, accountId?, folderId?, mode? }`.
- Resolusi akun: jika `mode === 'auto'`, gunakan `selectAccount` (Sesi 10); jika manual, gunakan `accountId`.
- Buat record `upload_jobs` dengan status `uploading`.
- Panggil `service.initiateResumableSession(...)` → dapatkan Google `sessionUri`.
- Simpan `resumableUri` ke baris `upload_jobs`.
- Kembalikan `{ jobId, accountId, sessionUri }`.

Buat `src/app/api/files/upload/chunk/route.ts`:
- Route `PUT` dengan `withAuth`: menerima query param `?jobId=...`.
- Baca header `Content-Range: bytes start-end/total`.
- Ambil job dari DB, verifikasi milik user.
- Baca chunk binary dari `req.arrayBuffer()`.
- Panggil `service.uploadChunk(...)`.
- Update `uploadedBytes` pada `upload_jobs`.
- Jika `completed: true`:
  - Update `upload_jobs.status = 'completed'`, `completedAt = new Date()`.
  - Jalankan `syncQuota(account)`.
  - Tulis ke `activity_logs` (`action: 'file.upload'`).
- Kembalikan status `{ completed, uploadedBytes: endByte + 1, file }`.

Buat `src/app/api/files/upload/session/[id]/status/route.ts`:
- Route `GET` dengan `withAuth`: mengembalikan offset terbaru via `service.getResumableOffset(...)`.

- [x] **5. Client ChunkedUploader & integrasi UploadQueueManager**

Buat `src/lib/upload/chunked-uploader.ts`:
- Ukuran chunk: 5 MB (`5 * 1024 * 1024` byte, kelipatan 256 KB sesuai spesifikasi Google).
- Fungsi `uploadFileChunked(item: QueueItem, onProgress: (pct: number) => void)`:
  - Untuk file kecil (< 10 MB), langsung gunakan endpoint streaming `POST /api/files/upload`.
  - Untuk file besar (≥ 10 MB):
    1. Panggil `POST /api/files/upload/session` untuk inisiasi.
    2. Loop pemotongan file: `file.slice(start, end)`.
    3. Kirim ke `PUT /api/files/upload/chunk?jobId=...` dengan abort signal.
    4. Jika request terputus di tengah (mis. network glitch):
       - Tangani error dengan auto-retry: panggil `GET /api/files/upload/session/[id]/status` untuk mendapatkan byte offset terakhir.
       - Lanjutkan loop dari byte offset tersebut tanpa mengulang chunk sebelumnya.
    5. Laporkan persentase `(uploadedBytes / totalSize) * 100` ke callback `onProgress`.
- Pasang `uploadFileChunked` sebagai default uploader pada `globalUploadQueue` di `src/lib/upload/upload-queue.ts`.

- [x] **6. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: large file chunked resumable upload and network resilience"
```

### Verifikasi

- [x] Unit test `chunk-helpers.test.ts` PASS
- [x] Upload file 50 MB+ terkirim dalam beberapa chunk bertahap (progress 10%..30%..100%)
- [x] Simulasi interupsi koneksi (abort di 50% lalu resume) mengembalikan offset 50% dan melanjutkan sisa chunk
- [x] File yang selesai diunggah dapat diunduh kembali dan memiliki checksum/size identik
- [x] Tabel `upload_jobs` mencatat `status = 'completed'` dengan `uploaded_bytes = file_size`
- [x] Snapshot storage akun ter-update otomatis pasca upload chunk selesai
- [x] Pipeline lulus: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

### Handoff

- [x] Commit terakhir sesi 15
- [x] Update baris **Sesi 15** di tracker: ✅, tanggal, catatan handoff (chunk size, protokol resume Google)

---

## Sesi 16 — Multi-Select Table & Bulk Operations (Delete & Move)

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 16 dari implementasi.md. Baca PRD.md §5.5 (Actions), §12 Phase 3 (Bulk delete, Bulk move), lalu Global Constraints + Sesi 16. Kerjakan hanya Sesi 16, verifikasi lulus, commit, update tracker.`

**Goal:** Menyediakan mode seleksi multi-item pada `FilesTable` (checkbox baris, select all di halaman, shift-click range), floating bulk action bar, serta eksekusi operasi massal: bulk delete (dengan konfirmasi aman) dan bulk move ke folder tertentu dengan kontrol concurrency pool di server.

**Prasyarat:** Sesi 9 (Move/Delete) & Sesi 13 (FilesTable).

**Consumes:** `FilesTable`, `GoogleDriveService.deleteFile`, `GoogleDriveService.moveFile`, `logActivity`.

**Produces:**
- Helper batch runner `src/lib/utils/batch.ts` (eksekusi paralel terkontrol dengan concurrency limit 5).
- Fitur row selection TanStack Table v9 pada `src/components/files/files-table.tsx` (kolom checkbox, header select-all, keyboard shift-click selection).
- Komponen `src/components/files/bulk-action-bar.tsx` (floating bar di bagian bawah layar saat ≥ 1 file dipilih: count terpilih, tombol `Move (N)`, `Delete (N)`, dan `Deselect All`).
- API Routes:
  - `POST /api/files/bulk-delete`: menghapus banyak file lintas/dalam akun dengan concurrency pool, mengembalikan ringkasan status.
  - `POST /api/files/bulk-move`: memindahkan banyak file ke folder tujuan dengan validasi akun.
- Dialog konfirmasi `BulkDeleteDialog` & `BulkMoveDialog` dengan visual progress execution.
- Unit test `src/lib/__tests__/bulk-operations.test.ts`.

### Langkah-langkah

- [x] **1. Unit test batch runner concurrency pool (merah)**

Buat `src/lib/__tests__/bulk-operations.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { runBatchPool } from '@/lib/utils/batch';

describe('runBatchPool', () => {
  it('menjalankan tugas dalam pool concurrency terkontrol', async () => {
    let running = 0;
    let maxRunning = 0;
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const results = await runBatchPool(items, 3, async (item) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 20));
      running--;
      return item * 2;
    });

    expect(maxRunning).toBe(3);
    expect(results.length).toBe(10);
    expect(results.every((r) => r.success)).toBe(true);
    expect(results[0]?.result).toBe(2);
  });

  it('tetap melanjutkan tugas lain bila salah satu item gagal', async () => {
    const items = ['ok1', 'fail', 'ok2'];
    const results = await runBatchPool(items, 2, async (item) => {
      if (item === 'fail') throw new Error('Item error');
      return item.toUpperCase();
    });

    expect(results.find((r) => r.item === 'fail')?.success).toBe(false);
    expect(results.find((r) => r.item === 'ok1')?.success).toBe(true);
    expect(results.find((r) => r.item === 'ok2')?.success).toBe(true);
  });
});
```

Jalankan `pnpm test src/lib/__tests__/bulk-operations.test.ts` → FAIL.

- [x] **2. Implementasi batch runner pool**

Buat `src/lib/utils/batch.ts`:

```ts
export interface BatchResult<T, R> {
  item: T;
  success: boolean;
  result?: R;
  error?: string;
}

export async function runBatchPool<T, R>(
  items: T[],
  concurrency: number,
  workerFn: (item: T) => Promise<R>,
): Promise<Array<BatchResult<T, R>>> {
  const results: Array<BatchResult<T, R>> = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      const item = items[idx]!;
      try {
        const res = await workerFn(item);
        results[idx] = { item, success: true, result: res };
      } catch (err: any) {
        results[idx] = {
          item,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(pool);
  return results;
}
```

Jalankan `pnpm test src/lib/__tests__/bulk-operations.test.ts` → PASS.

- [x] **3. API Endpoints bulk delete & bulk move**

Buat `src/app/api/files/bulk-delete/route.ts`:
- Route `POST` dengan `withAuth`.
- Body: `{ items: Array<{ id: string; accountId: string; name?: string }> }`.
- Validasi: `items` berupa array tidak kosong (maksimal 100 item/request).
- Ambil semua akun user untuk verifikasi kepemilikan.
- Eksekusi menggunakan `runBatchPool(items, 5, async ({ id, accountId, name }) => ...)`:
  - Ambil `service` untuk `accountId`.
  - Panggil `service.deleteFile(id)`.
  - Hapus dari cache `drive_files` jika ada.
  - Catat `logActivity({ action: 'file.delete', fileId: id, metadata: { bulk: true, name } })`.
- Kembalikan `{ deletedCount, failedCount, errors: [...] }`.

Buat `src/app/api/files/bulk-move/route.ts`:
- Route `POST` dengan `withAuth`.
- Body: `{ items: Array<{ id: string; accountId: string; fromFolderId?: string | null }>; targetFolderId: string | null; targetAccountId: string }`.
- Validasi: semua file dalam `items` harus berasal dari `targetAccountId` (pemindahan folder hanya dalam akun yang sama).
- Eksekusi menggunakan `runBatchPool` (concurrency 5):
  - Panggil `service.moveFile(id, fromFolderId ?? null, targetFolderId)`.
  - Catat `logActivity({ action: 'file.move', fileId: id, metadata: { bulk: true, toFolderId: targetFolderId } })`.
- Kembalikan `{ movedCount, failedCount, errors: [...] }`.

- [x] **4. Checkbox selection pada FilesTable & BulkActionBar**

Di `src/components/files/files-table.tsx`:
- Aktifkan fitur row selection TanStack Table v9:
  - Tambahkan kolom pertama: checkbox Base UI.
  - Header kolom: Checkbox select all (memilih seluruh baris yang sedang tampil di halaman).
  - Shift-click selection: simpan index baris terakhir yang diklik; jika Shift ditekan, pilih rentang baris di antaranya.
  - Hitung `selectedFiles = table.getSelectedRowModel().rows.map(r => r.original)`.

Buat `src/components/files/bulk-action-bar.tsx`:
- Render fixed bar di bagian bawah tengah layar saat `selectedFiles.length > 0`:
  `fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 bg-card border rounded-full shadow-2xl animate-in slide-in-from-bottom-4`.
- Menampilkan:
  - Badge jumlah: `{selectedCount} item terpilih`.
  - Tombol **Move** (`FolderInput` icon) → buka `BulkMoveDialog`.
  - Tombol **Delete** (`Trash2` icon, destructive variant) → buka `BulkDeleteDialog`.
  - Tombol **Batal** (`X` icon) → bersihkan state seleksi.

- [x] **5. Dialog BulkDeleteDialog & BulkMoveDialog**

Buat `src/components/files/bulk-delete-dialog.tsx`:
- AlertDialog konfirmasi: "Apakah Anda yakin ingin menghapus {N} item terpilih? Aksi ini akan memindahkan item ke sampah Google Drive."
- List scrollable berisi daftar nama file terpilih.
- Tombol "Hapus Permanen" memicu mutation `POST /api/files/bulk-delete`.
- Tampilkan progress bar saat penghapusan berlangsung. Setelah selesai, tampilkan toast ringkasan, bersihkan seleksi, dan invalidasi `['files']` & `['storage']`.

Buat `src/components/files/bulk-move-dialog.tsx`:
- Dialog pemilihan folder tujuan: jika file berasal dari multi-akun, tampilkan peringatan bahwa pemindahan bulk hanya dapat dilakukan untuk file dalam akun yang sama (atau kelompokkan per akun).
- Folder picker dropdown (daftar folder dari akun terkait).
- Tombol "Pindahkan" memanggil `POST /api/files/bulk-move`.

- [x] **6. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: multi-select table and bulk delete and move operations"
```

### Verifikasi

- [x] Unit test `bulk-operations.test.ts` PASS
- [x] Checkbox per baris memilih/melepas seleksi; select-all di header memilih semua item halaman
- [x] Shift-click memilih rentang file berurutan secara instan
- [x] Floating Bulk Action Bar muncul saat 1+ item terpilih dan hilang saat dibatalkan
- [x] Bulk delete 5 file: dialog konfirmasi tampil, proses progress berjalan, seluruh file terhapus dari UI & Drive
- [x] Bulk move 5 file ke folder tujuan memindahkan seluruh file ke folder target
- [x] Error isolation: jika 1 file gagal dihapus (mis. permission), file lain tetap terhapus dan error dilaporkan di toast
- [x] Activity log mencatat entri per file yang dihapus/dipindahkan
- [x] Pipeline lulus: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

### Handoff

- [x] Commit terakhir sesi 16
- [x] Update baris **Sesi 16** di tracker: ✅, tanggal, catatan handoff (bulk batch concurrency limit)

---

## Sesi 17 — ~~Storage Balancing Engine & Cross-Account File Migration~~ 🚫 DIBATALKAN

> **DIBATALKAN** — Sesi ini digantikan oleh Phase 4 (Shared Virtual Drive). Fitur storage balancing & cross-account migration akan diadaptasi dalam konteks shared folder di **Sesi 24**.

---

## Sesi 18 — ~~Distributed Rate Limiter & Production Hardening~~ 🚫 DIBATALKAN

> **DIBATALKAN** — Sesi ini digantikan oleh Phase 4. Distributed rate limiter, worker heartbeat, dan production hardening masuk **Sesi 25**.

---

## 7. Phase 4 — Sesi 19–25: Shared Virtual Drive

> **Transformasi arsitektur besar:** Mengubah aplikasi dari "multi-account flat file listing" menjadi **Shared Virtual Drive** — satu folder root terpadu milik akun utama, di-share ke semua akun pool, dengan tampilan menyerupai Google Drive asli.
>
> **Referensi utama:** `PRD.md` versi 2.0 (§5 Konsep Arsitektur: Shared Virtual Drive).
>
> Aturan tetap berlaku: satu sesi = satu session baru, jalankan seluruh blok verifikasi, dan perbarui tracker setelah commit.

---

## Sesi 19 — Schema Migration + Setup Wizard (Shared Root)

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 19 dari implementasi.md. Baca PRD.md §5 (Konsep Arsitektur: Shared Virtual Drive), §6.2 (Setup Wizard), §9.3 (Database Schema), lalu Global Constraints + Sesi 19. Kerjakan hanya Sesi 19, verifikasi lulus, commit, update tracker.`

**Goal:** Menyiapkan fondasi database dan alur setup awal untuk Shared Virtual Drive: tabel baru `shared_roots` dan `shared_permissions`, kolom `role` di `google_accounts`, Setup Wizard UI, dan API untuk membuat folder root di akun utama serta men-share folder tersebut ke akun-akun pool yang sudah terhubung.

**Prasyarat:** Sesi 16 (Phase 3 partial selesai).

**Consumes:** Skema `google_accounts`, `GoogleDriveService`, OAuth callback, tabel `storage_snapshots`.

**Produces:**
- Skema database baru:
  - `src/db/schema/shared-roots.ts`: tabel `shared_roots` (`id`, `user_id`, `primary_account_id`, `drive_folder_id`, `folder_name`, `created_at`).
  - `src/db/schema/shared-permissions.ts`: tabel `shared_permissions` (`id`, `shared_root_id`, `google_account_id`, `drive_permission_id`, `status`, `created_at`).
  - Kolom `role` (`'primary' | 'pool'`, default `'pool'`) ditambahkan ke `google_accounts`.
- Service baru:
  - `src/lib/shared-drive/setup.ts`: logika setup shared root (create folder, share to accounts).
  - `src/lib/shared-drive/permissions.ts`: logika sharing permission ke akun pool.
- Metode baru di `GoogleDriveService`:
  - `createSharedRootFolder(name: string)`: membuat folder di root Drive akun utama.
  - `shareFolder(folderId: string, email: string, role: 'writer')`: share folder ke email, return permission ID.
  - `revokePermission(folderId: string, permissionId: string)`: cabut share.
- API Routes:
  - `POST /api/setup/init`: body `{ primaryAccountId, folderName? }` → buat folder root, set akun sebagai primary, share ke akun pool yang sudah ada.
  - `GET /api/setup/status`: return `{ isSetupDone, sharedRoot?, primaryAccount? }`.
  - `POST /api/setup/share/[accountId]`: share folder root ke satu akun pool baru.
- UI:
  - `src/components/setup/setup-wizard.tsx`: wizard multi-step (pilih primary account → buat folder → tambah akun pool → selesai).
  - `src/app/dashboard/setup/page.tsx`: halaman setup wizard.
  - Guard di `dashboard/layout.tsx`: jika setup belum selesai, redirect ke `/dashboard/setup`.
- Modifikasi callback OAuth:
  - Setelah akun baru terhubung, jika shared root sudah ada, otomatis share folder root ke akun baru dan catat di `shared_permissions`.
- Unit test `src/lib/__tests__/shared-drive-setup.test.ts`.

### Langkah-langkah

- [x] **1. Skema database baru**

Buat `src/db/schema/shared-roots.ts`:

```ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { user } from './auth';
import { googleAccounts } from './google-accounts';

export const sharedRoots = pgTable('shared_roots', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  primaryAccountId: text('primary_account_id').notNull().references(() => googleAccounts.id, { onDelete: 'cascade' }),
  driveFolderId: text('drive_folder_id').notNull(),
  folderName: text('folder_name').notNull().default('GDrive Pool'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Buat `src/db/schema/shared-permissions.ts`:

```ts
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { sharedRoots } from './shared-roots';
import { googleAccounts } from './google-accounts';

export const sharedPermissions = pgTable(
  'shared_permissions',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    sharedRootId: text('shared_root_id').notNull().references(() => sharedRoots.id, { onDelete: 'cascade' }),
    googleAccountId: text('google_account_id').notNull().references(() => googleAccounts.id, { onDelete: 'cascade' }),
    drivePermissionId: text('drive_permission_id').notNull(),
    status: text('status', { enum: ['active', 'pending', 'revoked'] }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('shared_permissions_root_idx').on(t.sharedRootId)],
);
```

Tambahkan kolom `role` ke `google_accounts`:

```ts
role: text('role', { enum: ['primary', 'pool'] }).notNull().default('pool'),
```

Export di `src/db/schema/index.ts`, generate & migrate:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

- [x] **2. Google Drive Service — metode sharing**

Tambahkan ke `GoogleDriveService`:

```ts
async createSharedRootFolder(name: string): Promise<{ id: string; name: string }> {
  const res = await this.request('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const data = await res.json() as { id: string; name: string };
  return data;
}

async shareFolder(folderId: string, email: string, role: 'writer' | 'reader' = 'writer'): Promise<string> {
  const res = await this.request(`/files/${folderId}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'user',
      role,
      emailAddress: email,
    }),
  });
  const data = await res.json() as { id: string };
  return data.id; // drive permission ID
}

async revokePermission(folderId: string, permissionId: string): Promise<void> {
  await this.request(`/files/${folderId}/permissions/${permissionId}`, {
    method: 'DELETE',
  });
}
```

- [x] **3. Shared drive setup service**

Buat `src/lib/shared-drive/setup.ts`:

```ts
import { db } from '@/db';
import { googleAccounts, sharedRoots, sharedPermissions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { logActivity } from '@/lib/activity';

export async function initSharedRoot(options: {
  userId: string;
  primaryAccountId: string;
  folderName?: string;
}): Promise<{ sharedRootId: string; driveFolderId: string }> {
  // 1. Verifikasi akun milik user
  const account = await db.query.googleAccounts.findFirst({
    where: and(eq(googleAccounts.id, options.primaryAccountId), eq(googleAccounts.userId, options.userId)),
  });
  if (!account) throw new Error('Account not found');

  // 2. Set akun sebagai primary
  await db.update(googleAccounts)
    .set({ role: 'primary' })
    .where(eq(googleAccounts.id, account.id));

  // 3. Buat folder root di Google Drive
  const service = await GoogleDriveService.forAccount(account);
  const folder = await service.createSharedRootFolder(options.folderName ?? 'GDrive Pool');

  // 4. Simpan ke DB
  const [root] = await db.insert(sharedRoots).values({
    userId: options.userId,
    primaryAccountId: account.id,
    driveFolderId: folder.id,
    folderName: folder.name,
  }).returning();

  // 5. Share ke semua akun pool yang sudah ada
  const poolAccounts = await db.query.googleAccounts.findMany({
    where: and(eq(googleAccounts.userId, options.userId), eq(googleAccounts.id, account.id).not()),
  });

  for (const poolAccount of poolAccounts) {
    await shareRootToAccount(root!.id, folder.id, account, poolAccount);
  }

  await logActivity({
    userId: options.userId,
    googleAccountId: account.id,
    action: 'setup.init',
    metadata: { folderId: folder.id, folderName: folder.name, poolAccountsShared: poolAccounts.length },
  });

  return { sharedRootId: root!.id, driveFolderId: folder.id };
}

export async function shareRootToAccount(
  sharedRootId: string,
  driveFolderId: string,
  primaryAccount: GoogleAccount,
  poolAccount: GoogleAccount,
): Promise<void> {
  const service = await GoogleDriveService.forAccount(primaryAccount);
  const permId = await service.shareFolder(driveFolderId, poolAccount.email, 'writer');

  await db.insert(sharedPermissions).values({
    sharedRootId,
    googleAccountId: poolAccount.id,
    drivePermissionId: permId,
    status: 'active',
  });
}

export async function getSetupStatus(userId: string) {
  const root = await db.query.sharedRoots.findFirst({
    where: eq(sharedRoots.userId, userId),
  });

  if (!root) return { isSetupDone: false };

  const primaryAccount = await db.query.googleAccounts.findFirst({
    where: eq(googleAccounts.id, root.primaryAccountId),
  });

  return {
    isSetupDone: true,
    sharedRoot: root,
    primaryAccount,
  };
}
```

> **Catatan:** Snippet di atas adalah panduan; eksekutor harus menyesuaikan import type, query DSL, dan error handling sesuai pola codebase existing (misal gunakan `AppError`, `withAuth`, dll.).

- [x] **4. API Routes setup**

Buat `src/app/api/setup/init/route.ts`:
- `POST` dengan `withAuth`.
- Body: `{ primaryAccountId: string, folderName?: string }`.
- Panggil `initSharedRoot(...)`.
- Kembalikan `{ sharedRootId, driveFolderId }`.

Buat `src/app/api/setup/status/route.ts`:
- `GET` dengan `withAuth`.
- Panggil `getSetupStatus(userId)`.
- Kembalikan `{ isSetupDone, sharedRoot?, primaryAccount? }`.

Buat `src/app/api/setup/share/[accountId]/route.ts`:
- `POST` dengan `withAuth`.
- Cari shared root milik user, cari akun pool, share folder.

- [x] **5. Modifikasi OAuth callback**

Di `src/app/api/google/callback/route.ts`:
- Setelah berhasil simpan akun baru, cek apakah user sudah punya `sharedRoot`.
- Jika ya, otomatis panggil `shareRootToAccount(...)` untuk share folder root ke akun baru.
- Jika ini adalah akun pertama user, jangan share (belum ada root).

- [x] **6. Setup Wizard UI**

Buat `src/components/setup/setup-wizard.tsx`:
- Multi-step form:
  - Step 1: "Hubungkan akun Google utama" → tombol Connect (redirect OAuth).
  - Step 2: "Buat folder root" → input nama folder, tombol Create (panggil `POST /api/setup/init`).
  - Step 3: "Tambah akun lain (opsional)" → tombol Add More / Skip.
  - Step 4: "Selesai! Shared Drive siap." → tombol Go to My Drive.
- Tampilkan progress indicator (step 1/4, 2/4, dst).

Buat `src/app/dashboard/setup/page.tsx`:
- Render `SetupWizard`.
- Jika setup sudah selesai, redirect ke `/dashboard`.

Modifikasi `src/app/dashboard/layout.tsx`:
- Setelah guard auth, cek `GET /api/setup/status`.
- Jika `isSetupDone === false` dan halaman bukan `/dashboard/setup`, redirect ke `/dashboard/setup`.

- [x] **7. Unit test**

Buat `src/lib/__tests__/shared-drive-setup.test.ts`:
- Test `getSetupStatus` returns `isSetupDone: false` when no root.
- Test logika dasar setup flow (mocked).

- [x] **8. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: phase 4 schema migration and setup wizard for shared virtual drive"
```

### Verifikasi

- [x] Migrasi DB berhasil (tabel `shared_roots`, `shared_permissions` dibuat, kolom `role` di `google_accounts` ada)
- [x] `GET /api/setup/status` → `{ isSetupDone: false }` saat belum setup
- [x] `POST /api/setup/init` → folder "GDrive Pool" terbuat di Google Drive akun utama
- [x] Akun utama ter-set `role: 'primary'`, akun lain `role: 'pool'`
- [x] Akun pool yang sudah ada otomatis diberi permission Editor ke folder root
- [x] Permission tercatat di tabel `shared_permissions` dengan `drive_permission_id` dari Google
- [x] Buka Google Drive akun pool → folder "GDrive Pool" muncul di "Shared with me"
- [x] Setup Wizard UI tampil saat user belum setup → redirect otomatis
- [x] Setelah setup selesai, redirect ke `/dashboard`
- [x] Connect akun baru via OAuth → otomatis ter-share folder root
- [x] Pipeline lulus: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

### Handoff

- [x] Commit terakhir sesi 19
- [x] Update baris **Sesi 19** di tracker: ✅, tanggal, catatan handoff

---

## Sesi 20 — File Browser: Folder Navigation + Breadcrumb

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 20 dari implementasi.md. Baca PRD.md §5.5 (Pembuatan Folder), §6.3 (My Drive / File Browser), §9.7 (Dashboard Components), lalu Global Constraints + Sesi 20. Kerjakan hanya Sesi 20, verifikasi lulus, commit, update tracker.`

**Goal:** Membangun file browser yang mirip Google Drive: menampilkan isi folder (bukan flat list semua file), navigasi klik folder → masuk ke subfolder, breadcrumb navigasi, tombol back ke parent, dan sidebar entry "My Drive" yang mengarah ke root folder.

**Prasyarat:** Sesi 19 (Shared root sudah dibuat, folder root ID tersedia).

**Consumes:** `sharedRoots`, `GoogleDriveService.listFiles`, tabel `drive_files`.

**Produces:**
- Refactor `GET /api/files`:
  - Default behavior: list files **di dalam folder tertentu** (parameter `?folderId=`).
  - Jika `folderId` tidak diberikan, gunakan `sharedRoot.driveFolderId` (root folder).
  - Query Google Drive: `'<folderId>' in parents and trashed = false`.
  - Response menyertakan `currentFolder` (id, name) dan `breadcrumb` (array folder dari root ke current).
- API `GET /api/folders/[id]/breadcrumb`:
  - Mengembalikan array breadcrumb dari root hingga folder saat ini.
  - Implementasi: traverse parent chain via Google Drive API `getFile(id, fields: 'id,name,parents')`.
- Komponen UI:
  - `src/components/file-browser/breadcrumb.tsx`: breadcrumb navigasi klikabel (`My Drive > Documents > Reports`).
  - `src/components/file-browser/file-browser.tsx`: wrapper utama yang mengelola state folder saat ini.
  - Modifikasi `src/components/files/files-table.tsx`: klik baris folder → navigasi ke folder tersebut (bukan download/preview).
- Routing:
  - URL: `/dashboard?folderId=<id>` atau `/dashboard/files?folderId=<id>`.
  - State folder saat ini disimpan di URL query param.
- Sidebar:
  - Entry "My Drive" → navigasi ke root (tanpa `folderId`).

### Langkah-langkah

- [x] **1. Refactor API `GET /api/files` — folder-scoped listing**

Ubah `GET /api/files` agar:
- Menerima parameter `?folderId=<drive_folder_id>`.
- Jika tidak ada `folderId`, ambil dari `sharedRoot.driveFolderId`.
- Query Google Drive: `'${folderId}' in parents and trashed = false` (ditambahkan ke query builder).
- Response menyertakan metadata folder saat ini.

- [x] **2. API breadcrumb**

Buat `GET /api/folders/[id]/breadcrumb`:
- Traverse parent chain folder menggunakan `GoogleDriveService.getFile(id)` (field `parents`).
- Berhenti saat sampai di root folder (match `sharedRoot.driveFolderId`).
- Return array `[{ id, name }, ...]` dari root ke current.

- [x] **3. Komponen Breadcrumb**

Buat `src/components/file-browser/breadcrumb.tsx`:
- Render breadcrumb klikabel: `📁 My Drive > Documents > Reports`.
- Klik item → navigasi ke folder tersebut (`router.push` / update URL).
- Item terakhir = folder aktif (tidak klikabel).

- [x] **4. Komponen File Browser**

Buat `src/components/file-browser/file-browser.tsx`:
- Membaca `folderId` dari URL search params (default: root).
- Fetch file list dan breadcrumb.
- Render: Breadcrumb + Toolbar + FilesTable.
- Handle navigasi: klik folder row → update `folderId` di URL.

- [x] **5. Modifikasi FilesTable — folder klik**

Di `src/components/files/files-table.tsx`:
- Klik baris folder → navigasi ke folder tersebut (update URL `?folderId=`).
- Klik baris file → tetap behavior lama (preview/actions).
- Kolom "Account" bisa dihilangkan atau dijadikan opsional (karena user tidak perlu tahu file di akun mana).

- [x] **6. Sidebar update**

Modifikasi `src/components/layout/sidebar.tsx`:
- Entry "My Drive" → link ke `/dashboard` (root folder, tanpa `folderId`).
- Hilangkan atau sesuaikan entry "Files" (karena "My Drive" = file browser).

- [x] **7. Dashboard page — redirect ke file browser**

Modifikasi `src/app/dashboard/page.tsx`:
- Halaman dashboard utama sekarang adalah file browser (bukan storage overview).
- Atau: buat `/dashboard` sebagai file browser, pindahkan storage overview ke `/dashboard/storage`.

- [x] **8. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: file browser with folder navigation and breadcrumb"
```

### Verifikasi

- [x] Navigasi ke `/dashboard` → tampil isi root folder (bukan flat list semua file)
- [x] Klik folder "Documents" → URL berubah ke `?folderId=<id>`, isi folder ditampilkan
- [x] Breadcrumb menunjukkan `My Drive > Documents`
- [x] Klik "My Drive" di breadcrumb → kembali ke root folder
- [x] Folder kosong → tampil pesan "Empty folder"
- [x] Search tetap berfungsi (di dalam konteks folder atau global)
- [x] Sidebar "My Drive" mengarah ke root folder
- [x] Pipeline lulus: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

### Handoff

- [x] Commit terakhir sesi 20
- [x] Update baris **Sesi 20** di tracker: ✅, tanggal, catatan handoff

---

## Sesi 21 — Upload ke Shared Folder + Folder Creation by Primary Account

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 21 dari implementasi.md. Baca PRD.md §5.5 (Pembuatan Folder), §7 (Upload & Pemilihan Akun), lalu Global Constraints + Sesi 21. Kerjakan hanya Sesi 21, verifikasi lulus, commit, update tracker.`

**Goal:** Mengadaptasi upload agar file di-upload ke **shared folder yang sedang dibuka** (bukan ke root Drive akun tertentu), dan folder creation selalu menggunakan **akun utama** sebagai owner.

**Prasyarat:** Sesi 20 (File browser dengan folderId context).

**Consumes:** Upload routes, `selectAccount`, `GoogleDriveService.uploadFile`, `createFolder`, `sharedRoots`.

**Produces:**
- Refactor `POST /api/files/upload`:
  - Wajib menerima parameter `parentFolderId` (ID folder tujuan upload).
  - Jika tidak ada, gunakan `sharedRoot.driveFolderId` (root).
  - Algoritma pemilihan akun tetap berlaku (pilih akun paling lapang).
  - Upload menggunakan token akun yang dipilih, dengan metadata `parents: [parentFolderId]`.
  - File otomatis muncul di shared folder (karena semua akun punya akses).
- Refactor `POST /api/folders`:
  - Folder **selalu dibuat oleh akun utama** (menggunakan token akun utama).
  - Parameter `parentFolderId` menentukan parent folder (default: root).
  - Folder mewarisi permission dari parent (Google Drive behavior).
- Refactor upload chunked (`POST /api/files/upload/session`):
  - Metadata resumable session menyertakan `parents: [parentFolderId]`.
- UI:
  - `UploadDialog` dan `UploadDropzone` mengirimkan `parentFolderId` saat ini ke API.
  - `NewFolderDialog` memanggil API dengan `parentFolderId` saat ini.
  - Hilangkan pilihan manual akun dari UploadDialog (default: automatic).
  - Tetap sediakan advanced option untuk memilih akun secara manual.

### Langkah-langkah

- [x] **1. Refactor upload API — parentFolderId**

Modifikasi `POST /api/files/upload`:
- Terima `parentFolderId` dari body/query.
- Jika kosong, ambil root folder dari `sharedRoots`.
- Pada pembuatan metadata Google Drive, set `parents: [parentFolderId]`.
- Pemilihan akun (automatic) tetap sama: pilih akun paling lapang.

- [x] **2. Refactor folder creation — always primary**

Modifikasi `POST /api/folders`:
- Ambil akun utama dari `sharedRoots.primaryAccountId`.
- Buat folder menggunakan token akun utama.
- Set `parents: [parentFolderId]` (parent = folder saat ini).
- Folder otomatis mewarisi sharing permission dari parent.

- [x] **3. Refactor upload chunked — parentFolderId**

Modifikasi `POST /api/files/upload/session`:
- Metadata resumable session menyertakan `parents: [parentFolderId]`.

- [x] **4. UI — context-aware upload**

Modifikasi `UploadDialog`:
- Default mode: Automatic (tidak perlu pilih akun).
- Kirim `parentFolderId` (folder saat ini dari file browser state).
- Advanced toggle: pilih akun manual (jika user ingin).

Modifikasi `NewFolderDialog`:
- Kirim `parentFolderId` ke `POST /api/folders`.

Modifikasi `UploadDropzone` dan `FilesDropOverlay`:
- Sertakan `parentFolderId` saat menambahkan file ke upload queue.

- [x] **5. Unit test**

Test bahwa upload API menolak jika parentFolderId bukan subfolder dari shared root (opsional validation).

- [x] **6. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: upload to shared folder and folder creation by primary account"
```

### Verifikasi

- [x] Upload file di root folder → file muncul di root shared folder
- [x] Navigasi ke subfolder → upload file → file muncul di subfolder tersebut
- [x] Upload automatic → akun paling lapang dipilih, quota akun tersebut berkurang
- [x] Buat folder baru → owner folder = akun utama (verifikasi di Google Drive web)
- [x] Buat subfolder di dalam subfolder → permission inherited, bisa diakses semua akun pool
- [x] Upload chunked (file besar) → file muncul di folder saat ini
- [x] Drag & drop file ke halaman file browser → upload ke folder saat ini
- [x] Pipeline lulus: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

### Handoff

- [x] Commit terakhir sesi 21
- [x] Update baris **Sesi 21** di tracker: ✅, tanggal, catatan handoff

---

## Sesi 22 — Refactor File Operations untuk Shared Drive

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 22 dari implementasi.md. Baca PRD.md §5.4–§5.6 (Mekanisme Shared Drive), §6.7 (Global Search), lalu Global Constraints + Sesi 22. Kerjakan hanya Sesi 22, verifikasi lulus, commit, update tracker.`

**Goal:** Mengadaptasi seluruh operasi file (download, delete, rename, move, copy, bulk) agar bekerja dalam konteks shared folder, dan refactor search agar scoped ke shared root.

**Prasyarat:** Sesi 21 (Upload sudah context-aware, folder creation sudah by primary).

**Consumes:** Seluruh route file operations, `GoogleDriveService`, `drive_files` index cache.

**Produces:**
- Refactor operasi file:
  - **Download**: tetap sama (download dari akun pemilik file).
  - **Delete**: menentukan akun pemilik file → delete menggunakan token akun pemilik. Perlu lookup `drive_files.googleAccountId` untuk mendapatkan akun pemilik.
  - **Rename**: tetap sama (rename bisa dilakukan oleh siapa saja yang punya Editor access).
  - **Move**: move file antar folder dalam shared root. Gunakan token akun utama (sebagai owner folder) atau akun pemilik file.
  - **Copy**: copy file ke folder lain dalam shared root.
  - **Bulk delete**: adaptasi untuk multi-account context (file berbeda bisa dimiliki akun berbeda).
  - **Bulk move**: adaptasi untuk shared folder context.
- Refactor search:
  - Search scoped ke shared root: query `'<rootFolderId>' in parents` (rekursif Google Drive search).
  - Atau: search di `drive_files` index cache yang sudah scoped ke shared root.
- Refactor `drive_files` index cache:
  - Index hanya file yang berada di shared root folder (bukan seluruh Drive).
  - Worker indexer: list files di shared root → upsert ke `drive_files`.
- Hilangkan kolom/filter "Account" dari file listing UI:
  - User tidak perlu tahu file di akun mana (abstracted away).
  - Info akun pemilik bisa ditampilkan di detail/tooltip (opsional).

### Langkah-langkah

- [x] **1. Refactor file operations — shared context**

Untuk setiap operasi file, pastikan:
- Lookup akun pemilik file melalui `drive_files.googleAccountId`.
- Gunakan token akun pemilik untuk operasi yang membutuhkan ownership (delete, download).
- Gunakan token akun utama untuk operasi folder (move antar folder).

- [x] **2. Refactor search — scoped ke shared root**

Modifikasi `GET /api/files`:
- Jika `?search=` diberikan, cari di `drive_files` index cache (yang sudah scoped ke shared root).
- Atau cari via Google Drive API: `name contains '<term>' and '<rootFolderId>' in parents` (perlu explore apakah Google Drive API mendukung recursive search dalam folder).
- Alternative: search di index cache `drive_files` yang sudah scoped.

- [x] **3. Refactor index cache**

Modifikasi worker indexer (`src/lib/google-drive/indexer.ts`):
- Index hanya file yang berada di shared root folder.
- Gunakan query: `'<rootFolderId>' in parents and trashed = false` untuk setiap level.
- Atau: list semua file yang accessible dari akun utama dengan `q` filter.

- [x] **4. UI — hide account column**

Modifikasi `FilesTable`:
- Hilangkan atau sembunyikan kolom "Account" dari default view.
- Opsional: tampilkan akun pemilik di tooltip atau detail pane.

Modifikasi `FilesFilters`:
- Hilangkan filter "Account" (karena semua file berada di satu shared space).
- Pertahankan filter lain (type, date, size).

- [x] **5. Bulk operations — multi-account aware**

Modifikasi `POST /api/files/bulk-delete` dan `POST /api/files/bulk-move`:
- Group file berdasarkan akun pemilik.
- Execute delete/move per akun menggunakan token masing-masing.

- [x] **6. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: refactor file operations for shared drive context"
```

### Verifikasi

- [x] Download file → berhasil (menggunakan token akun pemilik)
- [x] Delete file → file terhapus dari shared folder dan Google Drive akun pemilik
- [x] Rename file → nama berubah di shared folder
- [x] Move file dari folder A ke folder B → file pindah
- [x] Copy file → salinan muncul di folder tujuan
- [x] Search di shared root → hasil hanya file dalam shared folder
- [x] Bulk delete file (milik akun berbeda) → semua terhapus
- [x] Kolom "Account" tidak terlihat di default view file browser
- [x] Index cache hanya berisi file dari shared root
- [x] Pipeline lulus: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

### Handoff

- [x] Commit terakhir sesi 22
- [x] Update baris **Sesi 22** di tracker: ✅, tanggal, catatan handoff

---

## Sesi 23 — UI Revamp: GDrive-like Interface

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 23 dari implementasi.md. Baca PRD.md §12 (UI Design), §9.7 (Dashboard Components), lalu Global Constraints + Sesi 23. Kerjakan hanya Sesi 23, verifikasi lulus, commit, update tracker.`

**Goal:** Merombak tampilan UI agar menyerupai Google Drive: sidebar dengan storage bar, file browser sebagai halaman utama, toolbar upload/new folder, grid view (opsional), dan responsive layout yang bersih.

**Prasyarat:** Sesi 22 (Semua operasi file sudah bekerja dalam shared folder context).

**Consumes:** Seluruh komponen UI existing.

**Produces:**
- Sidebar revamp:
  - Entry: My Drive, Recent, Accounts, Storage, Activity, Settings.
  - Storage bar di bagian bawah sidebar: `"243 GB of 1.46 TB used"` + progress bar.
  - Active state pada entry yang dipilih.
- Header revamp:
  - Logo/nama app di kiri.
  - Search bar di tengah.
  - User menu di kanan.
  - Tanpa tombol-tombol yang sudah pindah ke toolbar file browser.
- File browser toolbar:
  - Tombol: `+ New` (dropdown: New Folder, Upload Files), view toggle (Grid/List), Sort dropdown.
  - Posisi: di atas file list, di bawah breadcrumb.
- Grid view (opsional):
  - Thumbnail grid untuk file (mirip Google Drive grid view).
  - Toggle antara grid dan list view.
- Halaman Storage:
  - Pindahkan StorageOverview, AccountList, storage charts ke `/dashboard/storage`.
- Halaman Recent:
  - `/dashboard/recent`: file terbaru (modified/opened), mirip Google Drive "Recent".
- Responsive:
  - Sidebar collapse di mobile.
  - File browser full width di mobile.
  - Touch-friendly actions.
- Dark theme consistency.

### Langkah-langkah

- [x] **1. Sidebar revamp**

Modifikasi `src/components/layout/sidebar.tsx`:
- Entry list: My Drive (📁), Recent (🕐), Accounts (👥), Storage (💾), Activity (📋), Settings (⚙).
- Storage bar di bawah: fetch `/api/storage`, render `"X GB of Y TB used"` + progress bar mini.
- Highlight active page.

- [x] **2. Header simplify**

Modifikasi `src/components/layout/header.tsx`:
- Logo + app name di kiri.
- Search input di tengah (expand on focus).
- User avatar + menu di kanan.
- Hapus tombol Add Account dan Refresh dari header (pindah ke halaman Accounts).

- [x] **3. File browser toolbar**

Buat `src/components/file-browser/toolbar.tsx`:
- Tombol `+ New` (dropdown: "New Folder", "Upload Files").
- Toggle view: Grid | List (state disimpan localStorage).
- Sort dropdown (Name, Modified, Size).
- Filter toggle (jika ada filter aktif).

- [x] **4. Halaman Storage**

Buat/pindahkan ke `src/app/dashboard/storage/page.tsx`:
- StorageOverview (total pool, used, free).
- AccountList (per-akun storage cards).
- StatsCharts (jika sudah ada dari Sesi 11).

- [x] **5. Halaman Recent**

Buat `src/app/dashboard/recent/page.tsx`:
- Fetch recent files (modified dalam 7 hari terakhir).
- Tampilkan sebagai list/grid (reuse file browser components).

- [x] **6. Grid view (opsional)**

Buat `src/components/file-browser/file-grid.tsx`:
- Render file/folder sebagai card grid.
- Folder: icon folder + nama.
- File: icon berdasarkan mime type + nama + size.
- Toggle antara `FileGrid` dan `FilesTable`.

- [x] **7. Responsive + dark theme audit**

- Sidebar: Sheet overlay di mobile (< 768px).
- File browser: full width tanpa sidebar di mobile.
- Toolbar: stack vertikal di layar kecil.
- Pastikan semua komponen baru dark theme compatible.

- [x] **8. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: UI revamp with GDrive-like interface"
```

### Verifikasi

- [x] Tampilan mirip Google Drive: sidebar, file browser, breadcrumb, toolbar
- [x] Storage bar di sidebar menunjukkan total pool capacity
- [x] Sidebar active state benar saat navigasi antar halaman
- [x] Toolbar: New Folder, Upload bekerja
- [x] Halaman Storage (`/dashboard/storage`) menampilkan per-akun info
- [x] Halaman Recent (`/dashboard/recent`) menampilkan file terbaru
- [x] Grid view toggle berfungsi (jika diimplementasikan)
- [x] Responsive: sidebar collapse di mobile, layout tidak rusak
- [x] Dark theme konsisten di semua halaman
- [x] Pipeline lulus: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

### Handoff

- [x] Commit terakhir sesi 23
- [x] Update baris **Sesi 23** di tracker: ✅, tanggal, catatan handoff

---

## Sesi 24 — Shared Drive Integrity + Storage Balancing (Adapted)

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 24 dari implementasi.md. Baca PRD.md §11.3 (Shared Root Integrity), §5.3 (Pool Accounts), lalu Global Constraints + Sesi 24. Kerjakan hanya Sesi 24, verifikasi lulus, commit, update tracker.`

**Goal:** Memastikan integritas shared root folder (auto-verify, auto-repair), menangani penambahan/penghapusan akun pool dengan benar, dan mengadaptasi storage balancing engine untuk konteks shared folder.

**Prasyarat:** Sesi 23 (UI revamp selesai, semua fitur shared drive berfungsi).

**Consumes:** Worker, `sharedRoots`, `sharedPermissions`, `GoogleDriveService`, storage balancing dari Sesi 17 (konsep).

**Produces:**
- Worker integrity check:
  - Verifikasi folder root masih ada di Google Drive.
  - Verifikasi permission semua akun pool masih aktif.
  - Auto-reshare jika permission hilang.
  - Alert jika folder root dihapus (error state).
- Account lifecycle:
  - Connect akun baru → auto-share folder root.
  - Disconnect akun → revoke permission dari folder root, hapus dari `shared_permissions`.
- Storage balancing (adapted):
  - `src/lib/storage/balancing.ts`: algoritma tetap sama (deteksi ketimpangan, rekomendasi).
  - Migration: pindahkan file dari akun penuh ke akun lapang **dalam shared folder yang sama** (file tetap di folder yang sama, tapi owner berubah).
  - Implementasi: download dari akun A → upload dari akun B ke folder yang sama → delete file asli di akun A.
  - API `POST /api/files/migrate` dan `GET /api/storage/balancing`.
- UI:
  - Storage Balancing card di halaman Storage.
  - Migrate file dialog.

### Langkah-langkah

- [ ] **1. Worker integrity check**

Tambahkan di `src/worker/index.ts`:
- Interval baru: `sharedRootIntegrity` setiap 30 menit.
- Cek folder root masih ada (getFile).
- Cek permissions (list permissions di folder root).
- Jika permission akun pool hilang → auto-reshare.
- Log hasil di `activity_logs`.

- [ ] **2. Account disconnect — revoke permission**

Modifikasi `DELETE /api/accounts/[id]`:
- Sebelum delete akun dari DB, revoke permission dari folder root.
- Hapus baris dari `shared_permissions`.

- [ ] **3. Storage balancing engine**

Buat/adaptasi `src/lib/storage/balancing.ts` (konsep dari Sesi 17, tapi disesuaikan):
- `calculateStorageImbalance(accounts)`: sama seperti konsep Sesi 17.
- `getBalancingRecommendations(accounts, files)`: rekomendasi berdasarkan file di shared folder.

- [ ] **4. Migration service (adapted)**

Buat `src/lib/google-drive/migration.ts`:
- Download file dari akun A → upload dari akun B ke **folder yang sama** (parentFolderId sama).
- Delete file asli dari akun A.
- Update `drive_files` index cache.

- [ ] **5. API balancing & migration**

Buat `GET /api/storage/balancing`:
- Return skor ketimpangan dan rekomendasi.

Buat `POST /api/files/migrate`:
- Execute transfer file.

- [ ] **6. UI cards & dialog**

Buat `src/components/stats/storage-balancing-card.tsx`.
Buat `src/components/files/migrate-file-dialog.tsx`.
Tambahkan aksi "Migrate" ke file actions dropdown.

- [ ] **7. Unit test**

Buat `src/lib/__tests__/storage-balancing.test.ts`.

- [ ] **8. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: shared drive integrity checks and storage balancing"
```

### Verifikasi

- [ ] Worker verifikasi shared root → log "Root folder OK" / "Permission re-shared"
- [ ] Hapus permission akun pool secara manual di Google Drive → worker otomatis reshare
- [ ] Disconnect akun pool → permission dicabut dari folder root
- [ ] Connect akun baru → auto-share folder root
- [ ] Storage balancing mendeteksi ketimpangan dengan benar
- [ ] Migrasi file dari akun penuh ke akun lapang berhasil (file tetap di folder yang sama)
- [ ] Pipeline lulus: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

### Handoff

- [ ] Commit terakhir sesi 24
- [ ] Update baris **Sesi 24** di tracker: ✅, tanggal, catatan handoff

---

## Sesi 25 — Production Hardening + Phase 4 Acceptance

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 25 dari implementasi.md. Baca PRD.md §10 (Security), §11 (Reliability), §15 (Acceptance Criteria), lalu Global Constraints + Sesi 25. Kerjakan hanya Sesi 25, verifikasi lulus, commit, update tracker.`

**Goal:** Production hardening (distributed rate limit, worker heartbeat, audit keamanan) dan Acceptance run-through Phase 4 lengkap.

**Prasyarat:** Sesi 24.

**Consumes:** Seluruh API routes, worker, PRD §10 & §15.

**Produces:**
- Distributed rate limiter (dari konsep Sesi 18):
  - `src/db/schema/rate-limits.ts`: tabel `rate_limits`.
  - `src/db/schema/worker-status.ts`: tabel `worker_status`.
  - `src/lib/rate-limit/distributed.ts`: sliding window PostgreSQL.
  - Ganti in-memory rate limiter di seluruh API routes.
- Worker heartbeat:
  - Worker memperbarui heartbeat setiap 30 detik ke `worker_status`.
  - `GET /api/worker/health`: return status (active/stale/stopped).
  - UI: `WorkerStatusBadge` di header.
- Audit keamanan:
  - Verifikasi semua route dilindungi `withAuth`.
  - Verifikasi semua query difilter `user_id`.
  - Verifikasi tidak ada token di log.
  - Verifikasi shared folder permission hanya untuk akun user sendiri.
- Acceptance run-through Phase 4:
  1. Login → Setup wizard → Primary account → Root folder created.
  2. Add 2+ pool accounts → auto-shared.
  3. My Drive menampilkan isi root folder.
  4. Buat folder → owner = primary.
  5. Upload file → akun otomatis, file di folder.
  6. Navigasi folder, breadcrumb.
  7. Download, delete, rename, move, copy.
  8. Search di shared root.
  9. Bulk operations.
  10. Storage pool capacity.
  11. Disconnect → permission revoked.
  12. Worker: integrity check, heartbeat, sync.
- Update `README.md` dengan arsitektur Shared Virtual Drive.

### Langkah-langkah

- [ ] **1. Distributed rate limiter**

Implementasi sesuai konsep Sesi 18 (tabel `rate_limits`, sliding window, ganti semua API routes).

- [ ] **2. Worker heartbeat**

Implementasi sesuai konsep Sesi 18 (tabel `worker_status`, heartbeat loop, API health, badge UI).

- [ ] **3. Audit keamanan**

Checklist:
- [ ] Semua API route dilindungi `withAuth`
- [ ] Semua query difilter `user.id`
- [ ] Tidak ada token di console/log
- [ ] Shared folder permission hanya untuk akun milik user
- [ ] Rate limit aktif pada semua mutation endpoints
- [ ] CSRF protection pada OAuth flow

- [ ] **4. Acceptance run-through Phase 4**

Jalankan seluruh acceptance criteria dari PRD.md §15:
- Verifikasi via curl dan/atau browser.
- Catat hasil per item.

- [ ] **5. Update README.md**

Tulis ulang README.md:
- Arsitektur Shared Virtual Drive.
- Setup guide.
- Environment variables.
- Docker Compose.
- Worker configuration.
- Acceptance status.

- [ ] **6. Pipeline + commit final**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: production hardening and phase 4 acceptance"
```

### Verifikasi

- [ ] Distributed rate limiter efektif (429 pada overuse dari 2 proses berbeda)
- [ ] Worker heartbeat aktif, badge UI berubah sesuai status
- [ ] Audit keamanan 100% lulus
- [ ] Seluruh 14 Acceptance Criteria Phase 4 terpenuhi
- [ ] README.md lengkap dan akurat
- [ ] Pipeline lulus: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

### Handoff

- [ ] Commit terakhir sesi 25
- [ ] Update baris **Sesi 25** di tracker: ✅, tanggal, catatan (Phase 4 Selesai 🎉)

---

## 8. Pemetaan Acceptance Criteria → Sesi

### MVP & Phase 2–3 (Sesi 1–16)

| # | Acceptance (PRD §14) | Sesi | Bukti verifikasi |
| --- | --- | --- | --- |
| 1 | Login ke aplikasi | 2 | curl sign-up/sign-in + guard `/dashboard` |
| 2 | Connect Google Account A | 3 | OAuth flow + baris `google_accounts` terenkripsi |
| 3 | Connect Google Account B | 3 | 2 baris, unik per `(user_id, google_account_id)` |
| 4 | Melihat quota keduanya | 4 | halaman Accounts + `storage_snapshots` |
| 5 | Melihat file Account A & B | 5 | kolom Account berbeda di Files |
| 6 | Upload file | 6 | `upload_jobs` completed + file ada di Drive |
| 7 | Memilih account tujuan | 6 (Mode A) / 10 (Mode B) | radio akun + mode automatic |
| 8 | Download file | 6 | unduh PDF & Google Doc |
| 9 | Delete file | 6 | hilang dari tabel & Drive |
| 10 | Disconnect account | 3 (+8 health) | row hilang + revoke token |
| — | Dashboard total/used/free | 7 | konsisten dengan Accounts |
| — | Search lintas akun | 5 + 7 | header search → Files |
| — | Create folder | 6 | folder muncul di Drive |
| — | Rate limit | 6 + 8 | 429 pada request ke-11 |
| — | Move, Rename, Copy file | 9 | dialog aksi baris + update di Drive web |
| — | Automatic account selection | 10 | mode auto upload ke akun terbesar |
| — | Activity log page + Statistik | 11 | halaman Activity & Charts storage/files |
| — | Background sync worker | 12 | loop worker sync quota & indexing file |
| — | Advanced search & preview | 13 | popover filter ukuran/tanggal + modal iframe preview |
| — | Multi-file concurrent upload queue | 14 | antrean klien, 2 upload simultan, drawer Google Drive style |
| — | Retry failed upload | 14 | tombol retry per-file/all failed mengulang upload tanpa re-pick |
| — | Drag & drop upload | 14 | dropzone interaktif pada modal dan overlay global di Files |
| — | Large file chunked resumable upload | 15 | upload file besar ter-chunk dengan resume offset (`Content-Range`) |
| — | Multi-select file table | 16 | checkbox per baris, select-all, shift-click range selection |
| — | Bulk delete & Bulk move | 16 | floating action bar, batch runner di server dengan activity log |
| — | ~~Storage balancing & migration (Phase 3)~~ | 17 | 🚫 Dibatalkan, dialihkan ke Sesi 24 (Shared Drive context) |
| — | ~~Distributed rate limiter (Phase 3)~~ | 18 | 🚫 Dibatalkan, dialihkan ke Sesi 25 |

### Phase 4 — Shared Virtual Drive (Sesi 19–25)

| # | Acceptance Criteria (PRD v2 §15) | Sesi | Bukti verifikasi |
| --- | --- | --- | --- |
| 1 | Setup Wizard: inisialisasi primary account & folder root | 19 | `POST /api/setup/init` membuat folder root di akun utama; tabel `shared_roots` terisi |
| 2 | Auto-share folder root ke seluruh akun pool | 19 | `shared_permissions` terisi; permission Editor aktif di Google Drive akun pool |
| 3 | Tampilan "My Drive" menampilkan isi folder root | 20 | `GET /api/files?folderId=` default ke root; tabel menampilkan file & subfolder level root |
| 4 | Navigasi folder interaktif & breadcrumb klikabel | 20 | Klik folder masuk subfolder; breadcrumb klikable untuk navigasi naik |
| 5 | Upload file ke folder aktif via akun terlapang | 21 | File ter-upload ke folder yang sedang dibuka; kuota uploader berkurang |
| 6 | Pembuatan folder selalu dimiliki oleh Akun Utama | 21 | Folder baru dibuat menggunakan token akun utama; permission diwariskan |
| 7 | Download & Delete file dengan token akun pemilik | 22 | Download/delete sukses; quota ter-refresh; baris terhapus dari shared view |
| 8 | Move, Rename, Copy dalam struktur shared folder | 22 | Aksi berhasil merefleksikan perubahan di Google Drive dan index cache |
| 9 | Search scoped ke shared root structure | 22 | Hasil pencarian hanya mencakup file yang berada di dalam folder root |
| 10 | UI revamp mirip Google Drive asli | 23 | Sidebar navigasi, toolbar New/Upload, storage pool bar, responsive view |
| 11 | Integritas folder root terjaga oleh worker | 24 | Worker auto-repair permission yang terputus; verifikasi status folder root |
| 12 | Storage balancing & migrasi antar-akun dalam folder | 24 | File dipindahkan kepemilikannya antar-akun tanpa mengubah lokasi folder |
| 13 | Distributed rate limiter PostgreSQL | 25 | Rate limit konsisten multi-proses; 429 saat batas terlampaui |
| 14 | Worker heartbeat monitoring & Phase 4 Acceptance | 25 | Status worker real-time; seluruh skenario 1–14 terverifikasi end-to-end |

---

## 9. Keputusan Teknis & Deviasi dari PRD

| # | Keputusan | Alasan |
| --- | --- | --- |
| 1 | Tabel auth = skema Better Auth (`user/session/account/verification`) alih-alih `users` PRD §8.3 | Better Auth mensyaratkan nama model bawaan; kolom `id,email,name,created_at,updated_at` tetap terpenuhi |
| 2 | `access_token` disimpan terenkripsi (di kolom `access_token` sesuai PRD) | PRD §9 menuntut access token dienkripsi/di-manage aman; format penyimpanan sama dengan refresh token (`v1.iv.ct.tag`) |
| 3 | Scope OAuth = `https://www.googleapis.com/auth/drive` (penuh) | PRD §5.5/§5.6 butuh delete/move/rename file yang sudah ada; `drive.file` hanya melihat file yang dibuat aplikasi ini |
| 4 | Tanpa Redis untuk MVP (PRD §8.1) | Rate limit in-memory + worker proses tunggal di VPS; sesuai catatan PRD agar arsitektur tidak terlalu kompleks |
| 5 | Tabel tambahan `drive_files` (index cache) | Dibutuhkan untuk Statistik (PRD §7) — Drive API tidak menyediakan jumlah total file; diisi oleh list/operasi file + background index Sesi 12 |
| 6 | Upload streaming langsung `req.body` → resumable session Google | Target VPS; menghindari buffer file besar di memori; sesuai PRD §6.2 (single-account, tanpa splitting) |
| 7 | Cross-account pagination = ambil maksimal 100 file/akun, sort/merge di server | MVP cukup; penggalian pagination penuh masuk backlog Phase 3 bila perlu |
| 8 | Endpoint tambahan di luar PRD §8.4: `POST /api/accounts/refresh`, `GET /api/accounts/[id]/storage`, `POST /api/files/[id]/copy`, `GET/POST /api/folders`, `GET /api/activity`, `GET /api/stats` | Dibutuhkan oleh aksi UI (Refresh, riwayat chart, statistik) tanpa mengubah endpoint yang sudah didefinisikan PRD |
| 9 | Proteksi route memakai guard server (`dashboard/layout.tsx`) + `withAuth` per API, bukan middleware | Hindari dependensi penamaan middleware antar versi Next.js; cakupan tetap menyeluruh |
| 10 | Pengujian: Vitest unit + verifikasi manual (tanpa E2E di MVP) | Dioptimalkan untuk kecepatan sesi; dicatat sebagai risiko; acceptance run-through Sesi 8 menjadi gerbang terakhir |
| 11 | Concurrency limit antrean upload dibatasi 2–3 paralel (Sesi 14) | Mencegah saturasi bandwidth jaringan user dan meminimalisir risiko rate limit 429 dari Google Drive API |
| 12 | Chunked upload menggunakan protokol native Resumable Google Drive (Sesi 15) | Mengikuti PRD §6.2 tanpa file splitting buatan di server, mendukung resume byte offset saat koneksi terputus |
| 13 | Concurrency worker pool (5 worker) untuk operasi bulk delete/move (Sesi 16) | Menyeimbangkan kecepatan eksekusi dengan keandalan Google API, menghindari flood HTTP request massal |
| 14 | Migrasi file lintas akun menggunakan piped in-flight stream (Sesi 17/24) | Mengalirkan ReadableStream download ke upload session Google Drive tanpa menyimpan file sementara di disk VPS |
| 15 | Distributed rate limit berbasis PostgreSQL sliding window (Sesi 18/25) | Memberikan konsistensi pembatasan request antar multiple instance Next.js tanpa mewajibkan dependensi Redis baru |
| 16 | Shared Virtual Drive: Folder root tunggal di My Drive Akun Utama di-share Editor ke seluruh akun pool (Sesi 19) | Menggunakan model sharing Google Drive native agar 100 akun dapat saling melihat dan berkontribusi file ke dalam satu pohon direktori terpadu |
| 17 | Quota file dibebankan ke uploader, bukan pemilik folder root (Sesi 21) | Perilaku native Google Drive API v3: saat akun pool mengunggah ke shared folder, kuota yang berkurang adalah milik uploader sehingga storage pool terdistribusi |
| 18 | Pembuatan seluruh folder diatur lewat Akun Utama (Sesi 21) | Menjamin konsistensi kepemilikan struktur direktori dan memastikan izin (permissions) terwariskan (inherited) secara otomatis ke seluruh subdirektori |
| 19 | UI File Browser menyembunyikan detail akun pemilik dari tampilan default (Sesi 20/23) | Memberikan pengalaman pengguna menyerupai Google Drive asli ("My Drive") yang mulus tanpa membingungkan user dengan akun mana yang menyimpan file |

**Risiko yang diketahui:**
- App Google OAuth berstatus Testing → refresh token kadaluarsa 7 hari (mitigasi: badge Reconnect + Sesi 3 catatan publish Production).
- Tanpa E2E otomatis → regresi UI bergantung pada checklist verifikasi manual tiap sesi.
- Perubahan izin folder root eksternal via Google Drive web → mitigasi: worker integrity check berkala (Sesi 24) untuk auto-repair permissions.
- Rate limit in-memory → ditingkatkan menjadi distributed rate limit berbasis DB di Sesi 25.
