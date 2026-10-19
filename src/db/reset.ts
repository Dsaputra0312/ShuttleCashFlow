/**
 * Database Reset Script — Development & Test only.
 * Drops all tables using CASCADE, then re-runs migrations and seed.
 *
 * Guarded against running in production.
 * Run with: pnpm db:reset
 */
import 'dotenv/config';
import { execSync } from 'child_process';
import { neon } from '@neondatabase/serverless';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Reset is forbidden in production environment (NODE_ENV=production)!');
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(url);

  console.log('🗑️ Dropping schema public & drizzle (CASCADE)...');

  await sql`DROP SCHEMA IF EXISTS public CASCADE;`;
  await sql`CREATE SCHEMA public;`;
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE;`;

  console.log('✓ Database schema reset complete');

  console.log('🔄 Running migrations...');
  execSync('pnpm db:migrate', { stdio: 'inherit' });

  console.log('🌱 Running seed...');
  execSync('pnpm db:seed', { stdio: 'inherit' });

  console.log('🎉 Reset and seed completed successfully!');
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
