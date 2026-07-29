/**
 * Valuasi NPV & IRR atas arus kas INKREMENTAL - IMPLEMENTATION_PLAN §6.5.
 *
 * Penting: NPV/IRR memakai arus kas inkremental (Δpendapatan - Δopex), BUKAN
 * arus kas seluruh usaha. Memakai arus kas seluruh usaha akan menghasilkan IRR
 * di atas 100% yang menyesatkan (PRD §17 baris 4).
 */
import { npvAtMonthlyRate, solveMonthlyIRR, signChangeCount } from "./numeric";
import { monthlyFromEffectiveAnnual, effectiveAnnualFromMonthly } from "./rate-conversion";
import type { CashflowPeriod } from "./cashflow";

/**
 * NPV atas arus kas inkremental:
 *   r_m = (1 + discountRate)^(1/12) - 1
 *   NPV = -kebutuhanDana + Σ_{t=1..n} ΔCF_t / (1 + r_m)^t
 */
export function calculateNPV(
  cashflow: CashflowPeriod[],
  discountRateTahunan: number,
  investasiAwal: number,
): number {
  const rm = monthlyFromEffectiveAnnual(discountRateTahunan);
  const incremental = cashflow.map((p) => p.arusKasInkremental);
  // cf[0] = -investasiAwal pada t=0, ΔCF_t pada indeks t (eksponen t).
  return npvAtMonthlyRate([-investasiAwal, ...incremental], rm);
}

export interface IRRResult {
  irrTahunanPersen: number | null;
  unik: boolean;
}

/**
 * IRR bulanan dari [-investasiAwal, ΔCF_1, ..., ΔCF_n], lalu ditahunkan:
 *   IRR_a = (1 + IRR_m)^12 - 1.
 * Mengembalikan null bila tak terdefinisi (tidak ada perubahan tanda).
 * `unik` bernilai false bila tanda arus kas berubah lebih dari sekali - UI
 * mengarahkan pengguna ke NPV sebagai acuan utama (PRD §10).
 */
export function calculateIRR(
  cashflow: CashflowPeriod[],
  investasiAwal: number,
): IRRResult {
  const incremental = cashflow.map((p) => p.arusKasInkremental);
  const fullCf = [-investasiAwal, ...incremental];
  const unik = signChangeCount(fullCf) <= 1;
  const monthly = solveMonthlyIRR(fullCf);
  if (monthly === null) return { irrTahunanPersen: null, unik };
  return { irrTahunanPersen: effectiveAnnualFromMonthly(monthly), unik };
}

export interface TerminalValueResult {
  terminalValue: number | null; // nilai terminal pada akhir horizon (Gordon)
  pvTerminal: number | null; // PV dari terminal value
  pertumbuhanTerminal: number | null; // g (fraction) yang dipakai; null = tidak diaktifkan
}

/**
 * Terminal value (V2.3) - Gordon growth:
 *   CF tahun terakhir = run-rate arus kas inkremental 12 bulan terakhir (dijahunkan)
 *   TV = CF tahun terakhir × (1 + g) / (r - g)   pada akhir horizon
 *   PV(TV) = TV / (1 + r)^(n/12)
 * Mengembalikan null bila g tidak diisi atau g >= r (Gordon tak terdefinisi).
 */
export function calculateTerminalValue(
  cashflow: CashflowPeriod[],
  discountRateTahunan: number,
  pertumbuhanTerminalTahunan: number | null | undefined,
): TerminalValueResult {
  if (pertumbuhanTerminalTahunan === null || pertumbuhanTerminalTahunan === undefined) {
    return { terminalValue: null, pvTerminal: null, pertumbuhanTerminal: null };
  }
  const g = pertumbuhanTerminalTahunan / 100;
  const r = discountRateTahunan / 100;
  if (r - g <= 0) {
    return { terminalValue: null, pvTerminal: null, pertumbuhanTerminal: g };
  }
  const last12 = cashflow.slice(-12);
  const sumLast = last12.reduce((a, p) => a + p.arusKasInkremental, 0);
  const cfLastYear = (sumLast * 12) / last12.length;
  const tv = (cfLastYear * (1 + g)) / (r - g);
  const nYears = cashflow.length / 12;
  const pv = tv / Math.pow(1 + r, nYears);
  return { terminalValue: tv, pvTerminal: pv, pertumbuhanTerminal: g };
}
