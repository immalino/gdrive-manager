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
6. [Backlog Phase 3](#6-backlog-phase-3)
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
| 4 | GoogleDriveService (quota) + sinkronisasi quota + halaman Accounts | ⬜ | | |
| 5 | List/search file lintas akun + index cache `drive_files` + halaman Files | ⬜ | | |
| 6 | Upload (manual, single-account), download, delete, folder, rate limit | ⬜ | | |
| 7 | Dashboard storage + recent files/activity + global search | ⬜ | | |
| 8 | Error handling, health status, keamanan, responsive, acceptance MVP | ⬜ | | |
| 9 | Phase 2: Move, Rename, Copy file | ⬜ | | |
| 10 | Phase 2: Automatic account selection (Mode B) | ⬜ | | |
| 11 | Phase 2: Activity log page + Statistik storage/file | ⬜ | | |
| 12 | Phase 2: Background sync (worker) + account health monitoring | ⬜ | | |
| 13 | Phase 2: Advanced search + file preview | ⬜ | | |

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
```

Urutan eksekusi dianjurkan: 1→2→3→4→5→6→7→8→9→10→11→12→13.

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

- [ ] **1. Token manager**

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

- [ ] **2. GoogleDriveService + pemetaan error**

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

- [ ] **3. Sync quota**

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

- [ ] **4. Sinkron quota saat connect**

Di `src/app/api/google/callback/route.ts`, setelah upsert dan sebelum redirect:

```ts
try {
  const { syncQuota } = await import('@/lib/quota');
  await syncQuota(row!);
} catch (error) {
  console.warn('[callback] sync quota gagal', error instanceof Error ? error.message : error);
}
```

- [ ] **5. API storage + refresh + riwayat**

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

- [ ] **6. Halaman Accounts + AccountsTable**

Buat `src/components/accounts/accounts-table.tsx` (client):

- Fetch: `useQuery({ queryKey: ['storage'], queryFn: () => api.get<StorageResponse>('/api/storage'), refetchInterval: 60_000 })`.
- Ringkasan atas: **Total / Used / Free / Accounts** dari `totals` (formatBytes).
- Kolom tabel: **Account** (avatar + email), **Used**, **Free**, **Status** (Badge: Connected / Reconnect Required / Error — detail 3-status di Sesi 8), **Actions**.
- Actions: **Open Drive** (`https://drive.google.com/drive/my-drive`, tab baru), **Refresh** (`POST /api/accounts/refresh` → invalidasi `['storage']`), **Disconnect** (AlertDialog konfirmasi → `api.delete('/api/accounts/' + id)` → invalidasi).
- Header: `<AddAccountButton />` → `<a href="/api/google/connect">+ Add Account</a>`.
- States: `Skeleton` saat loading; empty state "Belum ada akun Google. Klik + Add Account."
- Baca `?connected=` (toast sukses) dan `?error=invalid_state` (alert) via `useSearchParams` (bungkus `<Suspense>` agar build tanpa warning).

`src/app/dashboard/accounts/page.tsx` → server component render `<AccountsTable />`.

- [ ] **7. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: drive service quota sync and accounts management page"
```

### Verifikasi

- [ ] Pipeline (`lint/typecheck/test/build`) lulus
- [ ] Connect akun baru → kembali ke `/dashboard/accounts` dengan toast, baris langsung menampilkan Used/Free (bukan 0)
- [ ] Klik **Refresh** → `select count(*) from storage_snapshots` bertambah
- [ ] ≥2 akun tampil dengan angka berbeda
- [ ] **Disconnect** → baris + snapshot terhapus
- [ ] `curl -s http://localhost:3000/api/storage -b /tmp/cookies.txt` → struktur `totals` + `accounts[]`
- [ ] Cross-check `usedBytes` dengan quota di web Google Drive (selisih wajar bila trash dihitung)

### Handoff

- [ ] Commit terakhir sesi 4
- [ ] Update baris **Sesi 4** di tracker: ✅, tanggal, catatan

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

- [ ] **1. Test query builder & klasifikasi MIME (merah)**

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

- [ ] **2. Schema `drive_files` + migrasi**

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

- [ ] **3. Klasifikasi + query builder + sort**

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

- [ ] **4. `listFiles` di service**

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

- [ ] **5. API `GET /api/files`**

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

- [ ] **6. Endpoint download (versi dasar)**

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

- [ ] **7. Halaman Files + FilesTable**

`src/components/files/files-table.tsx` (client):

- State filter: `search` (Input debounce 400 ms → URL `?search=`), `accountId` (Select dari `GET /api/storage`), `kind` (Select: All/Documents/Images/Videos/Archives/Others), `sort` (Name/Size/Updated + asc/desc).
- `useQuery({ queryKey: ['files', { search, accountId, kind, sort, dir }], queryFn: () => api.get<FilesResponse>(`/api/files?${params}`) })`.
- TanStack Table kolom: **Name** (icon per kind + nama), **Size** (`formatBytes`), **Account** (email), **Updated** (`formatDateTime`), **Actions**.
- Actions sesi ini: **Open in Drive** (`webViewLink` → tab baru; fallback `https://drive.google.com/open?id={id}`), **Download** (disabled → Sesi 6).
- Loading: skeleton baris. Empty: "Tidak ada file. Coba ubah filter atau hubungkan akun lain." Jika `failedAccounts` terisi → alert "Gagal memuat file dari: x@y.com".

`src/app/dashboard/files/page.tsx` → server component render `<FilesTable />`, baca `searchParams` awal (search/kind/accountId) agar link global search (Sesi 7) langsung terisi.

- [ ] **8. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: cross-account file listing, search, filters and files page"
```

### Verifikasi

- [ ] `pnpm test` → test query/mime PASS
- [ ] Halaman Files memuat file dari **≥2 akun** (kolom Account berbeda)
- [ ] Search kata yang ada di Drive → hanya nama cocok; search dengan karakter `'` tidak error
- [ ] Filter Account → hanya akun itu; Filter Kind = Images → hanya gambar
- [ ] Sort Updated asc/desc → urutan berubah
- [ ] **Open in Drive** membuka tab Google Drive yang benar
- [ ] `docker compose exec postgres psql -U gdrive -d gdrive_manager -c "select count(*), count(distinct google_account_id) from drive_files"` → terisi
- [ ] Simulasi 1 akun rusak (ubah `access_token` jadi `v1.tes`) → file akun lain tetap tampil + alert `failedAccounts`

### Handoff

- [ ] Commit terakhir sesi 5
- [ ] Update baris **Sesi 5** di tracker: ✅, tanggal, catatan (mis. "100 file per akun; tombol Download masih disabled sampai Sesi 6")

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

- [ ] **1. Test rate limit (merah)**

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

- [ ] **2. Rate limit + activity log**

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

- [ ] **3. Realisasi operasi file di service**

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

- [ ] **4. Upload API (streaming + rate limit + cek quota)**

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

- [ ] **5. Delete + folders API + finalisasi download**

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

- [ ] **6. UploadDialog (Mode A: manual)**

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

- [ ] **7. Aksi Delete & New Folder di UI; aktifkan Download**

Di `src/components/files/file-actions.tsx`:
- **Download** → aktifkan kembali (Sesi 5 dinonaktifkan): `<a href={/api/files/${id}/download?accountId=${accountId}} download>`.
- **Delete** → AlertDialog ("File dihapus permanen dari Google Drive akun ini") → `api.delete(...)` → invalidasi `['files']`, `['storage']`.
- **New Folder** (toolbar Files) → Dialog input nama + pilihan akun → `api.post('/api/folders', {...})`.

- [ ] **8. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: upload with progress, download, delete, folder create, rate limit"
```

### Verifikasi

- [ ] `pnpm test` → test rate limit PASS
- [ ] Upload file 20 MB ke akun berkuota cukup → progress sampai 100%, file muncul di tabel, snapshot terbaru `used_bytes` naik
- [ ] Upload lebih besar dari freeSpace target → ditolak `QUOTA_EXCEEDED`, tidak ada file masuk Drive
- [ ] `select status, count(*) from upload_jobs group by status` → `completed` bertambah
- [ ] `select action, count(*) from activity_logs group by action` → ada `file.upload`, `file.delete`, `folder.create`, `account.connect`, `account.disconnect`
- [ ] Download file `.pdf` **dan** file Google Doc (native) → keduanya menghasilkan file terunduh
- [ ] Delete file → hilang dari tabel dan dari Drive web
- [ ] 11 request upload cepat dalam 1 menit → ke-11 `429` + header `retry-after`
- [ ] `pnpm build` lulus (streaming `req.body` ke fetch tidak error)

### Handoff

- [ ] Commit terakhir sesi 6
- [ ] Update baris **Sesi 6** di tracker: ✅, tanggal, catatan (mis. "upload 1 file/request via resumable streaming; multi-file paralel ditunda ke Phase 3")

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

- [ ] **1. Endpoint recent files + activity**

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

- [ ] **2. Komponen dashboard**

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

- [ ] **3. Global search di header**

`src/components/layout/header.tsx` (client): ubah search jadi form:

```tsx
const [value, setValue] = useState(initialSearch);
function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  router.push(`/dashboard/files?search=${encodeURIComponent(value)}`);
}
```

`FilesTable` (Sesi 5): sinkronkan state search lokal dengan `useSearchParams()` (effek + debounce 400 ms) agar perubahan URL dari header langsung memicu query ulang.

- [ ] **4. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: storage dashboard, recent activity/files, global search"
```

