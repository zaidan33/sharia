/**
 * Proyeksi arus kas bulanan dengan varian base/best/worst - IMPLEMENTATION_PLAN §6.3.
 *
 * Varian adalah pengali level terhadap deret proyeksi (bukan terhadap tingkat
 * pertumbuhan). Jadwal pembiayaan TIDAK dikalikan pengali varian - kewajiban ke
 * pemberi dana tetap berapa pun realisasi usaha (PRD §8).
 */
import { monthlyFromEffectiveAnnual } from "./rate-conversion";

export type Variant = "base" | "best" | "worst";

export const VARIANT_MULTIPLIERS: Record<
  Variant,
  { pendapatan: number; opex: number }
> = {
  base: { pendapatan: 1.0, opex: 1.0 },
  best: { pendapatan: 1.08, opex: 0.97 },
  worst: { pendapatan: 0.9, opex: 1.05 },
};

export interface CashflowInput {
  pendapatanBulananAwal: number;
  opexBulananAwal: number;
  pertumbuhanPendapatanTahunan: number; // persen
  inflasiBiayaTahunan: number; // persen
  deltaPendapatanBulanan: number;
  deltaOpexBulanan: number;
  tenorBulan: number;
  debtService: number[]; // angsuran per bulan dari financing schedule
}

export interface CashflowPeriod {
  bulan: number; // 1..n
  pendapatan: number;
  opex: number;
  capex: number;
  cfads: number; // pendapatan - opex - capex
  debtService: number; // D_t dari financing schedule
  arusKasBersih: number; // cfads - debtService
  arusKasInkremental: number; // deltaPendapatan - deltaOpex
}

export function projectCashflow(
  input: CashflowInput,
  variant: Variant,
): CashflowPeriod[] {
  const m = VARIANT_MULTIPLIERS[variant];
  const gm = monthlyFromEffectiveAnnual(input.pertumbuhanPendapatanTahunan);
  const fm = monthlyFromEffectiveAnnual(input.inflasiBiayaTahunan);

  const periods: CashflowPeriod[] = [];
  for (let t = 1; t <= input.tenorBulan; t++) {
    // bulan pertama eksponen nol -> nilai sama persis dengan input pengguna.
    const gp = Math.pow(1 + gm, t - 1);
    const go = Math.pow(1 + fm, t - 1);

    const pendapatan = input.pendapatanBulananAwal * m.pendapatan * gp;
    const opex = input.opexBulananAwal * m.opex * go;
    const deltaPendapatan = input.deltaPendapatanBulanan * m.pendapatan * gp;
    const deltaOpex = input.deltaOpexBulanan * m.opex * go;
    const capex = 0; // MVP: capex nol; field disediakan untuk V2.

    const cfads = pendapatan - opex - capex;
    const debtService = input.debtService[t - 1];

    periods.push({
      bulan: t,
      pendapatan,
      opex,
      capex,
      cfads,
      debtService,
      arusKasBersih: cfads - debtService,
      arusKasInkremental: deltaPendapatan - deltaOpex,
    });
  }
  return periods;
}
