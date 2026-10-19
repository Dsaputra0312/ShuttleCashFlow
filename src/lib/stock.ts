/**
 * Stock helper utilities for shuttlecock (bola) management.
 * 1 Tabung = 12 biji.
 */

export interface StokBreakdown {
  tabung: number;
  biji: number;
  formatted: string;
}

/**
 * Format total shuttlecocks (in pieces/biji) into "X Tabung Y Biji".
 * Example:
 * 146 -> "12 Tabung 2 Biji"
 * 123 -> "10 Tabung 3 Biji"
 * 12  -> "1 Tabung 0 Biji"
 * 5   -> "0 Tabung 5 Biji"
 * 0   -> "0 Tabung 0 Biji"
 */
export function formatStokBola(totalBiji: number): string {
  if (isNaN(totalBiji) || totalBiji === 0) {
    return '0 Tabung 0 Biji';
  }

  if (totalBiji < 0) {
    const abs = Math.abs(totalBiji);
    const tabung = Math.floor(abs / 12);
    const biji = abs % 12;
    return `-${tabung} Tabung ${biji} Biji`;
  }

  const tabung = Math.floor(totalBiji / 12);
  const biji = totalBiji % 12;
  return `${tabung} Tabung ${biji} Biji`;
}

/**
 * Breakdown total biji into tabung and remaining biji
 */
export function breakdownStokBola(totalBiji: number): StokBreakdown {
  const safeTotal = isNaN(totalBiji) ? 0 : totalBiji;
  const tabung = Math.floor(Math.abs(safeTotal) / 12) * (safeTotal < 0 ? -1 : 1);
  const biji = Math.abs(safeTotal) % 12;

  return {
    tabung,
    biji,
    formatted: formatStokBola(safeTotal),
  };
}

/**
 * Convert tabung and biji inputs into total biji
 */
export function hitungTotalBiji(tabung: number, biji: number): number {
  const safeTabung = isNaN(tabung) ? 0 : Math.max(0, tabung);
  const safeBiji = isNaN(biji) ? 0 : Math.max(0, biji);
  return safeTabung * 12 + safeBiji;
}