### Verifikasi

- [ ] Dashboard menampilkan Total/Used/Free/Accounts **sama persis** dengan halaman Accounts
- [ ] Progress bar per akun sesuai proporsi; akun tanpa limit → total '—'
- [ ] Recent Files = 8 file terbaru lintas akun (berdasarkan `modifiedTime`)
- [ ] Recent Activity menampilkan aksi upload/delete/folder dari sesi 6
- [ ] Ketik kata di search header → Enter → pindah ke Files dengan hasil terfilter
- [ ] Layout tidak rusak di 375px (sidebar jadi Sheet/menu)

### Handoff

- [ ] Commit terakhir sesi 7
- [ ] Update baris **Sesi 7** di tracker: ✅, tanggal, catatan

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

- [ ] **1. Lengkapi pemetaan error Google**

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

- [ ] **2. Error boundary + konsistensi UI error**

- `src/app/dashboard/error.tsx` (client): tampilkan `error.message` + tombol **Coba lagi** (`reset()`), gaya alert.
- `src/app/error.tsx` untuk error tak terduga.
- Semua `useQuery` berisiko (files, storage, activity): bila `error instanceof ApiError` → `<Alert variant="destructive">` berisi kode + pesan; toast hanya untuk mutasi.

- [ ] **3. Account health badge + Reconnect**

Di `AccountsTable` (Sesi 4):
- Badge: `connected` → **Connected** (secondary), `reconnect_required` → **Reconnect Required** (amber/destructive), `error` → **Error** (destructive).
- Tombol **Reconnect** bila status ≠ `connected` → `<a href="/api/google/connect">` (upsert callback memperbarui token akun yang sama).
- Kolom tambahan: "Diperbarui {formatDateTime(updatedAt)}" dari `GET /api/storage` (tambahkan field `updatedAt` di response bila belum ada).

- [ ] **4. Rate limit semua route mutasi**

Terapkan di `POST /api/folders`, `DELETE /api/files/[id]`, `DELETE /api/accounts/[id]`, `POST /api/accounts/refresh`:

```ts
const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
if (!limit.ok) throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
```

(`POST /api/files/upload` tetap 10/menit sesuai PRD §9.)

- [ ] **5. Audit keamanan (checklist + bukti)**

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

- [ ] **6. Responsive + loading polish**

- Sidebar → Sheet (mobile) + hamburger di header; cek 375px.
- Semua tabel: skeleton (5 baris) + empty state + error alert.
- `pnpm build` tanpa warning `useSearchParams` tanpa `Suspense` (bungkus komponen search).

- [ ] **7. README.md**

Isi: deskripsi singkat, prasyarat (Node 20+, Docker, pnpm), setup step-by-step (`docker compose up -d`, `cp .env.example .env`, isi env, `pnpm install`, `pnpm db:migrate`, `pnpm dev`), cara membuat Google OAuth client (ringkas, rujuk Sesi 3), daftar script npm, struktur folder, catatan keamanan + hasil audit.

- [ ] **8. Acceptance run-through (PRD §14)**

Jalankan manual di browser, centang di README bagian **Acceptance MVP**:

```text
[ ] 1. Login ke aplikasi
[ ] 2. Connect Google Account A
[ ] 3. Connect Google Account B
[ ] 4. Melihat quota keduanya
[ ] 5. Melihat file Account A & B
[ ] 6. Upload file (pilih akun manual)
[ ] 7. Memilih account tujuan terlihat & benar
[ ] 8. Download file
[ ] 9. Delete file
[ ] 10. Disconnect account
[ ] Bonus: dashboard total/used/free; search lintas akun; create folder; rate limit aktif
```

