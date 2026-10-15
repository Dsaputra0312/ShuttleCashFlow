import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, count, asc } from 'drizzle-orm';
import { db } from '@/db';
import { admin } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { hashPassword } from '@/features/auth/hash-password';
import { parseListQuery } from '@/lib/query-helpers';
import { successResponse, paginatedResponse, errorResponse } from '@/lib/api-response';

const createAdminSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const parsed = parseListQuery(request.nextUrl.searchParams);
  if (!parsed.ok) return parsed.response;

  const { page, per_page } = parsed.query;
  const offset = (page - 1) * per_page;

  try {
    const dbClient = db();
    const condition = eq(admin.grup_id, ctx.grupId);

    const [totalRows, rows] = await Promise.all([
      dbClient.select({ count: count() }).from(admin).where(condition),
      dbClient
        .select({
          id: admin.id,
          nama: admin.nama,
          email: admin.email,
          aktif: admin.aktif,
          dibuat_pada: admin.dibuat_pada,
          grup_id: admin.grup_id,
        })
        .from(admin)
        .where(condition)
        .orderBy(asc(admin.dibuat_pada))
        .limit(per_page)
        .offset(offset),
    ]);

    const total = totalRows[0]?.count ?? 0;

    return paginatedResponse(rows, {
      page,
      per_page,
      total,
      total_pages: Math.ceil(total / per_page),
    });
  } catch (err) {
    console.error('[GET /admin]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body tidak valid', undefined, 400);
  }

  const parsed = createAdminSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  try {
    // Check for duplicate email within grup
    const existing = await db()
      .select({ id: admin.id })
      .from(admin)
      .where(and(eq(admin.grup_id, ctx.grupId), eq(admin.email, parsed.data.email)))
      .limit(1);

    if (existing.length > 0) {
      return errorResponse('Email sudah digunakan', undefined, 409);
    }

    const password_hash = await hashPassword(parsed.data.password);

    const rows = await db()
      .insert(admin)
      .values({
        grup_id: ctx.grupId,
        nama: parsed.data.nama,
        email: parsed.data.email,
        password_hash,
      })
      .returning({
        id: admin.id,
        nama: admin.nama,
        email: admin.email,
        aktif: admin.aktif,
        dibuat_pada: admin.dibuat_pada,
        grup_id: admin.grup_id,
      });

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'CREATE',
      entitas: 'admin',
      entitasId: rows[0].id,
      detail: { nama: rows[0].nama, email: rows[0].email },
    });

    return successResponse(rows[0], 'Admin berhasil ditambahkan', 201);
  } catch (err) {
    console.error('[POST /admin]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
