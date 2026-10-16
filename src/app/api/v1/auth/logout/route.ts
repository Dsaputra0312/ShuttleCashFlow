// FEAT-006 T5.3 Auth+Scoping Checklist:
// [–] Intentionally public — logout clears session cookie (no data returned)

import { deleteSession } from '@/features/auth/create-session';
import { successResponse } from '@/lib/api-response';

export async function POST() {
  await deleteSession();
  return successResponse(null, 'Logout berhasil');
}
