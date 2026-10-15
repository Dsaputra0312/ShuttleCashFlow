import { db } from '@/db';
import { log_aktivitas } from '@/db/schema';

interface LogActivityParams {
  grupId: string;
  adminId: string;
  aksi: string;
  entitas: string;
  entitasId?: string;
  detail?: Record<string, unknown>;
  alasan?: string;
}

/**
 * Inserts a row to log_aktivitas. Fire-and-forget safe — errors are silently
 * logged so they never break the primary request.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await db().insert(log_aktivitas).values({
      grup_id: params.grupId,
      admin_id: params.adminId,
      aksi: params.aksi,
      entitas: params.entitas,
      entitas_id: params.entitasId,
      detail: params.detail ?? null,
      alasan: params.alasan,
    });
  } catch (err) {
    console.error('[logActivity]', err);
  }
}
