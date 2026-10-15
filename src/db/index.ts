import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Neon connection string.'
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

// Lazy singleton — only throws at runtime when the DB is actually accessed,
// not at build time.
let _db: ReturnType<typeof createDb> | null = null;

export function db() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export type Database = ReturnType<typeof createDb>;
