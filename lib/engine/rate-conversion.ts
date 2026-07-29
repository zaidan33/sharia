/**
 * Konversi tingkat dan normalisasi EAR - IMPLEMENTATION_PLAN §6.1.
 * EAR satu-satunya angka yang boleh dipakai membandingkan antar-skema, dan
 * dihitung dari IRR jadwal pembayaran aktual (bukan rumus pintas per akad).
 */
import { solveMonthlyIRR } from "./numeric";

/** Tingkat bulanan dari tingkat tahunan efektif: r_m = (1 + r_a)^(1/12) - 1.
 *  `annualPercent` dalam persen; mengembalikan tingkat bulanan sebagai fraction. */
export function monthlyFromEffectiveAnnual(annualPercent: number): number {
  return Math.pow(1 + annualPercent / 100, 1 / 12) - 1;
}

/** Tingkat tahunan efektif dari tingkat bulanan: r_a = (1 + r_m)^12 - 1.
 *  `monthlyRate` sebagai fraction; mengembalikan persen tahunan. */
export function effectiveAnnualFromMonthly(monthlyRate: number): number {
  return (Math.pow(1 + monthlyRate, 12) - 1) * 100;
}

/**
 * EAR sebuah jadwal pembayaran: cari r_m yang membuat NPV dari
 * [-pokok, angsuran_1, ..., angsuran_n] sama dengan nol, lalu tahunkan.
 * Mengembalikan EAR dalam persen, atau null bila tak terdefinisi
 * (mis. seluruh angsuran nol / tidak ada perubahan tanda). PRD §5, §10.
 */
export function effectiveAnnualRateOfSchedule(
  pokok: number,
  schedule: number[],
): number | null {
  const cashflow = [-pokok, ...schedule];
  const monthly = solveMonthlyIRR(cashflow);
  if (monthly === null) return null;
  return effectiveAnnualFromMonthly(monthly);
}
