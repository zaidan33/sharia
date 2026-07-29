/**
 * Assumption Calibration Agent (V4.3) - IMPLEMENTATION_PLAN V4 instr 3.
 *
 * Membandingkan profil sektor (dan skala dana/tenor) dengan seed cases untuk
 * menyarankan rentang wajar tiga asumsi proyeksi: pertumbuhan pendapatan,
 * inflasi biaya, dan margin kontribusi. Fungsi murni - SEED_SCENARIOS konstan.
 * Saran bisa ditimpa pengguna.
 */
import { SEED_SCENARIOS } from "@/lib/seed-data";

export type CalibratedKey =
  | "pertumbuhanPendapatanTahunan"
  | "inflasiBiayaTahunan"
  | "marginKontribusiPersen";

export interface CalibratedAssumption {
  key: CalibratedKey;
  label: string;
  suggested: number; // median (point estimate)
  low: number; // kuartil bawah (Q1)
  high: number; // kuartil atas (Q3)
  reference: string; // sumber acuan
}

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = (sortedAsc.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

function within(factor: number, target: number, val: number): boolean {
  if (target <= 0) return true; // tak ada batas -> lewati filter
  return val >= target * (1 - factor) && val <= target * (1 + factor);
}

/**
 * Pilih kasus acuan: sektor sama (>=3) lalu disempurnakan oleh kemiripan
 * skala dana (±50%) dan tenor (±50%) bila cukup (>=3). Fallback bertahap.
 */
function referenceCases(
  sector: string,
  amount: number,
  tenor: number,
): { cases: typeof SEED_SCENARIOS; label: string } {
  const sectorCases = SEED_SCENARIOS.filter((s) => s.jenisUsaha === sector);
  const pool = sectorCases.length >= 3 ? sectorCases : SEED_SCENARIOS;
  const baseLabel =
    sectorCases.length >= 3 ? `sektor ${sector}` : "lintas sektor (data sektor terbatas)";

  // Sempurnakan dengan kemiripan skala bila masih cukup kasus.
  if (amount > 0 || tenor > 0) {
    const similar = pool.filter(
      (s) => within(0.5, amount, s.kebutuhanDana) && within(0.5, tenor, s.tenorBulan),
    );
    if (similar.length >= 3) {
      return { cases: similar, label: `${baseLabel}, skala dana/tenor serupa` };
    }
  }
  return { cases: pool, label: baseLabel };
}

export function calibrate(
  sector: string,
  amount = 0,
  tenor = 0,
): CalibratedAssumption[] {
  const ref = referenceCases(sector, amount, tenor);

  const metric = (
    key: CalibratedKey,
    label: string,
  ): CalibratedAssumption => {
    const vals = ref.cases
      .map((c) => c[key] as number)
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);
    return {
      key,
      label,
      suggested: Number(quantile(vals, 0.5).toFixed(1)),
      low: Number(quantile(vals, 0.25).toFixed(1)),
      high: Number(quantile(vals, 0.75).toFixed(1)),
      reference: ref.label,
    };
  };

  return [
    metric("pertumbuhanPendapatanTahunan", "Pertumbuhan pendapatan"),
    metric("inflasiBiayaTahunan", "Inflasi biaya"),
    metric("marginKontribusiPersen", "Margin kontribusi"),
  ];
}
