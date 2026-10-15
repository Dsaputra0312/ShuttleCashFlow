import {
  pgTable,
  text,
  timestamp,
  boolean,
  primaryKey,
  uuid,
} from 'drizzle-orm/pg-core';

export const grup = pgTable('grup', {
  id: uuid('id').defaultRandom().primaryKey(),
  nama: text('nama').notNull(),
  kode_unik: text('kode_unik').notNull().unique(),
  dibuat_pada: timestamp('dibuat_pada', { withTimezone: true }).defaultNow().notNull(),
});

export const admin = pgTable('admin', {
  id: uuid('id').defaultRandom().primaryKey(),
  grup_id: uuid('grup_id')
    .notNull()
    .references(() => grup.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  email: text('email').notNull(),
  password_hash: text('password_hash').notNull(),
  aktif: boolean('aktif').default(true).notNull(),
  dibuat_pada: timestamp('dibuat_pada', { withTimezone: true }).defaultNow().notNull(),
});

export const grup_admin = pgTable(
  'grup_admin',
  {
    grup_id: uuid('grup_id')
      .notNull()
      .references(() => grup.id, { onDelete: 'cascade' }),
    admin_id: uuid('admin_id')
      .notNull()
      .references(() => admin.id, { onDelete: 'cascade' }),
    peran: text('peran').notNull().default('member'),
  },
  (table) => [primaryKey({ columns: [table.grup_id, table.admin_id] })]
);

export const sesi_admin = pgTable('sesi_admin', {
  id: uuid('id').defaultRandom().primaryKey(),
  admin_id: uuid('admin_id')
    .notNull()
    .references(() => admin.id, { onDelete: 'cascade' }),
  grup_id: uuid('grup_id')
    .notNull()
    .references(() => grup.id, { onDelete: 'cascade' }),
  dibuat_pada: timestamp('dibuat_pada', { withTimezone: true }).defaultNow().notNull(),
  kedaluwarsa_pada: timestamp('kedaluwarsa_pada', { withTimezone: true }).notNull(),
});
