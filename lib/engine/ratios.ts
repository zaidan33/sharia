/**
 * Rasio kelayakan - IMPLEMENTATION_PLAN §6.4.
 */
import type { CashflowPeriod } from "./cashflow";
import type { FinancingSchedule } from "./financing-cost";

/** DSCR_t = CFADS_t / D_t. null bila D_t = 0 (PRD §10). */
export function calculateDSCR(cashflow: CashflowPeriod[]): (number | null)[] {
  return cashflow.map((p) =>
    p.debtService === 0 ? null : p.cfads / p.debtService,
  );
}

/** Rata-rata DSCR yang terdefinisi; null bila semua null. */
export function dscrAverage(dscr: (number | null)[]): number | null {
  const vals = dscr.filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** DSCR minimum yang terdefinisi; null bila semua null. */
export function dscrMinimum(dscr: (number | null)[]): number | null {
  const vals = dscr.filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  return Math.min(...vals);
}

/** DER = (kebutuhanDana + kewajibanLain) / ekuitasAwal. null bila ekuitas = 0. */
export function calculateDER(
  kebutuhanDana: number,
  kewajibanLain: number,
  ekuitasAwal: number,
): number | null {
  if (ekuitasAwal === 0) return null;
  return (kebutuhanDana + kewajibanLain) / ekuitasAwal;
}

/**
 * ROI tahunan atas dana yang dibiayai (dilaporkan sebagai persen per tahun):
 *   labaInkremental = Σ arusKasInkremental_t - totalImbalan
 *   ROI = (labaInkremental / kebutuhanDana) / (n/12) × 100
 */
export function calculateROI(
  cashflow: CashflowPeriod[],
  schedule: FinancingSchedule,
  kebutuhanDana: number,
  tenorBulan: number,
): number {
  const labaInkremental =
    cashflow.reduce((a, p) => a + p.arusKasInkremental, 0) -
    schedule.totalImbalan;
  const years = tenorBulan / 12;
  if (kebutuhanDana === 0 || years === 0) return 0; // defensif; validasi mencegah
  return ((labaInkremental / kebutuhanDana) / years) * 100;
}

export interface BreakEvenResult {
  bepRupiah: number;
  persenDariOmzet: number;
  biayaTetapNegatif: boolean;
}

/**
 * Break-even dalam omzet rupiah per bulan:
 *   biayaVariabel = (1 - marginKontribusi) × Pendapatan
 *   biayaTetap    = Opex - biayaVariabel
 *   BEP           = (biayaTetap + D_1) / marginKontribusi
 * Dinyatakan dalam rupiah (bukan unit) - sesuai untuk usaha jasa/ritel campuran.
 */
export function calculateBreakEvenOmzet(
  pendapatanAwal: number,
  opexAwal: number,
  marginKontribusiPersen: number,
  debtServicePertama: number,
): BreakEvenResult {
  const mc = marginKontribusiPersen / 100;
  const biayaVariabel = (1 - mc) * pendapatanAwal;
  const biayaTetap = opexAwal - biayaVariabel;
  const bepRupiah = mc === 0 ? 0 : (biayaTetap + debtServicePertama) / mc;
  const persenDariOmzet =
    pendapatanAwal === 0 ? 0 : (bepRupiah / pendapatanAwal) * 100;
  return {
    bepRupiah,
    persenDariOmzet,
    biayaTetapNegatif: biayaTetap < 0,
  };
}
