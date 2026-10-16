/**
 * Seed script — idempotent (safe to run multiple times).
 * Run with: pnpm db:seed
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

  console.log('🌱 Starting seed...');

  // 1. Insert initial grup (upsert by kode_unik)
  const kodeUnik = process.env.SEED_GRUP_KODE || 'badminton-grup-a';
  const grupNama = process.env.SEED_GRUP_NAMA || 'Badminton Grup A';
  let grupRow = await db.query.grup.findFirst({
    where: eq(schema.grup.kode_unik, kodeUnik),
  });

  if (!grupRow) {
    const inserted = await db
      .insert(schema.grup)
      .values({ nama: grupNama, kode_unik: kodeUnik })
      .returning();
    grupRow = inserted[0];
    console.log('✓ Grup created:', grupRow.id, `(${grupNama})`);
  } else {
    console.log('✓ Grup already exists:', grupRow.id);
  }

  const grupId = grupRow.id;

  // 2. Insert admin (upsert by email)
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminNama = process.env.SEED_ADMIN_NAMA || 'Admin Utama';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  let adminRow = await db.query.admin.findFirst({
    where: eq(schema.admin.email, adminEmail),
  });

  if (!adminRow) {
    const passwordHash = await hashPassword(adminPassword);
    const inserted = await db
      .insert(schema.admin)
      .values({
        grup_id: grupId,
        nama: adminNama,
        email: adminEmail,
        password_hash: passwordHash,
        aktif: true,
      })
      .returning();
    adminRow = inserted[0];
    console.log('✓ Admin created:', adminRow.id, `(${adminEmail})`);
  } else {
    console.log('✓ Admin already exists:', adminRow.id, `(${adminEmail})`);
  }

  // 3. Insert konfigurasi_grup (upsert by grup_id)
  const existingConfig = await db.query.konfigurasi_grup.findFirst({
    where: eq(schema.konfigurasi_grup.grup_id, grupId),
  });

  if (!existingConfig) {
    await db.insert(schema.konfigurasi_grup).values({
      grup_id: grupId,
      harga_bola_per_biji: 5000,
      isi_per_tabung: 12,
      biaya_lapangan_non_member: 10000,
      iuran_bulanan: 50000,
      kelipatan_pembulatan: 1000,
      hari_main: [2, 5], // Selasa=2, Jumat=5
      biaya_sewa_default: 100000,
      stok_awal: 0,
    });
    console.log('✓ Konfigurasi grup created');
  } else {
    console.log('✓ Konfigurasi grup already exists');
  }

  // 4. Insert 6 default kategori_kas (idempotent by nama+grup_id)
  const defaultKategori = [
    { nama: 'Tagihan Pertemuan', tipe: 'pemasukan' as const, adalah_sistem: true },
    { nama: 'Kelebihan Bayar', tipe: 'pemasukan' as const, adalah_sistem: true },
    { nama: 'Iuran', tipe: 'pemasukan' as const, adalah_sistem: true },
    { nama: 'Pembelian Bola', tipe: 'pengeluaran' as const, adalah_sistem: true },
    { nama: 'Sewa Lapangan', tipe: 'pengeluaran' as const, adalah_sistem: true },
    { nama: 'Sponsor', tipe: 'pemasukan' as const, adalah_sistem: false },
  ];

  for (const kat of defaultKategori) {
    const existing = await db.query.kategori_kas.findFirst({
      where: (t, { and, eq: eqFn }) =>
        and(eqFn(t.grup_id, grupId), eqFn(t.nama, kat.nama)),
    });

    if (!existing) {
      await db.insert(schema.kategori_kas).values({
        grup_id: grupId,
        nama: kat.nama,
        tipe: kat.tipe,
        adalah_sistem: kat.adalah_sistem,
        aktif: true,
      });
      console.log(`✓ Kategori kas created: ${kat.nama}`);
    } else {
      console.log(`✓ Kategori kas already exists: ${kat.nama}`);
    }
  }

  console.log('🎉 Seed complete!');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