- [ ] **9. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: error handling, account health, rate limits, security audit, mvp acceptance"
```

### Verifikasi

- [ ] Seluruh perintah audit (langkah 5) lulus
- [ ] Simulasi 1 akun rusak (ubah `access_token` jadi rusak) → file akun lain tetap tampil, akun rusak `Reconnect Required` + tombol Reconnect
- [ ] Simulasi refresh gagal (refresh token rusak) → status di DB berubah `reconnect_required`
- [ ] Upload ke-11 dalam 60 detik → 429 dengan pesan ramah
- [ ] `pnpm build` tanpa warning; layout OK di 375/768/1280px
- [ ] Checklist Acceptance MVP di README semua tercentang
- [ ] `git log --oneline | head -8` menunjukkan commit per sesi rapi

### Handoff

- [ ] Commit terakhir sesi 8 → **MVP selesai**
- [ ] Update baris **Sesi 8** di tracker: ✅, tanggal, catatan (status MVP + daftar kekurangan yang diketahui)
- [ ] Tambah entri **Log Sesi** bila ada keputusan lintas sesi baru

---

## 5. Phase 2 — Sesi 9–13

> Aturan sama: satu sesi = satu session opencode baru. Phase 2 dikerjakan hanya setelah Sesi 8 selesai.

---

## Sesi 9 — Move, Rename, Copy File

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 9 dari implementasi.md. Baca PRD.md §5.5 (Actions: Move/Rename/Copy) dan §12 Phase 2, lalu Global Constraints + Sesi 9. Kerjakan hanya Sesi 9, verifikasi lulus, commit, update tracker.`

**Goal:** File bisa di-rename, di-move antar folder (dalam 1 akun), dan di-copy; folder bisa di-rename/move/delete; semua tercatat di activity log.

**Prasyarat:** Sesi 8.

**Consumes:** `GoogleDriveService` (Sesi 4–6), `FilesTable` + `FileActions` (Sesi 5–6), `logActivity` (Sesi 6), `mapGoogleError` async (Sesi 8).

**Produces:**
- `service.renameFile/moveFile/copyFile/listFolders` + `buildMoveParams` (unit tested).
- `PATCH /api/files/[id]` (`{ name?, folderId?, fromFolderId? }`), `POST /api/files/[id]/copy`, `PATCH /api/folders/[id]`, `DELETE /api/folders/[id]`.
- UI: dialog Rename, Move (folder picker), Copy.

### Langkah-langkah

- [ ] **1. Test helper move (merah)**

Buat `src/lib/__tests__/move-params.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildMoveParams } from '@/lib/files/move-params';

describe('buildMoveParams', () => {
  it('root → folder', () => {
    expect(buildMoveParams(null, 'f1')).toEqual({ addParents: 'f1', removeParents: '' });
  });
  it('antar folder', () => {
    expect(buildMoveParams('f0', 'f1')).toEqual({ addParents: 'f1', removeParents: 'f0' });
  });
  it('tujuan null → ke root', () => {
    expect(buildMoveParams('f0', null)).toEqual({ addParents: '', removeParents: 'f0' });
  });
});
```

`pnpm test` → FAIL.

- [ ] **2. Helper + method service**

Buat `src/lib/files/move-params.ts`:

```ts
export function buildMoveParams(fromParentId: string | null, toParentId: string | null) {
  return {
    addParents: toParentId ?? '',
    removeParents: fromParentId ?? '',
  };
}
```

Tambahkan di `src/lib/google-drive/service.ts` (pakai `await mapGoogleError(...)` sesuai Sesi 8):

```ts
async renameFile(fileId: string, name: string): Promise<void> {
  const res = await this.request(`/files/${fileId}?fields=id,name`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw await mapGoogleError(res, this.account);
}

async moveFile(fileId: string, fromParentId: string | null, toParentId: string | null): Promise<void> {
  const { addParents, removeParents } = buildMoveParams(fromParentId, toParentId);
  const search = new URLSearchParams({ fields: 'id,parents' });
  if (addParents) search.set('addParents', addParents);
  if (removeParents) search.set('removeParents', removeParents);
  const res = await this.request(`/files/${fileId}?${search.toString()}`, { method: 'PATCH' });
  if (!res.ok) throw await mapGoogleError(res, this.account);
}

async copyFile(fileId: string, name: string, parentId?: string): Promise<DriveFileDto> {
  const res = await this.request(
    `/files/${fileId}/copy?fields=id,name,mimeType,size,modifiedTime,parents,webViewLink`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, ...(parentId ? { parents: [parentId] } : {}) }),
    },
  );
  if (!res.ok) throw await mapGoogleError(res, this.account);
  const body = (await res.json()) as {
    id: string; name: string; mimeType: string; size?: string;
    modifiedTime?: string; parents?: string[]; webViewLink?: string;
  };
  return {
    id: body.id,
    name: body.name,
    mimeType: body.mimeType,
    sizeBytes: body.size ? Number(body.size) : null,
    modifiedAt: body.modifiedTime ?? null,
    parentId: body.parents?.[0] ?? parentId ?? null,
    webViewLink: body.webViewLink ?? null,
    accountId: this.account.id,
    accountEmail: this.account.email,
  };
}

async listFolders(parentId?: string): Promise<Array<{ id: string; name: string }>> {
  const parentClause = parentId ? `'${parentId}' in parents` : `'root' in parents`;
  const q = `mimeType = 'application/vnd.google-apps.folder' and trashed = false and ${parentClause}`;
  const res = await this.request(`/files?pageSize=200&q=${encodeURIComponent(q)}&fields=files(id,name)`);
  const body = (await res.json()) as { files?: Array<{ id: string; name: string }> };
  return body.files ?? [];
}
```

- [ ] **3. API endpoints**

`src/app/api/files/[id]/route.ts` — tambahkan `PATCH`:

```ts
export const PATCH = withAuth<Ctx>(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  const body = (await req.json()) as { name?: string; folderId?: string | null; fromFolderId?: string | null };
  if (!accountId) throw new AppError('VALIDATION', 'accountId wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);

  if (body.name?.trim()) {
    await service.renameFile(id, body.name.trim());
    await logActivity({
      userId: user.id, googleAccountId: account.id, action: 'file.rename',
      fileId: id, metadata: { name: body.name.trim() },
    });
  }
  if (body.folderId !== undefined) {
    await service.moveFile(id, body.fromFolderId ?? null, body.folderId);
    await logActivity({
      userId: user.id, googleAccountId: account.id, action: 'file.move',
      fileId: id, metadata: { to: body.folderId },
    });
  }
  return ok({ updated: true });
});
```

