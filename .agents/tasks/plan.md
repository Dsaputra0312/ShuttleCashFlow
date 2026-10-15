# Implementation Plan — ShuttleCashFlow

## 1. Status Workspace Saat Ini

**Project belum diinisialisasi.** Workspace hanya berisi `TASKS.md` dan direktori `.agents/tasks/` yang kosong. Tidak ada `package.json`, tidak ada kode. Seluruh proyek dibangun dari nol.

Tools yang tersedia:
- `pnpm` v9.1.0 (digunakan untuk semua perintah)
- Node.js v26.5.0
- `npm` v11.17.0 (tidak digunakan, pnpm diutamakan)

---

## 2. Urutan Task dengan Dependensi

Urutan yang ditetapkan TASKS.md: **T0 → T1 → T2.1–T2.6 → T3.1–T3.3 → T2.7–T2.16 → T3.4–T3.13 → T4 → T5**

Diimplementasikan sebagai 8 FEAT yang berurutan:

| FEAT | Tahap | Task | Dependensi |
|------|-------|------|------------|
| FEAT-001 | Tahap 0 | T0.1–T0.11 | — (greenfield) |
| FEAT-002 | Tahap 1 | T1.1–T1.10 | FEAT-001 (auth, DB, schema) |
| FEAT-003 | Tahap 2+3 (awal) | T2.1–T2.6, T3.1–T3.3 | FEAT-002 (master data, grup context) |
| FEAT-004 | Tahap 2+3 (lanjut) | T2.7–T2.16, T3.4–T3.13 | FEAT-003 (billing engine, iuran, auto-kas) |
| FEAT-005 | Tahap 4 | T4.1–T4.4 | FEAT-004 (semua data kas dan game) |
| FEAT-006 | Tahap 5 (kualitas) | T5.1–T5.5 | FEAT-005 (semua fitur stabil) |
| FEAT-007 | Tahap 5 (rilis) | T5.6–T5.9 | FEAT-006 (kualitas selesai) |
| FEAT-008 | Integrasi final | T5.10 (config only) | FEAT-007 (semua FEAT selesai) |

---

## 3. File Kunci per FEAT

### FEAT-001 — Fondasi (T0)
```
package.json, next.config.ts, tailwind.config.ts, tsconfig.json
drizzle.config.ts, vitest.config.ts
.env.example, vercel.json
src/db/index.ts, src/db/schema/auth.ts, src/db/schema/config.ts
src/db/seed.ts
src/lib/money.ts, src/lib/money.test.ts
src/lib/date.ts
src/lib/api-response.ts
src/lib/query-helpers.ts
src/features/auth/hash-password.ts, create-session.ts, verify-session.ts
src/middleware.ts
src/app/login/page.tsx
src/app/api/v1/auth/login/route.ts, logout/route.ts
src/app/api/v1/health/route.ts
src/app/(protected)/layout.tsx
src/components/layout/BottomNav.tsx
src/components/ui/ (Button, Input, Card, BottomSheet, Toast, Stepper, Chip, Badge)
src/app/(protected)/ placeholder pages (5 tabs)
src/app/gallery/page.tsx
```

### FEAT-002 — Data Induk (T1)
```
src/db/schema/master.ts (tabel pemain)
src/features/auth/get-grup-context.ts
src/features/activity-log/log-activity.ts
src/app/api/v1/konfigurasi/route.ts
src/app/api/v1/pemain/route.ts, [id]/route.ts
src/app/api/v1/admin/route.ts, [id]/route.ts, [id]/reset-password/route.ts
src/app/api/v1/auth/change-password/route.ts
src/app/api/v1/kategori-kas/route.ts, [id]/route.ts
src/app/api/v1/log/route.ts
src/app/(protected)/pemain/page.tsx
src/app/(protected)/lainnya/ (konfigurasi, admin, kategori-kas, log, ubah-kata-sandi)
src/components/pemain/PemainForm.tsx
```

