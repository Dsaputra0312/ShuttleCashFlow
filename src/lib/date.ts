/**
 * Date utilities — WIB (UTC+7) timezone helpers.
 */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

/**
 * Convert a UTC Date to its WIB equivalent.
 */
export function toWIB(date: Date): Date {
  return new Date(date.getTime() + WIB_OFFSET_MS);
}

/**
 * Format a Date as DD/MM/YYYY in WIB timezone.
 */
export function formatDateWIB(date: Date): string {
  const wib = toWIB(date);
  const dd = String(wib.getUTCDate()).padStart(2, '0');
  const mm = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = wib.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Get the next play day from a given starting date (defaults to now).
 * @param playDays Array of weekday numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @param from     Start date — defaults to current time
 */
export function getNextPlayDay(playDays: number[], from?: Date): Date {
  if (!playDays || playDays.length === 0) {
    throw new Error('playDays must not be empty');
  }
  const start = from ? new Date(from.getTime()) : new Date();
  // Start checking from tomorrow
  const candidate = new Date(start);
  candidate.setUTCHours(0, 0, 0, 0);
  candidate.setTime(candidate.getTime() + 24 * 60 * 60 * 1000);

  // Look at up to 7 days ahead
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = candidate.getUTCDay();
    if (playDays.includes(dayOfWeek)) {
      return candidate;
    }
    candidate.setTime(candidate.getTime() + 24 * 60 * 60 * 1000);
  }

  throw new Error('No play day found within the next 7 days');
}
