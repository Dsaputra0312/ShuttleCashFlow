import { deleteSession } from '@/features/auth/create-session';
import { successResponse } from '@/lib/api-response';

export async function POST() {
  await deleteSession();
  return successResponse(null, 'Logout berhasil');
}
