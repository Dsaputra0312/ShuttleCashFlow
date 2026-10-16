import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  smallint,
  uuid,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { grup } from './auth';
import { admin } from './auth';
import { pemain } from './master';
import { kategori_kas } from './config';
import { pertemuan } from './game';

export const iuran = pgTable(
  'iuran',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    grup_id: uuid('grup_id')
      .notNull()
      .references(() => grup.id, { onDelete: 'cascade' }),
    pemain_id: uuid('pemain_id')
      .notNull()
      .references(() => pemain.id, { onDelete: 'cascade' }),
    periode_tahun: smallint('periode_tahun').notNull(),
    periode_bulan: smallint('periode_bulan').notNull(),
    nominal: integer('nominal').notNull(),
    dibuat_pada: timestamp('dibuat_pada', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('iuran_unique_per_periode').on(
      table.grup_id,
      table.pemain_id,
      table.periode_tahun,
      table.periode_bulan
    ),
    index('iuran_grup_id_idx').on(table.grup_id),
    index('iuran_pemain_id_idx').on(table.pemain_id),
    // FEAT-006 T5.5: compound index for grup + pemain lookups
    index('iuran_grup_pemain_idx').on(table.grup_id, table.pemain_id),
  ]
);

export const transaksi_kas = pgTable(
  'transaksi_kas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    grup_id: uuid('grup_id')
      .notNull()
      .references(() => grup.id, { onDelete: 'cascade' }),
    kategori_id: uuid('kategori_id').references(() => kategori_kas.id, { onDelete: 'set null' }),
    nominal: integer('nominal').notNull(),
    tipe: text('tipe', { enum: ['pemasukan', 'pengeluaran'] }).notNull(),
    keterangan: text('keterangan').notNull(),
    referensi_tipe: text('referensi_tipe'),
    referensi_id: text('referensi_id'),
    pertemuan_id: uuid('pertemuan_id').references(() => pertemuan.id, { onDelete: 'set null' }),
    dapat_diubah: boolean('dapat_diubah').notNull().default(true),
    dibuat_pada: timestamp('dibuat_pada', { withTimezone: true }).defaultNow().notNull(),
    dibuat_oleh_admin_id: uuid('dibuat_oleh_admin_id').references(() => admin.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    index('transaksi_kas_grup_id_idx').on(table.grup_id),
    index('transaksi_kas_pertemuan_id_idx').on(table.pertemuan_id),
    // FEAT-006 T5.5: compound index for grup + date filtering
    index('transaksi_kas_grup_dibuat_pada_idx').on(table.grup_id, table.dibuat_pada),
  ]
);

export const pembelian_bola = pgTable(
  'pembelian_bola',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    grup_id: uuid('grup_id')
      .notNull()
      .references(() => grup.id, { onDelete: 'cascade' }),
    jumlah_tabung: smallint('jumlah_tabung').notNull(),
    isi_per_tabung: smallint('isi_per_tabung').notNull(),
    harga_total: integer('harga_total').notNull(),
    transaksi_kas_id: uuid('transaksi_kas_id').references(() => transaksi_kas.id, {
      onDelete: 'set null',
    }),
    dibuat_pada: timestamp('dibuat_pada', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('pembelian_bola_grup_id_idx').on(table.grup_id)]
);

export const koreksi_stok = pgTable(
  'koreksi_stok',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    grup_id: uuid('grup_id')
      .notNull()
      .references(() => grup.id, { onDelete: 'cascade' }),
    jumlah: integer('jumlah').notNull(),
    alasan: text('alasan').notNull(),
    dibuat_oleh_admin_id: uuid('dibuat_oleh_admin_id').references(() => admin.id, {
      onDelete: 'set null',
    }),
    dibuat_pada: timestamp('dibuat_pada', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('koreksi_stok_grup_id_idx').on(table.grup_id)]
);
