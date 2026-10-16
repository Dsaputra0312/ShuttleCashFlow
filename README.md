# ShuttleCashFlow 🏸

Aplikasi web mobile-first untuk pencatatan dan pengelolaan keuangan kas serta penggunaan shuttlecock pada grup/komunitas badminton.

Dirancang untuk kemudahan operasional satu tangan di pinggir lapangan dengan tampilan mobile (optimal pada lebar 360px - 430px), sistem penagihan otomatis yang adil berdasarkan sesi bermain dan status keanggotaan (Member / Non-Member / Bebas Biaya), pemantauan saldo kas dan stok bola secara real-time, serta generator rekap tagihan siap kirim ke WhatsApp.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, TypeScript, Turbopack)
- **Database**: [Neon Postgres](https://neon.tech/) (Serverless Postgres)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) & `drizzle-kit`
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Solid colors, touch target min 44px, safe-area support)
- **Validation**: [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Deployment**: [Vercel](https://vercel.com/)
- **PWA**: Web App Manifest, Service Worker (Network-Only), Standalone Display

---

## 🚀 Local Setup

### 1. Prasyarat
- [Node.js](https://nodejs.org/) v18.17+ atau v20+
- [pnpm](https://pnpm.io/) (`npm i -g pnpm`)
- Akun database di [Neon](https://neon.tech/) (atau PostgreSQL lokal)

### 2. Kloning & Instalasi Dependensi
```bash
git clone <repository-url>
cd ShuttleCashFlow
pnpm install
```

### 3. Konfigurasi Environment Variables
Salin berkas `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```
Sesuaikan nilai variabel di `.env.local` dengan database Neon Anda:
```env
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_SECRET=rahasia-string-minimal-32-karakter-acak
NODE_ENV=development
```

### 4. Migrasi & Seed Database
Jalankan migrasi Drizzle untuk membuat tabel:
```bash
pnpm db:generate
pnpm db:migrate
```

Isi data awal bawaan:
```bash
# Seed standar (Grup A & Admin Utama)
pnpm db:seed

# ATAU Seed Demo lengkap sesuai skenario Req §5
pnpm db:seed:demo
```

### 5. Jalankan Server Development
```bash
pnpm dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## ⚙️ Environment Variables

| Variabel | Deskripsi | Wajib | Contoh |
| --- | --- | --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL Neon | Ya | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `NEXTAUTH_SECRET` | Kunci rahasia enkripsi JWT sesi login | Ya | `d7a8f9c1b2e34567890abcdef1234567` |
| `NODE_ENV` | Mode lingkungan aplikasi | Tidak | `development` / `production` |

---

## 🗄️ Database Migrations

Drizzle ORM digunakan untuk manajemen skema database:

- **Generate migrasi baru** dari perubahan skema di `src/db/schema/`:
  ```bash
  pnpm db:generate
  ```
- **Jalankan migrasi** ke database:
  ```bash
  pnpm db:migrate
  ```
- **Reset database (Dev/Test Only)**:
  Menghapus semua tabel dengan CASCADE dan menjalankan migrasi serta seed ulang:
  ```bash
  pnpm db:reset
  ```
  *(Catatan: Perintah ini diblokir secara otomatis jika `NODE_ENV=production`).*

---

## 👤 Akun Admin Pertama

Setelah menjalankan perintah seed, gunakan kredensial berikut untuk login:

### 1. Akun Seed Bawaan (`pnpm db:seed`)
- **Email**: `admin@example.com`
- **Password**: `admin123`

### 2. Akun Seed Demo (`pnpm db:seed:demo`)
- **Email**: `demo@example.com`
- **Password**: `demo123`
- *Berisi 6 pemain uji (Andi, Budi, Cici, Dedi, Eko, Fani), riwayat sesi, tagihan, iuran member, dan kas sesuai spesifikasi Req §5.*

Admin dapat menambah admin baru atau menonaktifkan admin lain melalui menu **Lainnya > Admin**.

---

## ☁️ Deploy ke Vercel

1. Hubungkan repository GitHub ke **Vercel**.
2. Masukkan Environment Variables di Vercel Dashboard (**Project Settings > Environment Variables**):
   - `DATABASE_URL` (dari Neon)
   - `NEXTAUTH_SECRET` (string acak minimal 32 karakter)
   - `NODE_ENV=production`
3. Konfigurasi build telah disiapkan di `vercel.json`:
   - Build Command: `pnpm build`
   - Install Command: `pnpm install`
   - Output Directory: `.next`
4. **Penting**: Jalankan migrasi database sekali saat pertama kali deploy:
   - Dapat dijalankan dari lokal dengan mengarahkan `DATABASE_URL` sementara ke database Neon produksi lalu menjalankan `pnpm db:migrate`, ATAU
   - Jalankan query SQL migrasi dari `src/db/migrations/` langsung di **Neon SQL Editor Console**.

---

## 📱 PWA (Progressive Web App)

Aplikasi telah dilengkapi konfigurasi PWA:
- **Manifest**: `public/manifest.json` (`display: standalone`, `theme_color: #2563eb`, ikon 192x192 & 512x512).
- **Service Worker**: `public/sw.js` dengan strategi **Network-Only** (memenuhi syarat instalasi PWA tanpa caching offline agar data kas & sesi selalu sinkron secara real-time).
- **Safe Area**: Penyesuaian safe area notch ponsel (`env(safe-area-inset-bottom)` dan utilitas `pb-safe`) pada navigasi bawah.

### Cara Instalasi di Android:
1. Buka URL aplikasi di Google Chrome Android.
2. Ketuk ikon menu titik tiga (⋮) di pojok kanan atas.
3. Pilih **"Instal aplikasi"** atau **"Tambahkan ke Layar Utama"** (*Add to Home screen*).
4. Aplikasi akan terpasang di beranda ponsel dan berjalan layaknya aplikasi native tanpa bilah URL browser.

---

## 📦 Pembuatan APK (T5.10 Manual Guide)

Untuk mendistribusikan ShuttleCashFlow sebagai berkas `.apk` mandiri bagi para admin:

### Metode 1: Menggunakan PWABuilder (Paling Praktis)
1. Buka [PWABuilder](https://www.pwabuilder.com/).
2. Masukkan URL produksi ShuttleCashFlow yang telah online di Vercel.
3. Verifikasi skor PWA (Manifest & Service Worker terdeteksi).
4. Klik **Package for Stores** lalu pilih **Android**.
5. Konfigurasi package name (mis. `com.shuttlecashflow.app`), upload icon/splash, dan unduh berkas APK & source code Android Studio.

### Metode 2: Menggunakan Google Bubblewrap CLI (TWA)
1. Pasang Bubblewrap:
   ```bash
   npm i -g @bubblewrap/cli
   ```
2. Inisialisasi project TWA:
   ```bash
   bubblewrap init --manifest=https://<your-vercel-domain>/manifest.json
   ```
3. Bangun paket APK:
   ```bash
   bubblewrap build
   ```
4. **PENTING Keystore Backup**: Simpan file keystore (`.jks` / `.keystore`) beserta kata sandinya di tempat penyimpanan aman di luar git repository. Keystore ini wajib digunakan jika Anda ingin memperbarui APK di masa depan.

---

## 🧪 Pengujian & Verifikasi

Jalankan test suite unit test (perhitungan tagihan, pembulatan, dan WhatsApp recap):
```bash
pnpm vitest run
```

Jalankan audit linting:
```bash
pnpm lint
```

Jalankan build verifikasi produksi:
```bash
pnpm build
```
