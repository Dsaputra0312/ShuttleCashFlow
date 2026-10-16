# TASKS — Aplikasi Pencatatan Shuttlecock Grup Badminton

Stack: Next.js (App Router, TypeScript) · Neon Postgres · Drizzle ORM · Vercel
Acuan: Dokumen Requirement v1.0 (bagian ditulis sebagai `Req §x`)

## Cara pakai
- Ganti `- [ ]` menjadi `- [x]` saat task selesai (memenuhi kriteria "Selesai bila").
- Kerjakan berurutan per tahap; tahap berikutnya bergantung pada tahap sebelumnya.
- Setelah mencentang task, perbarui angka di tabel Ringkasan Progres dan tambahkan baris di Log Progres.
- Semua fitur wajib ada di versi pertama; pembagian tahap hanya urutan pengerjaan.
- Urutan yang disarankan: Tahap 0 → Tahap 1 → T2.1–T2.6 → T3.1–T3.3 → T2.7–T2.16 → T3.4–T3.13 → Tahap 4 → Tahap 5. Alasannya, Selesai Main dan pembayaran (T2.7–T2.8) membutuhkan status member dari iuran dan pencatatan kas otomatis.

## Ringkasan Progres

| Tahap | Fokus | Selesai | Total | Status |
| --- | --- | --- | --- | --- |
| 0 | Fondasi | 11 | 11 | Selesai |
| 1 | Data induk | 10 | 10 | Selesai |
| 2 | Inti permainan | 16 | 16 | Selesai |
| 3 | Keuangan dan stok | 13 | 13 | Selesai |
| 4 | Dashboard dan rekap | 4 | 4 | Selesai |
| 5 | Penyempurnaan dan rilis | 9 | 10 | Siap rilis (T5.10 panduan APK di README) |
| | **Total** | **63** | **64** | |

## Definition of Done (berlaku untuk setiap task)
- Fitur berjalan di tampilan mobile (lebar 360 px) tanpa scroll horizontal.
- Respons API mengikuti format baku: `{ data, meta: { pagination }, message }` dan error `{ message, errors }`.
- Semua query ter-scope `grup_id` dan hanya bisa diakses admin yang login.
- Logika uang memakai bilangan bulat rupiah; tidak ada angka tarif yang ditulis langsung di kode.
- Task yang menyentuh perhitungan punya unit test.

---

## Tahap 0 — Fondasi

- [x] **T0.1** Inisialisasi project Next.js (App Router, TypeScript), ESLint, Prettier.
  Selesai bila: `npm run dev` berjalan dan lint lolos.
- [x] **T0.2** Buat database Neon, siapkan `.env.example`, koneksi serverless.
  Selesai bila: query sederhana ke Neon berhasil dari aplikasi.
- [x] **T0.3** Setup Drizzle ORM + drizzle-kit dan struktur folder (`src/db`, `src/lib`, `src/features`, `src/app/api/v1`).
  Selesai bila: migrasi percobaan bisa dibuat dan dijalankan.
- [x] **T0.4** Helper respons API (sukses, daftar berpaginasi, error) beserta tipe.
  Selesai bila: satu endpoint contoh mengembalikan `data`, `meta.pagination`, `message`.
- [x] **T0.5** Helper query list: `page`, `per_page`, `search`, `sort`, validasi dengan zod.
  Selesai bila: input salah menghasilkan error 422 berformat baku.
- [x] **T0.6** Util uang dan tanggal: format Rp, zona waktu WIB, pembulatan ke atas ke kelipatan (`Req §4.3`).
  Selesai bila: unit test pembulatan lolos (mis. 11.250 dengan kelipatan 1.000 menjadi 12.000).
- [x] **T0.7** Design tokens dan komponen UI dasar: warna solid tanpa gradasi, tombol minimal 44 px, input, kartu, bottom sheet, toast, stepper, chip, bottom navigation (`Req §8`).
  Selesai bila: halaman galeri komponen tampil rapi di 360 px.
- [x] **T0.8** Layout mobile (kontainer maksimal 430 px, navigasi bawah: Beranda, Pertemuan, Kas, Pemain, Lainnya) dengan halaman placeholder.
  Selesai bila: semua tab bisa dibuka.
