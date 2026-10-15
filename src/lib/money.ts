/**
 * Money utilities — integer rupiah only, no floats.
 */

/**
 * Format an integer rupiah amount as a human-readable string.
 * Example: 12000 → "Rp 12.000"
 */
export function formatRupiah(amount: number): string {
  return (
    'Rp ' +
    Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  );
}

/**
 * Round amount UP to the nearest multiple.
 * Example: roundUpToMultiple(11250, 1000) → 12000
 * Example: roundUpToMultiple(12000, 1000) → 12000 (exact multiple stays)
 */
export function roundUpToMultiple(amount: number, multiple: number): number {
  if (multiple <= 0) {
    throw new Error('multiple must be a positive integer');
  }
  if (amount <= 0) {
    return 0;
  }
  return Math.ceil(amount / multiple) * multiple;
}
