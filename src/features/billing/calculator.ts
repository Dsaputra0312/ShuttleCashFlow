import { roundUpToMultiple } from '@/lib/money';
import type {
  SesiInput,
  PemainInput,
  KonfigurasiInput,
  TagihanPemain,
  HasilPerhitunganPertemuan,
} from './types';

/**
 * Calculate billing for all players in a meeting.
 *
 * Rules:
 * - Each session: ball cost is split equally among all players in that session.
 *   - If ditanggung_oleh_pemain_id is set, that player bears the full ball cost for this session.
 *   - Member players pay Rp 0 for their share of ball cost (unless they are the bearer).
 * - Court cost per session: non-member players each pay biaya_lapangan_non_member.
 *   Member players pay Rp 0 for court.
 * - bebas_biaya players: tagihan forced to 0 regardless of sessions played.
 * - Rounding: each player's total is rounded UP to the nearest kelipatan_pembulatan.
 */
export function hitungTagihan(
  sesiList: SesiInput[],
  pemainList: PemainInput[],
  config: KonfigurasiInput
): HasilPerhitunganPertemuan {
  const { harga_bola_per_biji, biaya_lapangan_non_member, kelipatan_pembulatan } = config;

  // Build lookup maps
  const pemainMap = new Map<string, PemainInput>();
  for (const p of pemainList) {
    pemainMap.set(p.id, p);
  }

  // Accumulate raw costs per player
  const rawBola = new Map<string, number>();
  const rawLapangan = new Map<string, number>();
  const jumlahSesiMap = new Map<string, number>();
  let totalBolaTermakai = 0;

  for (const sesi of sesiList) {
    totalBolaTermakai += sesi.bola_terpakai;
    const totalBolaKost = sesi.bola_terpakai * harga_bola_per_biji;
    const pemainCount = sesi.pemain_ids.length;
    if (pemainCount === 0) continue;

    const bearerId = sesi.ditanggung_oleh_pemain_id;

    for (const pemainId of sesi.pemain_ids) {
      // Increment session count
      jumlahSesiMap.set(pemainId, (jumlahSesiMap.get(pemainId) ?? 0) + 1);

      // Ball cost
      let bolaCost = 0;
      if (bearerId) {
        // Bearer pays full ball cost for this session
        if (pemainId === bearerId) {
          bolaCost = totalBolaKost;
        } else {
          bolaCost = 0;
        }
      } else {
        // Split equally among non-members only; members pay 0
        const pemain = pemainMap.get(pemainId);
        const isMember = pemain?.is_member ?? false;
        if (!isMember) {
          // Count how many non-members are in this session
          const nonMemberCount = sesi.pemain_ids.filter((pid) => {
            const p = pemainMap.get(pid);
            return !(p?.is_member ?? false);
          }).length;
          bolaCost = nonMemberCount > 0 ? Math.floor(totalBolaKost / nonMemberCount) : 0;
        } else {
          bolaCost = 0;
        }
      }
      rawBola.set(pemainId, (rawBola.get(pemainId) ?? 0) + bolaCost);

      // Court cost
      const pemain = pemainMap.get(pemainId);
      const isMember = pemain?.is_member ?? false;
      const lapanganCost = isMember ? 0 : biaya_lapangan_non_member;
      rawLapangan.set(pemainId, (rawLapangan.get(pemainId) ?? 0) + lapanganCost);
    }
  }

  // Build per-player result
  const tagihanPerPemain: TagihanPemain[] = [];
  let totalTagihan = 0;

  for (const pemain of pemainList) {
    const biayaBola = rawBola.get(pemain.id) ?? 0;
    const biayaLapangan = rawLapangan.get(pemain.id) ?? 0;
    const jumlahSesi = jumlahSesiMap.get(pemain.id) ?? 0;

    let tagihan: number;
    if (pemain.bebas_biaya) {
      tagihan = 0;
    } else {
      const rawTotal = biayaBola + biayaLapangan;
      tagihan = rawTotal > 0 ? roundUpToMultiple(rawTotal, kelipatan_pembulatan) : 0;
    }

    totalTagihan += tagihan;

    tagihanPerPemain.push({
      pemain_id: pemain.id,
      jumlah_sesi: jumlahSesi,
      biaya_bola_raw: biayaBola,
      biaya_lapangan_raw: biayaLapangan,
      tagihan,
      dibayar: 0,
      kelebihan: 0,
    });
  }

  return {
    tagihan_per_pemain: tagihanPerPemain,
    total_tagihan: totalTagihan,
    total_bola_terpakai: totalBolaTermakai,
  };
}