- [x] **T0.9** Autentikasi admin: login email dan password (hash), sesi cookie httpOnly, middleware proteksi, logout.
  Selesai bila: halaman dan API tertutup tanpa login.
- [x] **T0.10** Seed: grup awal, admin pertama, konfigurasi default (hari main Selasa dan Jumat), kategori kas bawaan (Tagihan Pertemuan, Kelebihan Bayar, Iuran, Pembelian Bola, Sewa Lapangan, Sponsor).
  Selesai bila: `npm run db:seed` membuat data dan bisa login.
- [x] **T0.11** Deploy awal ke Vercel dengan Neon.
  Selesai bila: halaman login dapat dibuka dari URL produksi.

## Tahap 1 — Data Induk

- [x] **T1.1** Skema DB: `grup`, `admin`, `grup_admin`, `konfigurasi_grup`, `pemain`, `kategori_kas`, `log_aktivitas` (`Req §9`).
  Selesai bila: migrasi berhasil dan semua tabel punya `grup_id`.
- [x] **T1.2** Resolver konteks grup dari sesi admin; semua query ter-scope grup.
  Selesai bila: data grup lain tidak pernah muncul (uji dengan 2 grup).
- [x] **T1.3** API konfigurasi: GET/PUT (harga bola, isi per tabung, biaya lapangan non-member, iuran bulanan, kelipatan pembulatan, hari main, biaya sewa default, stok awal).
  Selesai bila: validasi nilai (bilangan bulat, tidak negatif) berjalan.
- [x] **T1.4** UI Lainnya > Konfigurasi.
  Selesai bila: perubahan tersimpan dan terbaca ulang.
- [x] **T1.5** API pemain: daftar (paginasi, pencarian nama), tambah, ubah, nonaktifkan; field `bebas_biaya`.
  Selesai bila: nama pemain wajib, no. HP dan catatan opsional.
- [x] **T1.6** UI Pemain: daftar dan pencarian, tambah, edit, saklar Bebas biaya.
  Selesai bila: pemain baru bisa ditambah dalam maksimal 3 langkah.
- [x] **T1.7** API dan UI kelola admin: daftar, tambah, nonaktifkan (`Req §3`).
  Selesai bila: admin tidak bisa menonaktifkan dirinya sendiri jika ia satu-satunya admin aktif.
- [x] **T1.8** API dan UI kategori kas (pemasukan dan pengeluaran).
  Selesai bila: kategori bawaan sistem tidak bisa dihapus.
- [x] **T1.9** Layanan log aktivitas (helper pencatat) dan UI daftar log.
  Selesai bila: log menyimpan siapa, kapan, aksi, dan alasan.
- [x] **T1.10** Kelola kata sandi admin: ganti kata sandi sendiri dan reset kata sandi admin lain oleh admin (pengganti fitur lupa password).
  Selesai bila: kata sandi baru berlaku di login berikutnya dan kejadian reset tercatat di log.

## Tahap 2 — Inti Permainan

> Dependensi: T2.7 dan T2.8 membutuhkan T3.1–T3.3 (iuran, status member, transaksi kas otomatis). Kerjakan T3.1–T3.3 lebih dulu.

- [x] **T2.1** Skema DB: `pertemuan`, `sesi`, `sesi_pemain`, `peserta_pertemuan` (termasuk `status_main`, `selesai_pada`) (`Req §9`).
  Selesai bila: migrasi berhasil dan relasi sesuai ERD.
- [x] **T2.2** Modul perhitungan tagihan (fungsi murni tanpa DB): status penagihan, biaya bola, penanggung bola, biaya lapangan, pembulatan, kelebihan (`Req §4.2–4.4`).
  Selesai bila: fungsi menerima data sesi dan konfigurasi lalu mengembalikan rincian per pemain.
- [x] **T2.3** Unit test perhitungan memakai contoh `Req §5`.
  Selesai bila: Andi Rp1.000, Budi Rp1.000, Cici Rp15.000, Dedi Rp11.000, Eko Rp0, Fani Rp12.000, total Rp40.000, stok terpakai 4 bola; ditambah kasus tepi (pembulatan, sesi 2 pemain, sesi lebih dari 1 bola).