### FEAT-003 — Game Core + Finance Schema (T2.1–T2.6, T3.1–T3.3)
```
src/db/schema/game.ts (pertemuan, sesi, sesi_pemain, peserta_pertemuan)
src/db/schema/finance.ts (iuran, transaksi_kas, pembelian_bola, koreksi_stok)
src/features/billing/types.ts
src/features/billing/calculator.ts  ← logika murni
src/features/billing/calculator.test.ts  ← uji Req §5 + edge cases
src/app/api/v1/pertemuan/route.ts, [id]/route.ts
src/app/api/v1/pertemuan/[id]/sesi/route.ts, [sesiId]/route.ts
src/app/api/v1/pertemuan/[id]/sesi/[sesiId]/duplicate/route.ts
src/app/api/v1/pertemuan/[id]/pemain/quick-add/route.ts
src/app/api/v1/pertemuan/[id]/pemain/last-played/route.ts
src/app/api/v1/iuran/route.ts
src/app/api/v1/iuran/status/route.ts
src/features/kas/auto-transactions.ts
```

### FEAT-004 — Game Flow + Finance UI (T2.7–T2.16, T3.4–T3.13)
```
src/app/api/v1/pertemuan/[id]/peserta/[pesertaId]/selesai-main/route.ts
src/app/api/v1/pertemuan/[id]/peserta/[pesertaId]/bayar/route.ts
src/app/api/v1/pertemuan/[id]/peserta/[pesertaId]/buka-kembali/route.ts
src/app/api/v1/pertemuan/[id]/kunci/route.ts, buka-kunci/route.ts
src/app/api/v1/kas/route.ts, [id]/route.ts
src/app/api/v1/pemain/[id]/iuran/route.ts
src/app/api/v1/stok/route.ts, beli/route.ts, koreksi/route.ts
src/app/(protected)/pertemuan/page.tsx, [id]/page.tsx
src/app/(protected)/pertemuan/[id]/tabs/ (SesiTab, TagihanTab, PengeluaranTab)
src/components/pertemuan/TambahSesiSheet.tsx
src/app/(protected)/kas/page.tsx
src/app/(protected)/pemain/[id]/page.tsx
src/app/(protected)/lainnya/stok/page.tsx
```

### FEAT-005 — Dashboard + Rekap (T4)
```
src/app/api/v1/dashboard/route.ts
src/app/api/v1/pertemuan/[id]/rekap/route.ts
src/app/(protected)/page.tsx (Beranda final)
src/features/whatsapp/recap-generator.ts  ← fungsi murni
src/features/whatsapp/recap-generator.test.ts
```

### FEAT-006 — Kualitas + Akses Audit (T5.1–T5.5)
```
src/features/billing/calculator.test.ts (tambahan edge cases)
src/features/billing/calculator-boundary.test.ts
src/components/ui/Skeleton.tsx, EmptyState.tsx, ErrorState.tsx
src/db/schema/ (index migrations)
Audit semua src/app/api/v1/ routes
```

### FEAT-007 — Demo Seed + README + PWA (T5.6–T5.9)
```
src/db/seed-demo.ts
src/db/reset.ts
public/manifest.json
public/icons/ (192x192, 512x512 PNG)
public/sw.js
src/components/ServiceWorkerRegistrar.tsx
src/app/layout.tsx (meta PWA)
README.md
vercel.json (verifikasi)
```

### FEAT-008 — Final Integration (T5.8+)
```
Tidak ada file baru — hanya perbaikan cross-FEAT
TASKS.md (update semua checkbox)
```

---

## 4. Potensi Hambatan dan Risiko

| Risiko | Mitigasi |
|--------|----------|
| `DATABASE_URL` belum ada — build gagal | Gunakan pola `SKIP_ENV_VALIDATION` atau guard `process.env.DATABASE_URL ?? ''` agar `pnpm build` bisa berjalan tanpa DB nyata |
| T2.7 (Selesai Main) dan T2.8 (Bayar) harus menunggu T3.1–T3.3 | Urutan FEAT sudah memastikan ini: FEAT-003 membangun T3.1–T3.3 sebelum FEAT-004 membangun T2.7–T2.8 |
| Billing calculator sangat kompleks — salah logika | Buat pure function terlebih dahulu, tulis unit test dengan contoh Req §5 sebelum membangun API; test harus lolos 100% |
| Logika uang: jangan gunakan float | Semua kalkulasi menggunakan integer rupiah; `roundUpToMultiple` menggunakan `Math.ceil` dengan integer arithmetic |
| Node.js v26 — kemungkinan incompatibility | Next.js 15 mendukung Node ≥18; v26 seharusnya OK tapi perlu diverifikasi saat `pnpm create next-app` |
| T5.10 (APK/TWA) memerlukan tooling eksternal | Didokumentasikan di README; tidak diautomasi dalam workflow ini (per instruksi "jangan coba menjalankan deploy sebenarnya") |

