import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
} from 'drizzle-orm/pg-core';
import { grup } from './auth';

export const pemain = pgTable('pemain', {
  id: uuid('id').defaultRandom().primaryKey(),
  grup_id: uuid('grup_id')
    .notNull()
    .references(() => grup.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  no_hp: text('no_hp'),
  catatan: text('catatan'),
  bebas_biaya: boolean('bebas_biaya').notNull().default(false),
  aktif: boolean('aktif').notNull().default(true),
  dibuat_pada: timestamp('dibuat_pada', { withTimezone: true }).defaultNow().notNull(),
  diperbarui_pada: timestamp('diperbarui_pada', { withTimezone: true }).defaultNow().notNull(),
});
