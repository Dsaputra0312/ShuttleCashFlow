/**
 * Demo Seed Script — Req §5 dataset.
 * Inserts the complete example dataset matching Req §5:
 * 6 players (Andi, Budi, Cici, Dedi, Eko, Fani), 3 sessions,
 * resulting in Andi=1000, Budi=1000, Cici=15000, Dedi=11000, Eko=0, Fani=12000.
 *
 * Idempotent: deletes any existing demo grup and re-inserts clean demo data.
 * Run with: pnpm db:seed:demo
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../features/auth/hash-password';
import * as schema from './schema';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  console.log('🌱 Starting demo seed (Req §5)...');

  const demoKodeUnik = 'badminton-demo-grup';

  // 1. Delete existing demo grup if present (cascades all related data)
  const existingGrup = await db.query.grup.findFirst({
    where: eq(schema.grup.kode_unik, demoKodeUnik),
  });

  if (existingGrup) {
    console.log('🗑️ Removing existing demo grup and related data...');
    await db.delete(schema.grup).where(eq(schema.grup.id, existingGrup.id));
  }

  // 2. Create demo grup
  const [demoGrup] = await db
    .insert(schema.grup)
    .values({
      nama: 'PB Shuttle Demo (Req §5)',
      kode_unik: demoKodeUnik,
    })
    .returning();

  const grupId = demoGrup.id;
  console.log('✓ Demo grup created:', grupId);

  // 3. Create demo admin
  const passwordHash = await hashPassword('demo123');
  const [adminRow] = await db
    .insert(schema.admin)
    .values({
      grup_id: grupId,
      nama: 'Admin Demo',
      email: 'demo@example.com',
      password_hash: passwordHash,
      aktif: true,
    })
    .returning();
  console.log('✓ Demo admin created (demo@example.com / demo123)');

  // 4. Create konfigurasi_grup matching Req §5
  const configValues = {
    grup_id: grupId,
    harga_bola_per_biji: 5000,
    isi_per_tabung: 12,
    biaya_lapangan_non_member: 10000,
    iuran_bulanan: 50000,
    kelipatan_pembulatan: 1000,
    hari_main: [2, 5], // Selasa & Jumat
    biaya_sewa_default: 100000,
    stok_awal: 10,
  };

  await db.insert(schema.konfigurasi_grup).values(configValues);
  console.log('✓ Konfigurasi grup created');

  // 5. Create default kategori_kas
  const defaultKategori = [
    { nama: 'Tagihan Pertemuan', tipe: 'pemasukan' as const, adalah_sistem: true },
    { nama: 'Kelebihan Bayar', tipe: 'pemasukan' as const, adalah_sistem: true },
    { nama: 'Iuran', tipe: 'pemasukan' as const, adalah_sistem: true },
    { nama: 'Pembelian Bola', tipe: 'pengeluaran' as const, adalah_sistem: true },
    { nama: 'Sewa Lapangan', tipe: 'pengeluaran' as const, adalah_sistem: true },
    { nama: 'Sponsor', tipe: 'pemasukan' as const, adalah_sistem: false },
  ];

  const kategoriMap = new Map<string, string>();
  for (const kat of defaultKategori) {
    const [inserted] = await db
      .insert(schema.kategori_kas)
      .values({
        grup_id: grupId,
        nama: kat.nama,
        tipe: kat.tipe,
        adalah_sistem: kat.adalah_sistem,
        aktif: true,
      })
      .returning();
    kategoriMap.set(kat.nama, inserted.id);
  }
  console.log('✓ Kategori kas created');

  // 6. Create 6 demo players
  const playerDefs = [
    { nama: 'Andi', bebas_biaya: false, is_member: true },
    { nama: 'Budi', bebas_biaya: false, is_member: true },
    { nama: 'Cici', bebas_biaya: false, is_member: false },
    { nama: 'Dedi', bebas_biaya: false, is_member: false },
    { nama: 'Eko', bebas_biaya: true, is_member: false },
    { nama: 'Fani', bebas_biaya: false, is_member: false },
  ];

  const pemainMap = new Map<string, string>();
  for (const p of playerDefs) {
    const [row] = await db
      .insert(schema.pemain)
      .values({
        grup_id: grupId,
        nama: p.nama,
        bebas_biaya: p.bebas_biaya,
        aktif: true,
      })
      .returning();
    pemainMap.set(p.nama, row.id);
  }
  console.log('✓ 6 demo players created (Andi, Budi, Cici, Dedi, Eko, Fani)');

  // 7. Create iuran for Member players (Andi & Budi)
  const andiId = pemainMap.get('Andi')!;
  const budiId = pemainMap.get('Budi')!;
  const ciciId = pemainMap.get('Cici')!;
  const dediId = pemainMap.get('Dedi')!;
  const ekoId = pemainMap.get('Eko')!;
  const faniId = pemainMap.get('Fani')!;

  const periodeTahun = 2024;
  const periodeBulan = 1;

  for (const [nama, pid] of [['Andi', andiId], ['Budi', budiId]] as const) {
    const [iuranRow] = await db
      .insert(schema.iuran)
      .values({
        grup_id: grupId,
        pemain_id: pid,
        periode_tahun: periodeTahun,
        periode_bulan: periodeBulan,
        nominal: 50000,
      })
      .returning();

    await db.insert(schema.transaksi_kas).values({
      grup_id: grupId,
      kategori_id: kategoriMap.get('Iuran'),
      nominal: 50000,
      tipe: 'pemasukan',
      keterangan: `Iuran Bulanan — ${nama} (${periodeBulan}/${periodeTahun})`,
      referensi_tipe: 'iuran',
      referensi_id: iuranRow.id,
      dapat_diubah: false,
      dibuat_oleh_admin_id: adminRow.id,
    });
  }
  console.log('✓ Iuran records and transactions created for members (Andi, Budi)');

  // 8. Create 1 pembelian bola transaction
  const [beliBolaRow] = await db
    .insert(schema.transaksi_kas)
    .values({
      grup_id: grupId,
      kategori_id: kategoriMap.get('Pembelian Bola'),
      nominal: 60000,
      tipe: 'pengeluaran',
      keterangan: 'Pembelian 1 tabung shuttlecock (12 biji)',
      referensi_tipe: 'pembelian_bola',
      dapat_diubah: false,
      dibuat_oleh_admin_id: adminRow.id,
    })
    .returning();

  await db.insert(schema.pembelian_bola).values({
    grup_id: grupId,
    jumlah_tabung: 1,
    isi_per_tabung: 12,
    harga_total: 60000,
    transaksi_kas_id: beliBolaRow.id,
  });
  console.log('✓ Pembelian bola recorded (1 tabung = 12 biji, Rp60.000)');

  // 9. Create Pertemuan (matching Req §5: 2024-01-09, locked)
  const [pertemuanRow] = await db
    .insert(schema.pertemuan)
    .values({
      grup_id: grupId,
      tanggal: '2024-01-09',
      konfigurasi_snapshot: configValues,
      terkunci: true,
    })
    .returning();

  const pertemuanId = pertemuanRow.id;
  console.log('✓ Pertemuan created (2024-01-09)');

  // 10. Create 3 Sesi
  // S1 (lap 1, 2 bola): Andi, Budi, Cici, Dedi
  const [sesi1] = await db
    .insert(schema.sesi)
    .values({
      pertemuan_id: pertemuanId,
      grup_id: grupId,
      lapangan: 1,
      bola_terpakai: 2,
      ditanggung_oleh_pemain_id: null,
    })
    .returning();

  for (const pid of [andiId, budiId, ciciId, dediId]) {
    await db.insert(schema.sesi_pemain).values({
      sesi_id: sesi1.id,
      pemain_id: pid,
      grup_id: grupId,
    });
  }

  // S2 (lap 1, 1 bola): Cici, Dedi, Eko, Fani
  const [sesi2] = await db
    .insert(schema.sesi)
    .values({
      pertemuan_id: pertemuanId,
      grup_id: grupId,
      lapangan: 1,
      bola_terpakai: 1,
      ditanggung_oleh_pemain_id: null,
    })
    .returning();

  for (const pid of [ciciId, dediId, ekoId, faniId]) {
    await db.insert(schema.sesi_pemain).values({
      sesi_id: sesi2.id,
      pemain_id: pid,
      grup_id: grupId,
    });
  }

  // S3 (lap 2, 1 bola): Andi, Cici, Fani (ditanggung: Andi)
  const [sesi3] = await db
    .insert(schema.sesi)
    .values({
      pertemuan_id: pertemuanId,
      grup_id: grupId,
      lapangan: 2,
      bola_terpakai: 1,
      ditanggung_oleh_pemain_id: andiId,
    })
    .returning();

  for (const pid of [andiId, ciciId, faniId]) {
    await db.insert(schema.sesi_pemain).values({
      sesi_id: sesi3.id,
      pemain_id: pid,
      grup_id: grupId,
    });
  }
  console.log('✓ 3 sesi created with session players');

  // 11. Create peserta_pertemuan and matching transaksi_kas for tagihan
  // Req §5 results:
  // Andi: 1000, Budi: 1000, Cici: 15000, Dedi: 11000, Eko: 0, Fani: 12000
  const billingResults = [
    { nama: 'Andi', pid: andiId, tagihan: 1000, dibayar: 1000, metode: 'Cash' },
    { nama: 'Budi', pid: budiId, tagihan: 1000, dibayar: 1000, metode: 'Cash' },
    { nama: 'Cici', pid: ciciId, tagihan: 15000, dibayar: 15000, metode: 'Cash' },
    { nama: 'Dedi', pid: dediId, tagihan: 11000, dibayar: 11000, metode: 'Transfer' },
    { nama: 'Eko', pid: ekoId, tagihan: 0, dibayar: 0, metode: null },
    { nama: 'Fani', pid: faniId, tagihan: 12000, dibayar: 12000, metode: 'Transfer' },
  ];

  for (const b of billingResults) {
    const [pesertaRow] = await db
      .insert(schema.peserta_pertemuan)
      .values({
        pertemuan_id: pertemuanId,
        pemain_id: b.pid,
        grup_id: grupId,
        status_main: 'lunas',
        tagihan: b.tagihan,
        dibayar: b.dibayar,
        metode_bayar: b.metode,
        selesai_pada: new Date('2024-01-09T22:00:00Z'),
      })
      .returning();

    if (b.dibayar > 0) {
      await db.insert(schema.transaksi_kas).values({
        grup_id: grupId,
        kategori_id: kategoriMap.get('Tagihan Pertemuan'),
        nominal: b.dibayar,
        tipe: 'pemasukan',
        keterangan: `Pembayaran Tagihan — ${b.nama} (Pertemuan 09/01/2024)`,
        referensi_tipe: 'peserta_pertemuan',
        referensi_id: pesertaRow.id,
        pertemuan_id: pertemuanId,
        dapat_diubah: false,
        dibuat_oleh_admin_id: adminRow.id,
      });
    }
  }
  console.log('✓ Peserta pertemuan & payment transactions created (Total Rp40.000)');

  // 12. Create Sewa Lapangan expense for the pertemuan
  await db.insert(schema.transaksi_kas).values({
    grup_id: grupId,
    kategori_id: kategoriMap.get('Sewa Lapangan'),
    nominal: 100000,
    tipe: 'pengeluaran',
    keterangan: 'Sewa Lapangan 1 & 2 — Pertemuan 09/01/2024',
    pertemuan_id: pertemuanId,
    dapat_diubah: false,
    dibuat_oleh_admin_id: adminRow.id,
  });
  console.log('✓ Sewa lapangan expense recorded (Rp100.000)');

  console.log('🎉 Demo seed complete! Login with demo@example.com / demo123');
}

main().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});
