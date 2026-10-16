// FEAT-006 T5.3 Auth+Scoping Checklist:
// [–] Intentionally public — health check, no data exposed

import { successResponse } from '@/lib/api-response';

export async function GET() {
  return successResponse({ status: 'ok' }, 'OK');
}