`src/app/api/files/[id]/copy/route.ts`:

```ts
export const POST = withAuth<Ctx>(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  const { name, folderId } = (await req.json()) as { name?: string; folderId?: string };
  if (!accountId || !name?.trim()) throw new AppError('VALIDATION', 'accountId dan name wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  const copy = await service.copyFile(id, name.trim(), folderId);
  await logActivity({
    userId: user.id, googleAccountId: account.id, action: 'file.copy',
    fileId: copy.id, metadata: { sourceFileId: id, name: copy.name },
  });
  return ok({ file: copy }, 201);
});
```

`src/app/api/folders/[id]/route.ts` — `PATCH` (rename/move) dan `DELETE` (hapus folder **beserta isinya**; konfirmasi keras di UI):

```ts
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth<Ctx>(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  const body = (await req.json()) as { name?: string; folderId?: string | null; fromFolderId?: string | null };
  if (!accountId) throw new AppError('VALIDATION', 'accountId wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  if (body.name?.trim()) await service.renameFile(id, body.name.trim());
  if (body.folderId !== undefined) await service.moveFile(id, body.fromFolderId ?? null, body.folderId);
  await logActivity({
    userId: user.id, googleAccountId: account.id, action: body.name ? 'file.rename' : 'file.move',
    fileId: id, metadata: { target: 'folder' },
  });
  return ok({ updated: true });
});

export const DELETE = withAuth<Ctx>(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) throw new AppError('VALIDATION', 'accountId wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  await service.deleteFile(id);
  await logActivity({ userId: user.id, googleAccountId: account.id, action: 'file.delete', fileId: id, metadata: { target: 'folder' } });
  return ok({ deleted: true });
});
```

- [ ] **4. UI: Rename / Move / Copy**

Di `src/components/files/file-actions.tsx`:
- **Rename** → Dialog (Input prefilled nama) → `api.patch('/api/files/{id}?accountId=', { name })` → invalidasi `['files']`.
- **Move** → Dialog berisi folder picker: `useQuery(['folders', accountId], () => api.get('/api/folders?accountId=' + accountId))` — buat `GET /api/folders` (list via `service.listFolders()` per akun, hasil digabung + dimapping `accountId`), pilih folder (atau "Root") → `api.patch(..., { folderId, fromFolderId })`.
- **Copy** → Dialog (nama baru + pilihan folder tujuan) → `api.post('/api/files/{id}/copy?accountId=', {...})`.
- Aksi muncul juga di dropdown baris (DropdownMenu), bukan hanya ikon terpisah.
- Folder row (bila ditampilkan): Rename, Move, Delete (AlertDialog dengan peringatan "folder beserta isinya akan dihapus").

Buat `GET /api/folders`:

```ts
export const GET = withAuth(async (user, req) => {
  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) throw new AppError('VALIDATION', 'accountId wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  const folders = await service.listFolders();
  return ok({ folders: folders.map((f) => ({ ...f, accountId: account.id, accountEmail: account.email })) });
});
```

- [ ] **5. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: move, rename, copy file and folder operations"
```

### Verifikasi

- [ ] `pnpm test` → test `buildMoveParams` PASS
- [ ] Rename file → nama berubah di tabel dan di Drive web
- [ ] Move file ke folder lain (akun sama) → pindah; kembali ke Root → pindah
- [ ] Copy file → muncul 2 salinan, aslinya utuh
- [ ] Hapus folder kosong → hilang; folder berisi → konfirmasi keras muncul dulu
- [ ] `select action, count(*) from activity_logs group by action` → `file.rename`, `file.move`, `file.copy` bertambah
- [ ] Pipeline lulus

### Handoff

- [ ] Commit terakhir sesi 9
- [ ] Update baris **Sesi 9** di tracker: ✅, tanggal, catatan (mis. "copy lintas akun belum didukung — hanya dalam 1 akun")

---

## Sesi 10 — Automatic Account Selection (Mode B)

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 10 dari implementasi.md. Baca PRD.md §6.1 Mode B, §6.3 (Automatic Account Selection), §6.4 (Sync Quota), lalu Global Constraints + Sesi 10. Kerjakan hanya Sesi 10, verifikasi lulus, commit, update tracker.`

**Goal:** Upload bisa memilih akun otomatis berdasarkan sisa ruang terbesar yang muat file (sesuai algoritma PRD §6.3), dengan preview keputusan sebelum upload.

**Prasyarat:** Sesi 9 (minimal 2 akun, free space berbeda).

**Consumes:** `syncQuota` + `GET /api/storage`, `POST /api/files/upload` (Sesi 6), `UploadDialog` (Sesi 6).

**Produces:**
- `src/lib/upload/select-account.ts` `selectAccount(fileSize, accounts)` + unit test (contoh PRD §6.3).
- Upload API mendukung `?mode=auto`.
- UploadDialog: radio **Automatic / Specific account** + panel preview (kandidat ❌/✅).

### Langkah-langkah

- [ ] **1. Test algoritma (merah)**

Buat `src/lib/__tests__/select-account.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { selectAccount } from '@/lib/upload/select-account';

describe('selectAccount', () => {
  it('contoh PRD §6.3: file 5GB → Account B (12GB free)', () => {
    const accounts = [
      { id: 'A', freeBytes: 2 * 1024 ** 3 },
      { id: 'B', freeBytes: 12 * 1024 ** 3 },
      { id: 'C', freeBytes: 7 * 1024 ** 3 },
    ];
    expect(selectAccount(5 * 1024 ** 3, accounts)?.id).toBe('B');
  });

  it('tidak ada yang muat → null', () => {
    expect(selectAccount(100, [{ id: 'A', freeBytes: 10 }])).toBeNull();
  });

  it('freeBytes null dianggap tidak layak', () => {
    expect(selectAccount(1, [{ id: 'A', freeBytes: null as unknown as number }])).toBeNull();
  });

  it('dipilih yang free terbesar', () => {
    const result = selectAccount(1, [
      { id: 'A', freeBytes: 5 },
      { id: 'B', freeBytes: 9 },
      { id: 'C', freeBytes: 7 },
    ]);
    expect(result?.id).toBe('B');
  });
});
```