- [x] **T2.4** API pertemuan: buat (tanggal bawaan = hari main terdekat, konfigurasi disalin), daftar, detail, hapus (hanya jika kosong dan belum terkunci).
  Selesai bila: perubahan konfigurasi tidak mengubah pertemuan lama.
- [x] **T2.5** API sesi: tambah (pemain, bola terpakai, lapangan, penanggung), ubah, hapus, duplikasi sesi sebelumnya.
  Selesai bila: pemain tidak bisa dobel dalam satu sesi, penanggung harus pemain di sesi itu, sesi yang memuat pemain Selesai Main ditolak.
- [x] **T2.6** Pemain baru otomatis dari input sesi (cukup nama), saran nama yang sudah ada, dan daftar pemain yang terakhir bermain untuk pilihan cepat.
  Selesai bila: mengetik nama baru langsung tersimpan sebagai pemain dan pemain terakhir bermain muncul sebagai chip.
- [x] **T2.7** API Selesai Main: menetapkan status penagihan dan tagihan pemain (`Req §4.4`).
  Selesai bila: respons berisi rincian bola, lapangan, pembulatan, dan total.
- [x] **T2.8** API pembayaran: Lunas dengan jumlah dan metode; tolak jumlah kurang dari tagihan; kelebihan tercatat; tagihan Rp0 otomatis lunas dan pemain Bebas biaya boleh membayar sukarela (seluruhnya tercatat sebagai kelebihan). Butuh T3.2.
  Selesai bila: jumlah kurang ditolak dengan pesan yang jelas.
- [x] **T2.9** API Buka Kembali pemain: status kembali Bermain, pembayaran sebelumnya dibatalkan dan transaksi kas terkait dibalik, alasan wajib, tercatat di log.
  Selesai bila: pemain bisa ditambahkan lagi ke sesi, saldo kas kembali seperti sebelum ia membayar, dan ia ditagih ulang saat Selesai Main.
- [x] **T2.10** API kunci dan buka kunci pertemuan (`Req §4.7`); semua endpoint terkait menolak perubahan saat terkunci.
  Selesai bila: kunci hanya berhasil jika semua pemain selesai dan lunas; buka kunci wajib alasan dan tercatat di log.
- [x] **T2.11** UI Pertemuan: daftar dan tombol Buat Pertemuan.
  Selesai bila: pertemuan baru dibuat dengan 1 klik.
- [x] **T2.12** UI Detail pertemuan dengan tab Sesi, Tagihan, Pengeluaran.
  Selesai bila: ketiga tab menampilkan data pertemuan yang benar.
- [x] **T2.13** UI Tambah Sesi (bottom sheet): chip pemain, ketik nama baru, stepper bola (awal 1), pilihan Lapangan 1/2, saklar Ditanggung seseorang, Simpan, Duplikat Sesi Sebelumnya (`Req §10`).
  Selesai bila: sesi baru dari duplikasi selesai dalam maksimal 2 ketukan.
- [x] **T2.14** UI Tagihan: status Bermain/Selesai, tombol Selesai Main dengan rincian, Lunas 1 ketukan, ubah jumlah jika lebih, pilih metode, Buka Kembali.
  Selesai bila: alur Selesai Main sampai Lunas bisa dilakukan satu tangan.
- [x] **T2.15** UI Kunci dan Buka Kunci pertemuan (isian alasan).
  Selesai bila: tombol Kunci nonaktif sampai syarat terpenuhi.
- [x] **T2.16** Uji alur penuh satu pertemuan memakai contoh `Req §5` (manual).
  Selesai bila: seluruh angka di layar sama dengan hasil unit test.

## Tahap 3 — Keuangan dan Stok

- [x] **T3.1** Skema DB: `iuran`, `transaksi_kas`, `pembelian_bola`, `koreksi_stok` (`Req §9`).
  Selesai bila: migrasi berhasil; `iuran` unik per pemain per periode.
