import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { grup, admin } from './auth';

export const tipeKasEnum = pgEnum('tipe_kas', ['pemasukan', 'pengeluaran']);

export const konfigurasi_grup = pgTable('konfigurasi_grup', {
  grup_id: uuid('grup_id')
    .primaryKey()
    .references(() => grup.id, { onDelete: 'cascade' }),
  harga_bola_per_biji: integer('harga_bola_per_biji').notNull().default(5000),
  isi_per_tabung: integer('isi_per_tabung').notNull().default(12),
  biaya_lapangan_non_member: integer('biaya_lapangan_non_member').notNull().default(10000),
  iuran_bulanan: integer('iuran_bulanan').notNull().default(50000),
  kelipatan_pembulatan: integer('kelipatan_pembulatan').notNull().default(1000),
  hari_main: jsonb('hari_main').$type<number[]>().notNull().default([2, 5]),
  biaya_sewa_default: integer('biaya_sewa_default').notNull().default(100000),
  stok_awal: integer('stok_awal').notNull().default(0),
  diperbarui_pada: timestamp('diperbarui_pada', { withTimezone: true }).defaultNow().notNull(),
});

export const kategori_kas = pgTable('kategori_kas', {
  id: uuid('id').defaultRandom().primaryKey(),
  grup_id: uuid('grup_id')
    .notNull()
    .references(() => grup.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  tipe: tipeKasEnum('tipe').notNull(),
  adalah_sistem: boolean('adalah_sistem').notNull().default(false),
  aktif: boolean('aktif').notNull().default(true),
});

export const log_aktivitas = pgTable('log_aktivitas', {
  id: uuid('id').defaultRandom().primaryKey(),
  grup_id: uuid('grup_id')
    .notNull()
    .references(() => grup.id, { onDelete: 'cascade' }),
  admin_id: uuid('admin_id').references(() => admin.id, { onDelete: 'set null' }),
  aksi: text('aksi').notNull(),
  entitas: text('entitas').notNull(),
  entitas_id: text('entitas_id'),
  detail: jsonb('detail'),
  alasan: text('alasan'),
  dibuat_pada: timestamp('dibuat_pada', { withTimezone: true }).defaultNow().notNull(),
});
