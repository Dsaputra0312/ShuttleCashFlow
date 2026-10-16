// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { eq, and, or, asc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  pertemuan,
  peserta_pertemuan,
  sesi,
  sesi_pemain,
  pemain,
  konfigurasi_grup,
  iuran,
} from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { hitungTagihan } from '@/features/billing/calculator';
import { successResponse, errorResponse } from '@/lib/api-response';
import type { KonfigurasiInput, SesiInput, PemainInput } from '@/features/billing/types';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id: pertemuanId } = await params;

  try {
    const dbClient = db();

    // 1. Verify and load pertemuan
    const ptRows = await dbClient
      .select()
      .from(pertemuan)
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!ptRows[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);
    const pt = ptRows[0];

    // 2. Load config from DB (konfigurasi_grup) with fallback to snapshot
    const konfigRows = await dbClient
      .select()
      .from(konfigurasi_grup)
      .where(eq(konfigurasi_grup.grup_id, ctx.grupId))
      .limit(1);

    let konfigDb = konfigRows[0];
    if (!konfigDb) {
      const [inserted] = await dbClient
        .insert(konfigurasi_grup)
        .values({ grup_id: ctx.grupId })
        .onConflictDoNothing()
        .returning();
      konfigDb = inserted ?? konfigRows[0];
    }

    const snapshot = (pt.konfigurasi_snapshot ?? {}) as Record<string, number>;
    const config: KonfigurasiInput = {
      harga_bola_per_biji: konfigDb?.harga_bola_per_biji ?? snapshot.harga_bola_per_biji ?? 5000,
      biaya_lapangan_non_member: konfigDb?.biaya_lapangan_non_member ?? snapshot.biaya_lapangan_non_member ?? 10000,
      kelipatan_pembulatan: konfigDb?.kelipatan_pembulatan ?? snapshot.kelipatan_pembulatan ?? 1000,
    };

    // 3. Load all sessions for this meeting
    const sesiRows = await dbClient
      .select()
      .from(sesi)
      .where(and(eq(sesi.pertemuan_id, pertemuanId), eq(sesi.grup_id, ctx.grupId)))
      .orderBy(asc(sesi.dibuat_pada));

    const sesiIds = sesiRows.map((s) => s.id);

    // 4. Load all sesi_pemain rows
    const sesiPemainRows = sesiIds.length
      ? await dbClient
          .select()
          .from(sesi_pemain)
          .where(inArray(sesi_pemain.sesi_id, sesiIds))
      : [];

    // Map sessions to player IDs
    const sesiPemainMap = new Map<string, string[]>();
    for (const sp of sesiPemainRows) {
      const arr = sesiPemainMap.get(sp.sesi_id) ?? [];
      arr.push(sp.pemain_id);
      sesiPemainMap.set(sp.sesi_id, arr);
    }

    // 5. Track ongoing draft sessions (bola_terpakai === 0)
    const activeDraftByPemain = new Map<string, { lapangan: number; sesi_id: string }>();
    for (const s of sesiRows) {
      if (s.bola_terpakai === 0) {
        const pids = sesiPemainMap.get(s.id) ?? [];
        for (const pid of pids) {
          activeDraftByPemain.set(pid, { lapangan: s.lapangan, sesi_id: s.id });
        }
      }
    }

    // 6. Load peserta_pertemuan
    const pesertaRows = await dbClient
      .select()
      .from(peserta_pertemuan)
      .where(
        and(
          eq(peserta_pertemuan.pertemuan_id, pertemuanId),
          eq(peserta_pertemuan.grup_id, ctx.grupId)
        )
      );

    // 7. Load all players data and iuran to determine membership
    const allPemainIds = [
      ...new Set([
        ...sesiPemainRows.map((sp) => sp.pemain_id),
        ...pesertaRows.map((p) => p.pemain_id),
      ]),
    ];

    const pemainRows = allPemainIds.length
      ? await dbClient
          .select({ id: pemain.id, nama: pemain.nama, bebas_biaya: pemain.bebas_biaya })
          .from(pemain)
          .where(and(eq(pemain.grup_id, ctx.grupId), inArray(pemain.id, allPemainIds)))
      : [];

    const pemainNamaMap = new Map<string, string>();
    for (const p of pemainRows) {
      pemainNamaMap.set(p.id, p.nama);
    }

    const now = new Date();
    const ptDate = pt.tanggal ? new Date(pt.tanggal) : now;
    const meetingYear = ptDate.getFullYear();
    const meetingMonth = ptDate.getMonth() + 1;
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;

    const iuranConditions = [
      eq(iuran.grup_id, ctx.grupId),
      inArray(iuran.pemain_id, allPemainIds),
    ];

    if (meetingYear === nowYear && meetingMonth === nowMonth) {
      iuranConditions.push(
        eq(iuran.periode_tahun, meetingYear),
        eq(iuran.periode_bulan, meetingMonth)
      );
    } else {
      iuranConditions.push(
        or(
          and(eq(iuran.periode_tahun, meetingYear), eq(iuran.periode_bulan, meetingMonth)),
          and(eq(iuran.periode_tahun, nowYear), eq(iuran.periode_bulan, nowMonth))
        )!
      );
    }

    const iuranRows = allPemainIds.length
      ? await dbClient
          .select({ pemain_id: iuran.pemain_id })
          .from(iuran)
          .where(and(...iuranConditions))
      : [];

    const memberSet = new Set(iuranRows.map((i) => i.pemain_id));

    // 8. Calculate real-time billing for all players
    const pemainInputs: PemainInput[] = pemainRows.map((p) => ({
      id: p.id,
      bebas_biaya: p.bebas_biaya,
      is_member: memberSet.has(p.id),
    }));

    const sesiInputs: SesiInput[] = sesiRows.map((s) => ({
      id: s.id,
      lapangan: s.lapangan,
      bola_terpakai: s.bola_terpakai,
      ditanggung_oleh_pemain_id: s.ditanggung_oleh_pemain_id ?? null,
      pemain_ids: sesiPemainMap.get(s.id) ?? [],
    }));

    const hasilKalkulasi = hitungTagihan(sesiInputs, pemainInputs, config);
    const tagihanMap = new Map(
      hasilKalkulasi.tagihan_per_pemain.map((t) => [t.pemain_id, t])
    );

    // 9. Build detailed session usage breakdown per player
    const result = await Promise.all(
      pesertaRows.map(async (peserta) => {
        const tagihanData = tagihanMap.get(peserta.pemain_id);
        const calculatedTagihan = tagihanData?.tagihan ?? 0;
        const draftInfo = activeDraftByPemain.get(peserta.pemain_id);
        const isBebasBiaya = pemainRows.find((p) => p.id === peserta.pemain_id)?.bebas_biaya ?? false;
        const isMember = memberSet.has(peserta.pemain_id);

        // Update tagihan in DB if different and participant is not yet lunas and meeting not locked
        let finalTagihan = peserta.tagihan;
        if (peserta.status_main !== 'lunas') {
          finalTagihan = calculatedTagihan;
          if (peserta.tagihan !== calculatedTagihan && !pt.terkunci) {
            await dbClient
              .update(peserta_pertemuan)
              .set({ tagihan: calculatedTagihan })
              .where(eq(peserta_pertemuan.id, peserta.id));
          }
        }

        // Detailed session breakdown for this player
        const playerSessions = sesiRows
          .map((s, idx) => {
            const pids = sesiPemainMap.get(s.id) ?? [];
            if (!pids.includes(peserta.pemain_id)) return null;

            const nonMemberIds = pids.filter((id) => !memberSet.has(id));
            const totalNonMembers = nonMemberIds.length;
            const isBearer = s.ditanggung_oleh_pemain_id === peserta.pemain_id;
            const hasOtherBearer =
              s.ditanggung_oleh_pemain_id &&
              s.ditanggung_oleh_pemain_id !== peserta.pemain_id;

            let biayaBolaPemain = 0;
            let bolaPemain = 0;
            if (isBebasBiaya || isMember || hasOtherBearer) {
              biayaBolaPemain = 0;
              bolaPemain = 0;
            } else if (isBearer) {
              bolaPemain = s.bola_terpakai * pids.length;
              biayaBolaPemain = bolaPemain * config.harga_bola_per_biji;
            } else {
              bolaPemain = s.bola_terpakai;
              biayaBolaPemain = bolaPemain * config.harga_bola_per_biji;
            }

            return {
              sesi_id: s.id,
              sesi_ke: idx + 1,
              lapangan: s.lapangan,
              bola_terpakai: s.bola_terpakai,
              bola_terpakai_pemain: bolaPemain,
              is_draft: s.bola_terpakai === 0,
              total_pemain: pids.length,
              total_non_members: totalNonMembers,
              is_bearer: isBearer,
              bearer_nama: s.ditanggung_oleh_pemain_id
                ? pemainNamaMap.get(s.ditanggung_oleh_pemain_id) ?? null
                : null,
              biaya_bola_pemain: biayaBolaPemain,
            };
          })
          .filter(Boolean);

        return {
          ...peserta,
          nama: pemainNamaMap.get(peserta.pemain_id) ?? 'Pemain',
          tagihan: finalTagihan,
          has_active_draft_session: !!draftInfo,
          active_draft_lapangan: draftInfo?.lapangan,
          is_member: isMember,
          bebas_biaya: isBebasBiaya,
          breakdown: {
            biaya_bola: tagihanData?.biaya_bola_raw ?? 0,
            biaya_lapangan: tagihanData?.biaya_lapangan_raw ?? 0,
            pembulatan:
              finalTagihan -
              ((tagihanData?.biaya_bola_raw ?? 0) + (tagihanData?.biaya_lapangan_raw ?? 0)),
            tagihan_total: finalTagihan,
            jumlah_sesi: tagihanData?.jumlah_sesi ?? 0,
            harga_bola_per_biji: config.harga_bola_per_biji,
            biaya_lapangan_non_member: config.biaya_lapangan_non_member,
            sesi_details: playerSessions,
          },
        };
      })
    );

    return successResponse(result);
  } catch (err) {
    console.error('[GET /pertemuan/[id]/peserta]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
