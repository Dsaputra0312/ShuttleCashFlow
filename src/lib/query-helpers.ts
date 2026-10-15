import { z } from 'zod';
import { errorResponse } from './api-response';

const listQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1, 'page must be >= 1')),
  per_page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100, 'per_page must be between 1 and 100')),
  search: z.string().optional(),
  sort: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export function parseListQuery(
  searchParams: URLSearchParams
):
  | { ok: true; query: ListQuery }
  | { ok: false; response: ReturnType<typeof errorResponse> } {
  const raw = {
    page: searchParams.get('page') ?? undefined,
    per_page: searchParams.get('per_page') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    sort_dir: searchParams.get('sort_dir') ?? undefined,
  };

  const result = listQuerySchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return {
      ok: false,
      response: errorResponse('Validation failed', errors, 422),
    };
  }

  return { ok: true, query: result.data };
}
