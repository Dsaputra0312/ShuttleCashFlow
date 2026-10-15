/**
 * Pure WhatsApp recap generator — no DB imports.
 * Format: header, sessions list, per-player billing summary, total.
 */

export interface PertemuanData {
  id: string;
  tanggal: string; // YYYY-MM-DD
  terkunci: boolean;
}

export interface SesiData {
  id: string;
  lapangan: number;
  bola_terpakai: number;
  ditanggung_oleh_pemain_id: string | null;
  pemain_ids: string[];
}

export interface PesertaData {
  pemain_id: string;
  nama: string;
  tagihan: number;
  dibayar: number;
  status_main: string;
}

function formatTanggalIndo(dateStr: string): string {
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const d = new Date(dateStr + 'T00:00:00');
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function formatRupiah(amount: number): string {
  return (
    'Rp ' +
    Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  );
}

/**
 * Generate a WhatsApp-formatted recap string for a pertemuan.
 */
export function generateRekapWhatsApp(
  pertemuan: PertemuanData,
  sesiList: SesiData[],
  pesertaList: PesertaData[]
): string {
  const pemainNamaMap = new Map(pesertaList.map((p) => [p.pemain_id, p.nama]));

  const lines: string[] = [];

  // Header
  lines.push('🏸 *REKAP PERTEMUAN*');
  lines.push(`📅 ${formatTanggalIndo(pertemuan.tanggal)}`);
  lines.push(`👥 ${pesertaList.length} pemain`);
  lines.push('');

  // Sessions
  if (sesiList.length > 0) {
    lines.push('*Sesi:*');
    sesiList.forEach((s, i) => {
      const pemainNama = s.pemain_ids
        .map((id) => pemainNamaMap.get(id) ?? id)
        .join(', ');
      const penanggungNama = s.ditanggung_oleh_pemain_id
        ? pemainNamaMap.get(s.ditanggung_oleh_pemain_id) ?? s.ditanggung_oleh_pemain_id
        : null;
      const penanggungNote = penanggungNama ? ` _(bola ditanggung ${penanggungNama})_` : '';
      lines.push(
        `${i + 1}. Lap.${s.lapangan} | ${s.bola_terpakai} bola | ${pemainNama}${penanggungNote}`
      );
    });
    lines.push('');
  }

  // Per-player billing
  lines.push('*Tagihan:*');
  const totalTagihan = pesertaList.reduce((acc, p) => acc + p.tagihan, 0);

  pesertaList.forEach((p) => {
    const nominalStr = p.tagihan === 0 ? 'Gratis' : formatRupiah(p.tagihan);
    // Find sessions where this player is penanggung
    const penanggungSesiIndices = sesiList
      .map((s, i) => (s.ditanggung_oleh_pemain_id === p.pemain_id ? i + 1 : null))
      .filter((idx): idx is number => idx !== null);
    const penanggungNote =
      penanggungSesiIndices.length > 0
        ? ` _(menanggung bola sesi ${penanggungSesiIndices.join(', ')})_`
        : '';
    lines.push(`• ${p.nama}: *${nominalStr}*${penanggungNote}`);
  });

  lines.push('');
  lines.push(`*Total: ${formatRupiah(totalTagihan)}*`);

  return lines.join('\n');
}