`pnpm test` → FAIL.

- [ ] **2. Implementasi algoritma**

Buat `src/lib/upload/select-account.ts`:

```ts
export interface AccountCandidate {
  id: string;
  email?: string;
  freeBytes: number | null;
}

export function selectAccount<T extends AccountCandidate>(fileSize: number, accounts: T[]): T | null {
  return (
    accounts
      .filter((a) => a.freeBytes != null && a.freeBytes >= fileSize)
      .sort((a, b) => (b.freeBytes ?? 0) - (a.freeBytes ?? 0))
      .at(0) ?? null
  );
}
```

`pnpm test` → PASS.

- [ ] **3. Upload API mendukung mode auto**

Di `src/app/api/files/upload/route.ts`, setelah rate limit dan sebelum cek quota, sisipkan resolusi akun:

```ts
const mode = sp.get('mode') ?? 'manual';
let resolvedAccountId = accountId;

if (mode === 'auto') {
  const accounts = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, user.id));
  const quotas = await Promise.all(
    accounts.map(async (a) => ({ id: a.id, email: a.email, quota: await syncQuota(a) })),
  );
  const picked = selectAccount(
    contentLength,
    quotas.map((q) => ({ id: q.id, email: q.email, freeBytes: q.quota.freeBytes })),
  );
  if (!picked) {
    throw new AppError('QUOTA_EXCEEDED', 'Tidak ada akun dengan ruang cukup untuk file ini.', 413);
  }
  resolvedAccountId = picked.id;
}
```

Lalu gunakan `resolvedAccountId` untuk `getAccountForUser` (dan buang cek quota manual kedua yang duplikat — syncQuota sudah dipanggil saat seleksi; untuk mode manual tetap sync + cek seperti Sesi 6).

- [ ] **4. UI UploadDialog Mode B**

Di `src/components/upload/upload-dialog.tsx`:
- RadioGroup **Upload destination**: `● Automatic` / `○ Specific account`.
- Mode Automatic: setelah file dipilih + data `['storage']` ada, hitung kandidat dengan `selectAccount(file.size, accounts)` dan render panel:

```text
File: video.zip (8.0 GB)

account1@gmail.com — Free: 1.2 GB   ❌
account2@gmail.com — Free: 10.3 GB  ✅
→ Upload ke account2@gmail.com
```

- Bila tidak ada yang muat → tombol upload disabled + pesan `QUOTA_EXCEEDED`.
- Kirim: `mode=auto` tanpa `accountId`, atau `mode=manual&accountId=...`.
- Setelah sukses, invalidasi `['storage']` (free space akun tujuan berubah).

- [ ] **5. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: automatic account selection for uploads (mode B)"
```

### Verifikasi

- [ ] `pnpm test` → 4 test `selectAccount` PASS (termasuk contoh PRD)
- [ ] Mode Automatic, file kecil → terpilih akun dengan free terbesar (cek logika preview UI == yang dipakai API)
- [ ] Mode Automatic, file lebih besar dari total free semua akun → ditolak dengan pesan jelas
- [ ] Upload selesai → free space akun tujuan berkurang di dashboard (snapshot terbaru)
- [ ] Mode Specific account tetap berfungsi seperti Sesi 6
- [ ] Pipeline lulus

### Handoff

- [ ] Commit terakhir sesi 10
- [ ] Update baris **Sesi 10** di tracker: ✅, tanggal, catatan

---

## Sesi 11 — Activity Log Page + Statistik

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 11 dari implementasi.md. Baca PRD.md §7 (Statistik) dan §3.2 (Secondary Goals: activity log, storage analytics), lalu Global Constraints + Sesi 11. Kerjakan hanya Sesi 11, verifikasi lulus, commit, update tracker.`

**Goal:** Halaman Activity menampilkan riwayat aksi (filter + pagination sederhana); halaman Statistik menampilkan Total/Used/Free, jumlah file per jenis (dari index `drive_files`), dan riwayat pemakaian storage dari `storage_snapshots`.

**Prasyarat:** Sesi 8 (Sesi 9/10 opsional tapi disarankan agar log rename/move ikut teruji).

**Consumes:** `GET /api/activity` (Sesi 7), tabel `activity_logs`, `drive_files` (Sesi 5), `storage_snapshots` (Sesi 1).

**Produces:**
- `GET /api/activity` (lengkap: filter action/account + pagination), `GET /api/stats`.
- Halaman `/dashboard/activity` (`ActivityTable`), halaman `/dashboard/stats` (`StatsCards` + chart) + menu sidebar **Stats**.
- `pnpm add recharts`.

### Langkah-langkah

- [ ] **1. Install recharts**

```bash
pnpm add recharts
```

- [ ] **2. API activity lengkap**

Perbarui `src/app/api/activity/route.ts` — tambahkan query param `action`, `accountId`, `page` (default 1), `pageSize` (default 20, max 100):

```ts
import { desc, eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { activityLogs, googleAccounts } from '@/db/schema';
import { ok, withAuth } from '@/lib/http';
import { getAccountForUser } from '@/lib/google/tokens';

export const GET = withAuth(async (user, req) => {
  const sp = req.nextUrl.searchParams;
  const action = sp.get('action');
  const accountId = sp.get('accountId');
  const page = Math.max(Number(sp.get('page') ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(sp.get('pageSize') ?? 20), 1), 100);

  const conditions = [eq(activityLogs.userId, user.id)];
  if (action) conditions.push(eq(activityLogs.action, action));
  if (accountId) {
    await getAccountForUser(user.id, accountId);
    conditions.push(eq(activityLogs.googleAccountId, accountId));
  }

  const where = and(...conditions);
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
    .where(where)
    .orderBy(desc(activityLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return ok({ activity: rows, page, pageSize });
});
```

- [ ] **3. API statistik**

Buat `src/app/api/stats/route.ts`:

