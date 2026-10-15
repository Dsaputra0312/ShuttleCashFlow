import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  smallint,
  uuid,
  date,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { grup } from './auth';
import { pemain } from './master';

export const statusMainEnum = pgEnum('status_main', ['bermain', 'selesai', 'lunas']);

export const pertemuan = pgTable(
  'pertemuan',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    grup_id: uuid('grup_id')
      .notNull()
      .references(() => grup.id, { onDelete: 'cascade' }),
    tanggal: date('tanggal').notNull(),
    konfigurasi_snapshot: jsonb('konfigurasi_snapshot').notNull(),
    terkunci: boolean('terkunci').notNull().default(false),
    dibuat_pada: timestamp('dibuat_pada', { withTimezone: true }).defaultNow().notNull(),
    diperbarui_pada: timestamp('diperbarui_pada', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('pertemuan_grup_id_idx').on(table.grup_id),
    index('pertemuan_tanggal_idx').on(table.tanggal),
  ]
);

export const sesi = pgTable(
  'sesi',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pertemuan_id: uuid('pertemuan_id')
      .notNull()
      .references(() => pertemuan.id, { onDelete: 'cascade' }),
    grup_id: uuid('grup_id')
      .notNull()
      .references(() => grup.id, { onDelete: 'cascade' }),
    lapangan: smallint('lapangan').notNull(),
    bola_terpakai: smallint('bola_terpakai').notNull(),
    ditanggung_oleh_pemain_id: uuid('ditanggung_oleh_pemain_id').references(() => pemain.id, {
      onDelete: 'set null',
    }),
    dibuat_pada: timestamp('dibuat_pada', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('sesi_grup_id_idx').on(table.grup_id),
    index('sesi_pertemuan_id_idx').on(table.pertemuan_id),
  ]
);

export const sesi_pemain = pgTable(
  'sesi_pemain',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sesi_id: uuid('sesi_id')
      .notNull()
      .references(() => sesi.id, { onDelete: 'cascade' }),
    pemain_id: uuid('pemain_id')
      .notNull()
      .references(() => pemain.id, { onDelete: 'cascade' }),
    grup_id: uuid('grup_id')
      .notNull()
      .references(() => grup.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('sesi_pemain_grup_id_idx').on(table.grup_id),
    index('sesi_pemain_sesi_id_idx').on(table.sesi_id),
    index('sesi_pemain_pemain_id_idx').on(table.pemain_id),
  ]
);

export const peserta_pertemuan = pgTable(
  'peserta_pertemuan',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pertemuan_id: uuid('pertemuan_id')
      .notNull()
      .references(() => pertemuan.id, { onDelete: 'cascade' }),
    pemain_id: uuid('pemain_id')
      .notNull()
      .references(() => pemain.id, { onDelete: 'cascade' }),
    grup_id: uuid('grup_id')
      .notNull()
      .references(() => grup.id, { onDelete: 'cascade' }),
    status_main: statusMainEnum('status_main').notNull().default('bermain'),
    tagihan: integer('tagihan').notNull().default(0),
    dibayar: integer('dibayar').notNull().default(0),
    metode_bayar: text('metode_bayar'),
    selesai_pada: timestamp('selesai_pada', { withTimezone: true }),
  },
  (table) => [
    index('peserta_pertemuan_grup_id_idx').on(table.grup_id),
    index('peserta_pertemuan_pertemuan_id_idx').on(table.pertemuan_id),
    index('peserta_pertemuan_pemain_id_idx').on(table.pemain_id),
  ]
);