---

## 5. Keputusan Teknis Penting

1. **Package manager: pnpm** — tersedia di sistem, digunakan untuk semua perintah.

2. **Auth: JWT in httpOnly cookie** — menggunakan `jose` library (tidak menggunakan NextAuth karena aplikasi ini single-grup sederhana dan membutuhkan kontrol penuh atas sesi). Session payload berisi `adminId` dan `grupId`.

3. **Billing engine: pure function terpisah dari DB** — `calculator.ts` menerima data sebagai argumen, tidak melakukan query DB. Ini memungkinkan unit test tanpa mock DB dan memudahkan debugging.

4. **Money: integer rupiah** — tidak ada float, tidak ada `Decimal.js`. Semua jumlah disimpan sebagai `integer` di Postgres dan dimanipulasi sebagai `number` (integer) di TypeScript. `roundUpToMultiple` menggunakan `Math.ceil(amount / multiple) * multiple`.

5. **API versioning: /api/v1/** — semua endpoint di bawah `/api/v1/` untuk memungkinkan iterasi ke depan.

6. **Konfigurasi snapshot** — saat pertemuan dibuat, seluruh `konfigurasi_grup` disalin ke `konfigurasi_snapshot` (jsonb). Ini memastikan perubahan konfigurasi tidak mempengaruhi perhitungan pertemuan lama.

7. **Transaksi kas otomatis: `dapat_diubah=false`** — kas yang dibuat dari pembayaran tagihan, iuran, dan pembelian bola tidak bisa diedit langsung. Hanya kas manual yang `dapat_diubah=true`.

8. **Stok: computed, bukan stored** — stok saat ini dihitung saat query: `stok_awal + SUM(pembelian) + SUM(koreksi) - SUM(bola_terpakai)`. Tidak ada field stok_current yang perlu diupdate. Ini menghindari race conditions.

9. **PWA: network-only service worker** — tidak ada caching offline. Service worker minimal hanya untuk memenuhi installable requirement. Aplikasi tetap membutuhkan koneksi internet.

10. **T5.10 (APK)**: Pertanyaan terbuka soal Play Store vs direct APK distribution diabaikan untuk sekarang — README mendokumentasikan kedua opsi. Keputusan ada di tangan developer/admin grup.

---

## 6. Struktur Direktori Target

```
ShuttleCashFlow/
├── src/
│   ├── app/
│   │   ├── (protected)/          # Auth-gated pages
│   │   │   ├── layout.tsx        # Mobile container + BottomNav
│   │   │   ├── page.tsx          # Beranda (Dashboard)
│   │   │   ├── pertemuan/        # Game management
│   │   │   ├── kas/              # Cash transactions
│   │   │   ├── pemain/           # Player management
│   │   │   └── lainnya/          # Settings menu
│   │   ├── api/v1/               # REST API routes
│   │   ├── login/                # Public login page
│   │   └── gallery/              # Component gallery (dev)
│   ├── components/
│   │   ├── ui/                   # Base design system
│   │   ├── layout/               # BottomNav etc.
│   │   ├── pemain/               # Player components
│   │   └── pertemuan/            # Game components
│   ├── db/
│   │   ├── schema/               # Drizzle table definitions
│   │   ├── migrations/           # Generated by drizzle-kit
│   │   ├── index.ts              # DB client
│   │   ├── seed.ts               # Initial seed
│   │   ├── seed-demo.ts          # Req §5 demo data
│   │   └── reset.ts              # Dev reset
│   ├── features/
│   │   ├── auth/                 # Session helpers
│   │   ├── billing/              # Pure calculation engine
│   │   ├── kas/                  # Auto-transaction service
│   │   ├── activity-log/         # Log helper
│   │   └── whatsapp/             # Recap generator
│   └── lib/
│       ├── money.ts + .test.ts
│       ├── date.ts
│       ├── api-response.ts
│       └── query-helpers.ts
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── TASKS.md
├── .env.example
├── vercel.json
├── drizzle.config.ts
├── vitest.config.ts
└── README.md
```

---

*Rencana ini diimplementasikan via FEAT-001 hingga FEAT-008 yang tersimpan di `.agents/tasks/task-shuttlecashflow/features/`.*