```ts
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { activityLogs, driveFiles, googleAccounts, storageSnapshots } from '@/db/schema';
import { ok, withAuth } from '@/lib/http';
import { latestSnapshot } from '@/lib/quota';

export const GET = withAuth(async (user) => {
  const accounts = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, user.id));
  const accountIds = accounts.map((a) => a.id);

  const snapshots = await Promise.all(accountIds.map((id) => latestSnapshot(id)));
  const totalBytes = snapshots.reduce((sum, s) => sum + (s?.totalBytes ?? 0), 0);
  const usedBytes = snapshots.reduce((sum, s) => sum + (s?.usedBytes ?? 0), 0);
  const anyUnknownLimit = snapshots.some((s) => s?.totalBytes == null);

  const byKind = await db
    .select({
      kind: driveFiles.kind,
      count: sql<number>`count(*)::int`,
      totalSize: sql<number>`coalesce(sum(${driveFiles.sizeBytes}), 0)::bigint`,
    })
    .from(driveFiles)
    .where(sql`${driveFiles.googleAccountId} in ${accountIds}`)
    .groupBy(driveFiles.kind);

  const history = await db
    .select()
    .from(storageSnapshots)
    .where(sql`${storageSnapshots.googleAccountId} in ${accountIds}`)
    .orderBy(desc(storageSnapshots.createdAt))
    .limit(60);

  const recentActions = await db
    .select({ action: activityLogs.action, count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(eq(activityLogs.userId, user.id))
    .groupBy(activityLogs.action);

  return ok({
    totals: {
      totalBytes: anyUnknownLimit ? null : totalBytes,
      usedBytes,
      freeBytes: anyUnknownLimit ? null : Math.max(totalBytes - usedBytes, 0),
      accountCount: accounts.length,
    },
    fileKinds: byKind,
    snapshotHistory: history.reverse(),
    actionCounts: recentActions,
  });
});
```

> Jika Drizzle gagal mem-parsing `in ${array}`, tulis dengan `sql.join`/parameter binding eksplisit: `` sql`${driveFiles.googleAccountId} in (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})` `` — pastikan query jalan (uji lewat endpoint).

- [ ] **4. Halaman Activity**

Buat `src/components/activity/activity-table.tsx` (client):
- Filter: Select action (semua aksi dari `ActivityAction`), Select akun (dari `GET /api/storage`).
- Tabel: **Waktu** (`formatDateTime`), **Aksi** (Badge warna per aksi), **Akun**, **Detail** (nama file/`fileId` dari `metadata`), **File** (tautan `https://drive.google.com/open?id=` bila `fileId` ada).
- Pagination: tombol Prev/Next (state `page`), state loading skeleton, empty state "Belum ada aktivitas."
- Fetch `['activity', { action, accountId, page }]`.

`src/app/dashboard/activity/page.tsx` → render `<ActivityTable />`.

- [ ] **5. Halaman Statistik**

Buat `src/components/stats/stats-cards.tsx` + `stats-charts.tsx`:
- Ringkasan: Total / Used / Free / Accounts + **Total Files** (jumlah semua `fileKinds`).
- **File per jenis** (bar chart atau table): Documents, Images, Videos, Archives, Others, Folders (sesuai PRD §7) dengan count + total size.
- **Riwayat pemakaian** (recharts `AreaChart`): sumbu X `createdAt`, sumbu Y `usedBytes` (formatBytes via tick formatter) dari `snapshotHistory` (agregat per timestamp bila ada banyak akun — kelompokkan per `createdAt` bulan/hari: untuk MVP cukup garis total per snapshot terurut dengan fallback `snapshotAt`).
- **Action counts**: daftar aksi + jumlah.

`src/app/dashboard/stats/page.tsx` → render komponen di atas (fetch `['stats']`).

Tambahkan menu **Stats** (`/dashboard/stats`, ikon `BarChart3`) di `src/components/layout/sidebar.tsx` setelah Activity.

- [ ] **6. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: activity log page and storage/file statistics"
```

### Verifikasi

- [ ] Halaman Activity menampilkan aksi dari sesi sebelumnya (upload/delete/rename/move), filter action & akun berfungsi, pagination jalan
- [ ] `GET /api/activity?action=file.upload` hanya berisi `file.upload`
- [ ] Halaman Stats: Total/Used/Free **sama** dengan Dashboard; Total Files ≥ jumlah file yang pernah terlihat di Files
- [ ] Distribusi jenis file masuk akal (Images/Images sesuai isi Drive); chart riwayat tampil setelah ≥2 snapshot
- [ ] Query cross-user aman: user kedua (buat akun baru) tidak melihat activity/stats user pertama
- [ ] Pipeline lulus

### Handoff

- [ ] Commit terakhir sesi 11
- [ ] Update baris **Sesi 11** di tracker: ✅, tanggal, catatan (mis. "statistik bergantung pada kelengkapan index `drive_files`; background sync Sesi 12 memperbarui index")

---

## Sesi 12 — Background Sync (Worker) + Account Health Monitoring

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 12 dari implementasi.md. Baca PRD.md §10.2 (Account Health), §8.1 (Background Jobs — Redis tidak wajib), §12 Phase 2 (Background sync), lalu Global Constraints + Sesi 12. Kerjakan hanya Sesi 12, verifikasi lulus, commit, update tracker.`

**Goal:** Proses worker terpisah melakukan sync quota berkala, refresh index `drive_files`, dan health check semua akun semua user; status akun di UI selalu terkini tanpa aksi manual.

**Prasyarat:** Sesi 11.

**Consumes:** `syncQuota`, `GoogleDriveService`, tabel `google_accounts` + `drive_files`, badge health (Sesi 8).

**Produces:**
- `src/worker/index.ts` (interval loop, tanpa Redis — sesuai catatan PRD §8.1).
- Fungsi `indexAccountFiles(account)` (paging penuh, upsert `drive_files`).
- Health check → update `google_accounts.status`.
- Service Docker `worker` + dokumentasi di README.

### Langkah-langkah

- [ ] **1. Indexing helper**

Buat `src/lib/google-drive/indexer.ts`:

```ts
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { driveFiles, type GoogleAccount } from '@/db/schema';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { classifyMime } from '@/lib/files/mime';

const MAX_PAGES = 20;
const PAGE_SIZE = 100;

export async function indexAccountFiles(account: GoogleAccount): Promise<number> {
  const service = await GoogleDriveService.forAccount(account);
  let pageToken: string | undefined;
  let indexed = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await service.listFiles({
      q: 'trashed = false',
      pageSize: PAGE_SIZE,
      pageToken,
      orderBy: 'modifiedTime desc',
    });
    if (result.files.length === 0) break;

    await db
      .insert(driveFiles)
      .values(result.files.map((f) => ({
        googleAccountId: account.id,
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
          name: sql`excluded.name`, mimeType: sql`excluded.mime_type`,
          kind: sql`excluded.kind`, sizeBytes: sql`excluded.size_bytes`,
          modifiedAt: sql`excluded.modified_at`, parentId: sql`excluded.parent_id`,
          indexedAt: sql`excluded.indexed_at`,
        },
      });

    indexed += result.files.length;
    if (!result.nextPageToken) break;
    pageToken = result.nextPageToken;
  }

  return indexed;
}
```