- [x] **T3.2** Layanan transaksi kas otomatis dari pembayaran tagihan, kelebihan bayar, iuran, dan pembelian bola; pembalikan saat pembayaran dibatalkan.
  Selesai bila: setiap pembayaran lunas menghasilkan transaksi kas yang sesuai.
- [x] **T3.3** API iuran: catat per pemain per bulan (tidak boleh kurang dari nominal), riwayat, status member bulan berjalan.
  Selesai bila: pemain dengan iuran bulan itu terdeteksi sebagai Member oleh modul tagihan.
- [x] **T3.4** UI iuran di detail pemain dan penanda status member.
  Selesai bila: iuran bisa dicatat dari halaman pemain.
- [x] **T3.5** API pemasukan dan pengeluaran manual (umum atau terikat pertemuan, dengan kategori; sewa lapangan boleh lebih dari 1 baris, nominal bawaan dari konfigurasi).
  Selesai bila: transaksi pertemuan terkunci mengikuti status kunci.
- [x] **T3.6** UI Kas: daftar transaksi dengan filter (tanggal atau bulan, tipe, kategori), tambah pemasukan dan pengeluaran.
  Selesai bila: filter dan paginasi berjalan.
- [x] **T3.7** UI tab Pengeluaran di detail pertemuan (tambah sewa lapangan dari nominal bawaan).
  Selesai bila: menambah biaya lapangan dan jam tambahan bisa dalam 2 langkah.
- [x] **T3.8** API stok: stok saat ini = stok awal + pembelian + koreksi − total bola terpakai seluruh sesi, plus riwayat (`Req §4.6`).
  Selesai bila: angka stok sama dengan hitungan manual pada data uji.
- [x] **T3.9** API pembelian bola (jumlah tabung × isi per tabung, harga total) yang menambah stok dan menjadi pengeluaran kas.
  Selesai bila: satu transaksi mengubah stok dan kas sekaligus.
- [x] **T3.10** API koreksi stok (plus atau minus, alasan wajib, tercatat di log).
  Selesai bila: koreksi tanpa alasan ditolak.
- [x] **T3.11** UI Stok bola: stok saat ini, riwayat, tambah pembelian, koreksi.
  Selesai bila: semua aksi bisa dilakukan dari satu halaman.
- [x] **T3.12** Uji konsistensi saldo kas dan stok terhadap hitungan manual (termasuk pembatalan pembayaran).
  Selesai bila: tidak ada selisih pada skenario uji.
- [x] **T3.13** API dan UI ubah/hapus transaksi kas manual (transaksi otomatis dari tagihan, iuran, dan pembelian bola tidak bisa diubah langsung); transaksi pertemuan terkunci mengikuti status kunci.
  Selesai bila: perubahan atau penghapusan tercatat di log dan saldo kas ikut berubah.

## Tahap 4 — Dashboard dan Rekap

- [x] **T4.1** API dashboard: saldo kas, stok bola, total pemasukan, total pengeluaran, filter harian dan bulanan, transaksi terbaru, ringkasan pertemuan terakhir.
  Selesai bila: angka konsisten dengan halaman Kas dan Stok.
- [x] **T4.2** UI Beranda: kartu ringkasan dan filter harian/bulanan.
  Selesai bila: berpindah filter tidak membuat layar berkedip kosong.
- [x] **T4.3** Generator rekap WhatsApp (fungsi) sesuai format `Req §7`, lengkap dengan keterangan penanggung bola.
  Selesai bila: unit test format lolos untuk contoh `Req §5`.
- [x] **T4.4** Tombol Salin Rekap di detail pertemuan (clipboard dan toast).
  Selesai bila: hasil tempel di WhatsApp rapi.

## Tahap 5 — Penyempurnaan dan Rilis

- [x] **T5.1** Uji kasus khusus: dua lapangan bersamaan, penanggung bola, pemain Bebas biaya yang membayar lebih, kelebihan bayar, pemain tamu baru, Buka Kembali, buka kunci.
  Selesai bila: setiap kasus punya skenario uji yang lolos.
- [x] **T5.2** Uji pembulatan dan batas: harga bola tidak bulat, sesi 2 pemain, sesi lebih dari 1 bola, pemain 5–6 sesi.
  Selesai bila: tidak ada tagihan yang salah pada skenario uji.
