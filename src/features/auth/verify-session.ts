import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { SessionPayload } from './create-session';

const SESSION_COOKIE = 'session';

function getJwtSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function verifySession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);

    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