(Impor `sql` dari `drizzle-orm`.)

- [ ] **2. Health check**

Buat `src/lib/google/health.ts`:

```ts
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts, type GoogleAccount } from '@/db/schema';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { AppError } from '@/lib/errors';

export type HealthStatus = 'connected' | 'reconnect_required' | 'error';

export async function checkAccountHealth(account: GoogleAccount): Promise<HealthStatus> {
  try {
    const service = await GoogleDriveService.forAccount(account);
    await service.getStorageQuota();
    return 'connected';
  } catch (error) {
    const status: HealthStatus =
      error instanceof AppError && error.code === 'ACCOUNT_DISCONNECTED' ? 'reconnect_required' : 'error';
    await db
      .update(googleAccounts)
      .set({ status, updatedAt: new Date() })
      .where(eq(googleAccounts.id, account.id));
    return status;
  }
}
```

- [ ] **3. Worker loop**

Buat `src/worker/index.ts`:

```ts
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts } from '@/db/schema';
import { syncQuota } from '@/lib/quota';
import { checkAccountHealth } from '@/lib/google/health';
import { indexAccountFiles } from '@/lib/google-drive/indexer';

const QUOTA_INTERVAL_MS = 10 * 60_000;
const HEALTH_INTERVAL_MS = 30 * 60_000;
const INDEX_INTERVAL_MS = 60 * 60_000;

async function safe(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    console.error(`[worker] ${label} gagal`, error instanceof Error ? error.message : error);
  }
}

async function syncAllQuota() {
  const accounts = await db.select().from(googleAccounts);
  for (const account of accounts) {
    await safe(`quota ${account.email}`, async () => { await syncQuota(account); });
  }
  console.log(`[worker] quota sync selesai untuk ${accounts.length} akun`);
}

async function healthAll() {
  const accounts = await db.select().from(googleAccounts);
  for (const account of accounts) {
    const status = await checkAccountHealth(account);
    if (status !== 'connected') console.warn(`[worker] ${account.email} → ${status}`);
  }
}

async function indexAll() {
  const accounts = await db.select().from(googleAccounts).where(eq(googleAccounts.status, 'connected'));
  for (const account of accounts) {
    await safe(`index ${account.email}`, async () => {
      const count = await indexAccountFiles(account);
      console.log(`[worker] ${account.email}: ${count} file terindeks`);
    });
  }
}

console.log('[worker] mulai — quota 10m, health 30m, index 60m');
await syncAllQuota();
await healthAll();
await indexAll();

setInterval(() => safe('quota loop', syncAllQuota), QUOTA_INTERVAL_MS);
setInterval(() => safe('health loop', healthAll), HEALTH_INTERVAL_MS);
setInterval(() => safe('index loop', indexAll), INDEX_INTERVAL_MS);
```

Catatan: top-level await butuh ESM/tsx (sudah dipakai via `pnpm worker`).

- [ ] **4. Docker service worker**

Tambahkan ke `docker-compose.yml`:

```yaml
  worker:
    image: node:22-alpine
    working_dir: /app
    command: sh -c "corepack enable && pnpm install --frozen-lockfile && pnpm worker"
    environment:
      DATABASE_URL: postgresql://gdrive:gdrive@postgres:5432/gdrive_manager
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL}
      APP_URL: ${APP_URL}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI}
      TOKEN_ENCRYPTION_KEY: ${TOKEN_ENCRYPTION_KEY}
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
```

(Di VPS produksi lebih baik jalankan worker via systemd/pm2 `pnpm worker`; catat di README.)

- [ ] **5. UI: status real-time**

- `AccountsTable`: `refetchInterval: 5 * 60_000` (bukan hanya manual), badge mengikuti `status` dari server (sudah ada).
- Dashboard `['storage']` refekInterval serupa.
- Tambahkan info kecil "Diperbarui otomatis tiap 10 menit" di header Accounts.

- [ ] **6. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: background worker for quota sync, health check and file indexing"
```

### Verifikasi

- [ ] `docker compose up -d worker` → log menampilkan `[worker] mulai` + hasil sync/index tanpa error
- [ ] `select max(created_at) from storage_snapshots` bertambah dalam 10 menit (atau panggil `syncAllQuota` manual via `pnpm worker` sekali lalu hentikan)
- [ ] Set refresh token 1 akun jadi rusak → dalam ≤30 menit statusnya `reconnect_required` (atau paksa dengan menjalankan health check manual)
- [ ] `select count(*) from drive_files` naik signifikan setelah index loop (≥ 100 file bila Drive punya lebih)
- [ ] Worker tidak meng-crash saat 1 akun gagal (log error, loop lanjut)
- [ ] Pipeline lulus

### Handoff

- [ ] Commit terakhir sesi 12
- [ ] Update baris **Sesi 12** di tracker: ✅, tanggal, catatan (interval, cara deploy worker di VPS)

---

## Sesi 13 — Advanced Search + File Preview

> **Prompt sesi baru:** `Kamu mengerjakan Sesi 13 dari implementasi.md. Baca PRD.md §5.7, §12 Phase 2 (Advanced search, File preview), lalu Global Constraints + Sesi 13. Kerjakan hanya Sesi 13, verifikasi lulus, commit, update tracker.`

**Goal:** Pencarian file lanjutan (rentang ukuran, tanggal, multi-akun, jenis) dan preview file langsung di aplikasi.

**Prasyarat:** Sesi 11 (idealnya 12, agar index terbaru).

**Consumes:** `buildDriveQuery` (Sesi 5), `GET /api/files`, `FilesTable`, tabel `drive_files`.

**Produces:**
- `buildDriveQuery` diperluas: `sizeMin/sizeMax` (byte), `modifiedAfter/modifiedBefore`, `accountId[]` multi.
- UI filter lanjutan (popover: tanggal + ukuran + multi-select akun).
- `PreviewDialog` (iframe Google Drive viewer + fallback).

### Langkah-langkah

- [ ] **1. Test query builder lanjutan (merah)**

Perbarui `src/lib/__tests__/query.test.ts`, tambahkan:

```ts
it('rentang ukuran dan tanggal', () => {
  const q = buildDriveQuery({
    sizeMin: 1024,
    sizeMax: 1048576,
    modifiedAfter: '2026-01-01T00:00:00Z',
    modifiedBefore: '2026-02-01T00:00:00Z',
  });
  expect(q).toContain('size > 1024');
  expect(q).toContain('size < 1048576');
  expect(q).toContain("modifiedTime > '2026-01-01T00:00:00.000Z'");
  expect(q).toContain("modifiedTime < '2026-02-01T00:00:00.000Z'");
});

