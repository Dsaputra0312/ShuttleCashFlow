import { verifySession } from './verify-session';

export interface GrupContext {
  adminId: string;
  grupId: string;
}

/**
 * Reads the session cookie, verifies it, and returns { adminId, grupId }.
 * Throws a Response (401) if the session is missing or invalid.
 */
export async function getGrupContext(): Promise<GrupContext> {
  const session = await verifySession();
  if (!session) {
    throw new Response(
      JSON.stringify({ message: 'Sesi tidak valid atau sudah berakhir' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return { adminId: session.adminId, grupId: session.grupId };
}
