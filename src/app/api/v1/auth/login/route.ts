import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { admin } from '@/db/schema';
import { comparePassword } from '@/features/auth/hash-password';
import { createSession } from '@/features/auth/create-session';
import { successResponse, errorResponse } from '@/lib/api-response';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
  grup_id: z.string().uuid('grup_id tidak valid').optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body tidak valid', undefined, 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  const { email, password, grup_id } = parsed.data;

  try {
    const dbClient = db();
    const conditions = grup_id
      ? and(eq(admin.email, email), eq(admin.grup_id, grup_id), eq(admin.aktif, true))
      : and(eq(admin.email, email), eq(admin.aktif, true));

    const results = await dbClient
      .select()
      .from(admin)
      .where(conditions)
      .limit(1);

    const found = results[0];
    if (!found) {
      return errorResponse('Email atau password salah', undefined, 401);
    }

    const valid = await comparePassword(password, found.password_hash);
    if (!valid) {
      return errorResponse('Email atau password salah', undefined, 401);
    }

    await createSession({
      adminId: found.id,
      grupId: found.grup_id,
      email: found.email,
      nama: found.nama,
    });

    return successResponse(
      { adminId: found.id, email: found.email, nama: found.nama },
      'Login berhasil'
    );
  } catch (err) {
    console.error('[login]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