it('sortir partikel tidak merusak query', () => {
  expect(buildDriveQuery({ search: "a' and name contains 'b" })).not.toContain("contains 'a' and name contains 'b'");
});
```

`pnpm test` → FAIL.

- [ ] **2. Perluas `DriveFileFilters` + `buildDriveQuery`**

```ts
export interface DriveFileFilters {
  search?: string;
  kind?: FileKind;
  sizeMin?: number;
  sizeMax?: number;
  modifiedAfter?: string;
  modifiedBefore?: string;
}

export function buildDriveQuery(filters: DriveFileFilters): string {
  const parts = ['trashed = false'];
  if (filters.search?.trim()) parts.push(`name contains '${escapeQuote(filters.search.trim())}'`);
  const kindSql = filters.kind ? KIND_SQL[filters.kind] : undefined;
  if (kindSql) parts.push(kindSql);
  if (filters.sizeMin != null) parts.push(`size > ${Math.floor(filters.sizeMin)}`);
  if (filters.sizeMax != null) parts.push(`size < ${Math.floor(filters.sizeMax)}`);
  if (filters.modifiedAfter) parts.push(`modifiedTime > '${new Date(filters.modifiedAfter).toISOString()}'`);
  if (filters.modifiedBefore) parts.push(`modifiedTime < '${new Date(filters.modifiedBefore).toISOString()}'`);
  return parts.join(' and ');
}
```

Panggilan di `GET /api/files` diperluas: baca `sizeMin`, `sizeMax`, `modifiedAfter`, `modifiedBefore` dari searchParams (parse angka dengan validasi; nilai tidak valid → `VALIDATION`).

Multi-akun: param `accountIds` (dipisah koma) — filter `targets` berdasarkan daftar, bukan hanya satu `accountId`.

- [ ] **3. UI filter lanjutan**

Di `src/components/files/files-filters.tsx`:
- Tombol **Filters** → Popover/Dropdown berisi:
  - **Dari sini / Sampai sini**: `<input type="date">` (konversi ke ISO sebelum kirim).
  - **Ukuran minimal/maksimal**: Input angka + Select satuan (MB/GB) → dikonversi ke byte.
  - **Akun**: multi-select checkbox (daftar dari `GET /api/storage`).
- Tombol **Reset**.
- Semua nilai masuk ke `queryKey` dan URL (`?sizeMin=&sizeMax=&modifiedAfter=&modifiedBefore=&accountIds=`).
- State loading/empty/error tetap seperti Sesi 5.

- [ ] **4. Preview dialog**

Buat `src/components/files/preview-dialog.tsx`:

```tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DriveFileDto } from '@/lib/google-drive/types';

interface Props {
  file: DriveFileDto | null;
  onOpenChange: (open: boolean) => void;
}

export function PreviewDialog({ file, onOpenChange }: Props) {
  const isGoogleNative = file?.mimeType.startsWith('application/vnd.google-apps.') ?? false;
  const previewUrl = file ? `https://drive.google.com/file/d/${file.id}/preview` : '';
  const openUrl = file ? `https://drive.google.com/open?id=${file.id}` : '';

  return (
    <Dialog open={!!file} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{file?.name}</DialogTitle>
        </DialogHeader>
        {file && (
          <div className="space-y-3">
            <iframe
              src={previewUrl}
              className="h-[60vh] w-full rounded-md border"
              title={`Preview ${file.name}`}
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{isGoogleNative ? 'Dokumen Google — pratinjau memerlukan login Google di browser.' : 'Pratinjau via Google Drive viewer.'}</span>
              <a href={openUrl} target="_blank" rel="noreferrer" className="underline">Buka di Drive</a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

Di `FilesTable`: tambahkan aksi **Preview** (ikon `Eye`) → set state `previewFile`; jadikan seluruh baris double-click untuk preview. Untuk tipe yang tidak didukung viewer (mis. `.zip`), tetap tampilkan iframe + fallback "Buka di Drive"/"Download".

- [ ] **5. Pipeline + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add -A && git commit -m "feat: advanced search filters and file preview"
```

### Verifikasi

- [ ] `pnpm test` → test query builder lanjutan PASS
- [ ] Filter tanggal (mis. 7 hari terakhir) → hanya file yang dimodifikasi dalam rentang
- [ ] Filter ukuran ≥ 100 MB → hanya file besar; kombinasi ukuran + jenis + search bekerja bersamaan
- [ ] Multi-akun terpilih → hasil hanya dari akun terpilih; hapus centang semua → kembali semua akun
- [ ] Preview gambar/PDF tampil di dialog; tombol "Buka di Drive" berfungsi; Google Doc → preview/ganti tab
- [ ] URL filter bisa di-copy-paste dan mempertahankan state (back/forward browser OK)
- [ ] Pipeline lulus

### Handoff

- [ ] Commit terakhir sesi 13
- [ ] Update baris **Sesi 13** di tracker: ✅, tanggal, catatan
- [ ] **Phase 2 selesai** — tambahkan entri di Log Sesi

---

## 6. Backlog Phase 3

Belum didetailkan menjadi sesi (PRD §12 Phase 3). Saat akan dikerjakan, buat sesi baru mengikuti format di dokumen ini dan tambahkan barisnya ke [Tracker](#1-tracker):

- Multi-file upload (paralel) + upload queue
- Retry failed upload (dari tabel `upload_jobs` status `failed`)
- Large file handling tambahan (resumable retry/chunk manual bila diperlukan)
- Drag & drop upload
- Bulk delete / bulk move
- Storage balancing lintas akun
- Penggantian in-memory rate limit → rate limit berbasis Redis/Postgres bila sudah multi-instance

---

## 7. Pemetaan Acceptance Criteria → Sesi

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

---

## 8. Keputusan Teknis & Deviasi dari PRD

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

**Risiko yang diketahui:**
- App Google OAuth berstatus Testing → refresh token kadaluarsa 7 hari (mitigasi: badge Reconnect + Sesi 3 catatan publish Production).
- Tanpa E2E otomatis → regresi UI bergantung pada checklist verifikasi manual tiap sesi.
- Rate limit in-memory → tidak efektif jika aplikasi dijalankan >1 proses (ditingkatkan di Phase 3/Redis).