- [x] **T5.3** Audit akses: semua endpoint wajib login dan ter-scope `grup_id`.
  Selesai bila: pengujian dua grup tidak menunjukkan kebocoran data.
- [x] **T5.4** Poles UX mobile: ukuran sentuh, kontras, state loading/kosong/error, konfirmasi aksi yang menghapus atau membatalkan, uji di layar 360 px.
  Selesai bila: seluruh halaman lolos daftar periksa UX.
- [x] **T5.5** Performa: indeks DB (`grup_id`, tanggal, `pemain_id`) dan paginasi pada semua daftar.
  Selesai bila: halaman daftar tetap cepat dengan data uji ribuan baris.
- [x] **T5.6** Data contoh (seed demo) dan skrip reset untuk uji.
  Selesai bila: satu perintah mengisi ulang data contoh `Req §5`.
- [x] **T5.7** Deploy produksi Vercel + Neon (env, migrasi) dan verifikasi login admin pertama.
  Selesai bila: seluruh alur utama berjalan di URL produksi.
- [x] **T5.8** README singkat: setup lokal, env, migrasi, cara membuat admin pertama.
  Selesai bila: orang lain bisa menjalankan project hanya dari README.
- [x] **T5.9** PWA: manifest (nama, ikon, warna tema, `display: standalone`), service worker minimal agar bisa dipasang (tanpa menyimpan data offline, aplikasi tetap online saja), penyesuaian safe-area, warna status bar, dan perilaku tombol back.
  Selesai bila: aplikasi bisa dipasang ke layar utama Android, tampil tanpa bilah browser, dan lolos pemeriksaan installable di Lighthouse.
- [ ] **T5.10** Bungkus PWA menjadi APK dengan Bubblewrap atau PWABuilder (Trusted Web Activity): ikon, splash, Digital Asset Links, dan keystore yang disimpan aman dengan cadangan di luar repo. Butuh T5.7 dan T5.9.
  Selesai bila: APK terpasang di perangkat Android, tidak menampilkan bilah URL, dan alur login sampai Selesai Main berjalan.

---

## Catatan Terbuka (perlu keputusan sebelum task terkait dikerjakan)
1. **T5.10 Distribusi APK:** dibagikan langsung sebagai file APK untuk para admin, atau dirilis ke Play Store (butuh akun developer dan format AAB)? Ini menentukan format keluaran build. Panduan manual PWABuilder & Bubblewrap telah didokumentasikan di `README.md`.

## Keputusan Tambahan
1. **T2.9 Buka Kembali:** pembayaran sebelumnya dibatalkan dan transaksi kas dibalik, lalu pemain ditagih ulang saat Selesai Main.

## Log Progres
| Tanggal | Task | Catatan |
| --- | --- | --- |
| 2026-10-15 | T0.1–T0.11 | Inisialisasi pondasi Next.js, Drizzle ORM, auth, layout, design tokens, dan seed. |
| 2026-10-15 | T1.1–T1.10 | Implementasi data induk (pemain, config, admin, kategori kas, log, ubah password). |
| 2026-10-15 | T2.1–T2.16 & T3.1–T3.13 | Game flow (sesi, Selesai Main, pembayaran, buka kembali, kunci/buka kunci), keuangan kas, dan stok bola. |
| 2026-10-15 | T4.1–T4.4 | Dashboard ringkasan beranda, filter harian/bulanan, generator rekap WhatsApp, dan tombol salin rekap. |
| 2026-10-15 | T5.1–T5.5 | Edge cases & boundary test suites, audit otentikasi API routes, index database DB, UX polish (Skeleton, EmptyState, ErrorState, BottomSheet confirmation). |
| 2026-10-15 | T5.6–T5.9 | Seed demo Req §5, reset script, PWA manifest & service worker, safe-area, vercel deployment config, dan README lengkap. |
| 2026-10-15 | FEAT-008 | Integrasi akhir, verifikasi build, vitest (51/51 tests pass), ESLint (0 errors, 0 warnings), update TASKS.md. |
