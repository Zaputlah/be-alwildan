# Integration System — Server

Backend REST API untuk aplikasi **Integration System** sekolah.

## Teknologi

- Node.js
- Express 5
- TypeScript
- Prisma ORM
- PostgreSQL / Supabase
- Zod untuk validasi request
- Helmet, CORS, rate limit, cookie session, dan CSRF protection

## Menjalankan secara lokal

### Instalasi

```bash
npm install
npx prisma generate
```

### Environment variable

Buat file `.env` berdasarkan `.env.example`:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
CLIENT_ORIGIN="http://localhost:4200"
NODE_ENV="development"
PORT=3000
SCHOOL_TIMEZONE="Asia/Jakarta"
LATE_AFTER="07:15"
EARLY_CHECKOUT_BEFORE="17:00"
SESSION_TTL_HOURS=12
```

`DATABASE_URL` digunakan aplikasi saat runtime. `DIRECT_URL` digunakan Prisma untuk migration.

### Start development server

```bash
npm run dev
```

API tersedia di:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/v1/health
```

## Database dan Prisma

Generate Prisma Client:

```bash
npm run db:generate
```

Menjalankan migration pada database yang sudah memiliki baseline Prisma:

```bash
npm run db:deploy
```

Mengisi data contoh:

```bash
npm run db:seed
```

Jika database Supabase sudah berisi tabel tetapi belum memiliki tabel `_prisma_migrations`, lakukan baseline terlebih dahulu atau jalankan SQL migration secara manual melalui Supabase SQL Editor.

## Build dan test

```bash
npm run build
npm test
```

## Endpoint utama

Semua endpoint selain login membutuhkan session cookie.

```text
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
GET  /api/v1/health
```

Modul utama:

```text
/api/v1/students
/api/v1/reference-data
/api/v1/teacher-attendance
/api/v1/student-attendance
/api/v1/teacher-schedule
/api/v1/assessments
/api/v1/student-behavior
/api/v1/reports/student-scores
/api/v1/dashboard
```

## Role dan approval absensi

Role aplikasi:

- `TEACHER`: mengelola data sesuai penugasan.
- `ADMIN` dengan `adminScope=BRANCH`: Admin Cabang.
- `ADMIN` dengan `adminScope=CENTRAL`: Admin Pusat.

Alur izin guru:

```text
Guru mengajukan + bukti
  → PENDING_BRANCH
  → PENDING_CENTRAL
  → APPROVED
```

Penolakan pada salah satu tahap menghasilkan status `REJECTED` dan guru dapat mengajukan ulang.

Absensi hadir dan terlambat langsung tercatat. Check-out sebelum `EARLY_CHECKOUT_BEFORE` ditandai sebagai pulang cepat.

## Deployment Vercel

Dari folder server:

```bash
vercel --prod
```

Environment Production yang wajib tersedia:

```text
DATABASE_URL
DIRECT_URL
CLIENT_ORIGIN
NODE_ENV
SCHOOL_TIMEZONE
LATE_AFTER
EARLY_CHECKOUT_BEFORE
SESSION_TTL_HOURS
```

Endpoint production:

```text
https://be-alwildan.vercel.app/api/v1/health
```

Entrypoint serverless berada di `api/index.ts`. `src/server.ts` digunakan untuk menjalankan server lokal.

## Keamanan

- Password disimpan dalam bentuk hash.
- Session menggunakan cookie `httpOnly`.
- Request mutasi dilindungi CSRF token.
- Login dibatasi rate limit.
- Hak akses diverifikasi ulang di backend.
- Bukti sakit/izin/tugas dibatasi PDF, JPG, dan PNG maksimal 5 MB.
- Jangan commit `.env` atau membagikan password database.
