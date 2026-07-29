/**
 * Orkestrasi perhitungan satu skenario - IMPLEMENTATION_PLAN §6.6.
 * Satu-satunya pintu masuk perhitungan. Fungsi murni.
 */
import { buildFinancingSchedule, type FinancingSchedule } from "./financing-cost";
import {
  projectCashflow,
  type Variant,
  type CashflowInput,
  type CashflowPeriod,
} from "./cashflow";
import {
  calculateDSCR,
  dscrAverage,
  dscrMinimum,
  calculateDER,
  calculateROI,
  calculateBreakEvenOmzet,
  type BreakEvenResult,
} from "./ratios";
import { calculateNPV, calculateIRR, type IRRResult } from "./valuation";

export type { Variant, CashflowPeriod, FinancingSchedule, BreakEvenResult, IRRResult };

/** Bentuk masukan computeScenario - berkorespondensi dengan Zod schema (Fase 3). */
export interface ScenarioInput {
  nama: string;
  jenisUsaha: string;
  tujuanPembiayaan: string;
  profilRisiko: "rendah" | "sedang" | "tinggi";

  kebutuhanDana: number;
  tenorBulan: number;
  jenisSkema: "syariah" | "konvensional";
  jenisAkad: "murabahah" | "ijarah" | "musyarakah_mutanaqishah" | null;
  tingkatBiayaTahunan: number; // persen
  basisTingkatBiaya: "flat" | "efektif";

  pendapatanBulananAwal: number;
  opexBulananAwal: number;
  pertumbuhanPendapatanTahunan: number; // persen
  inflasiBiayaTahunan: number; // persen
  marginKontribusiPersen: number; // persen
  ekuitasAwal: number;
  kewajibanLain: number;

  deltaPendapatanBulanan: number;
  deltaOpexBulanan: number;
  discountRateTahunan: number; // persen
}

export interface VariantResult {
  cashflow: CashflowPeriod[];
  dscr: (number | null)[];
  dscrRataRata: number | null;
  dscrMinimum: number | null;
  npv: number;
  irr: IRRResult;
}

export type StatusKelayakan = "LAYAK" | "WASPADA" | "TIDAK_LAYAK";

export interface ScenarioComputation {
  schedule: FinancingSchedule;
  varian: Record<Variant, VariantResult>;
  der: number | null;
  roiTahunanPersen: number;
  breakEven: BreakEvenResult;
  status: StatusKelayakan;
}

/**
 * Status kelayakan dihitung dari varian base (PRD §5.1):
 * - TIDAK_LAYAK: DSCR rata-rata < 1,00
 * - LAYAK: DSCR rata-rata >= 1,25 dan DSCR minimum >= 1,00 dan NPV > 0
 * - WASPADA: sisanya
 */
function determineStatus(base: VariantResult): StatusKelayakan {
  const avg = base.dscrRataRata;
  const min = base.dscrMinimum;
  // DSCR tak terdefinisi (debt service 0 seluruh periode): tidak ada beban
  // pembiayaan, kelayakan ditentukan NPV saja.
  if (avg === null || min === null) {
    return base.npv > 0 ? "LAYAK" : "WASPADA";
  }
  if (avg < 1.0) return "TIDAK_LAYAK";
  if (avg >= 1.25 && min >= 1.0 && base.npv > 0) return "LAYAK";
  return "WASPADA";
}

export function computeScenario(input: ScenarioInput): ScenarioComputation {
  const schedule = buildFinancingSchedule({
    kebutuhanDana: input.kebutuhanDana,
    tenorBulan: input.tenorBulan,
    jenisSkema: input.jenisSkema,
    jenisAkad: input.jenisAkad,
    tingkatBiayaTahunan: input.tingkatBiayaTahunan,
    basisTingkatBiaya: input.basisTingkatBiaya,
  });

  const cfInput: CashflowInput = {
    pendapatanBulananAwal: input.pendapatanBulananAwal,
    opexBulananAwal: input.opexBulananAwal,
    pertumbuhanPendapatanTahunan: input.pertumbuhanPendapatanTahunan,
    inflasiBiayaTahunan: input.inflasiBiayaTahunan,
    deltaPendapatanBulanan: input.deltaPendapatanBulanan,
    deltaOpexBulanan: input.deltaOpexBulanan,
    tenorBulan: input.tenorBulan,
    debtService: schedule.angsuran,
  };

  const variants: Variant[] = ["base", "best", "worst"];
  const varian = {} as Record<Variant, VariantResult>;
  for (const v of variants) {
    const cashflow = projectCashflow(cfInput, v);
    const dscr = calculateDSCR(cashflow);
    varian[v] = {
      cashflow,
      dscr,
      dscrRataRata: dscrAverage(dscr),
      dscrMinimum: dscrMinimum(dscr),
      npv: calculateNPV(cashflow, input.discountRateTahunan, input.kebutuhanDana),
      irr: calculateIRR(cashflow, input.kebutuhanDana),
    };
  }

  const der = calculateDER(
    input.kebutuhanDana,
    input.kewajibanLain,
    input.ekuitasAwal,
  );
  const roiTahunanPersen = calculateROI(
    varian.base.cashflow,
    schedule,
    input.kebutuhanDana,
    input.tenorBulan,
  );
  const breakEven = calculateBreakEvenOmzet(
    input.pendapatanBulananAwal,
    input.opexBulananAwal,
    input.marginKontribusiPersen,
    schedule.angsuran[0] ?? 0,
  );

  return {
    schedule,
    varian,
    der,
    roiTahunanPersen,
    breakEven,
    status: determineStatus(varian.base),
  };
}
