/**
 * Pure TypeScript data shapes for the billing engine.
 * No DB imports — these are plain data interfaces.
 */

/** One player in the system */
export interface PemainInput {
  id: string;
  /** Player is exempt from all charges */
  bebas_biaya: boolean;
  /** Whether player has paid iuran for the current period (member) */
  is_member: boolean;
}

/** One session (set of players who played together on a court) */
export interface SesiInput {
  id: string;
  /** Court number (1 or 2) */
  lapangan: number;
  /** Number of shuttlecocks used in this session */
  bola_terpakai: number;
  /**
   * If set, this player bears the full ball cost for this session.
   * Other players pay Rp0 for ball in this session.
   * Must be one of the pemain_ids in this session.
   */
  ditanggung_oleh_pemain_id: string | null;
  /** IDs of players who participated in this session */
  pemain_ids: string[];
}

/** Configuration snapshot at the time of the meeting */
export interface KonfigurasiInput {
  /** Cost per shuttlecock in integer rupiah */
  harga_bola_per_biji: number;
  /** Non-member court fee per session in integer rupiah */
  biaya_lapangan_non_member: number;
  /** Round up tagihan to the nearest multiple of this value */
  kelipatan_pembulatan: number;
}

/** Per-player billing breakdown */
export interface TagihanPemain {
  pemain_id: string;
  /** Number of sessions this player participated in */
  jumlah_sesi: number;
  /** Raw ball cost before rounding */
  biaya_bola_raw: number;
  /** Raw court cost before rounding */
  biaya_lapangan_raw: number;
  /** Total tagihan after rounding (0 if bebas_biaya) */
  tagihan: number;
  /** Amount paid (relevant at payment time) */
  dibayar: number;
  /** Excess payment (dibayar - tagihan, only if dibayar > tagihan) */
  kelebihan: number;
}

/** Full billing result for a meeting */
export interface HasilPerhitunganPertemuan {
  /** Per-player billing breakdown */
  tagihan_per_pemain: TagihanPemain[];
  /** Total bill across all players */
  total_tagihan: number;
  /** Total shuttlecocks used across all sessions */
  total_bola_terpakai: number;
}
