/**
 * Unit test rasio - IMPLEMENTATION_PLAN §6.4.
 */
import { describe, it, expect } from "vitest";
import {
  calculateDSCR,
  dscrAverage,
  dscrMinimum,
  calculateDER,
  calculateROI,
  calculateBreakEvenOmzet,
} from "../ratios";
import type { CashflowPeriod } from "../cashflow";
import { buildFinancingSchedule } from "../financing-cost";

const period = (cfads: number, debt: number): CashflowPeriod => ({
  bulan: 0,
  pendapatan: 0,
  opex: 0,
  capex: 0,
  cfads,
  debtService: debt,
  arusKasBersih: cfads - debt,
  arusKasInkremental: 0,
});

describe("calculateDSCR", () => {
  it("CFADS / debt service per periode", () => {
    const dscr = calculateDSCR([period(5_000_000, 4_000_000), period(2_000_000, 4_000_000)]);
    expect(dscr[0]).toBeCloseTo(1.25, 4);
    expect(dscr[1]).toBeCloseTo(0.5, 4);
  });
  it("null bila debt service = 0 (PRD §10)", () => {
    const dscr = calculateDSCR([period(5_000_000, 0)]);
    expect(dscr[0]).toBeNull();
  });
  it("rata-rata & minimum mengabaikan null", () => {
    const dscr = calculateDSCR([period(5, 4), period(2, 4), period(9, 0)]);
    expect(dscrAverage(dscr)).toBeCloseTo((1.25 + 0.5) / 2, 4);
    expect(dscrMinimum(dscr)).toBeCloseTo(0.5, 4);
  });
  it("CFADS negatif -> DSCR negatif (seed #14)", () => {
    const dscr = calculateDSCR([period(-1_000_000, 4_000_000)]);
    expect(dscr[0]).toBeLessThan(0);
  });
});

describe("calculateDER", () => {
  it("(kebutuhanDana + kewajibanLain) / ekuitasAwal", () => {
    expect(calculateDER(75_000_000, 0, 25_000_000)).toBeCloseTo(3.0, 4);
    expect(calculateDER(150_000_000, 15_000_000, 50_000_000)).toBeCloseTo(3.3, 4);
    expect(calculateDER(2_000_000_000, 200_000_000, 600_000_000)).toBeCloseTo(3.6667, 3);
  });
  it("null bila ekuitas = 0", () => {
    expect(calculateDER(75_000_000, 0, 0)).toBeNull();
  });
});

describe("calculateBreakEvenOmzet", () => {
  it("seed #1: BEP ≈ 61,4% omzet (murabahah flat 7%, P 75jt, n 18)", () => {
    const sched = buildFinancingSchedule({
      kebutuhanDana: 75_000_000,
      tenorBulan: 18,
      jenisSkema: "syariah",
      jenisAkad: "murabahah",
      tingkatBiayaTahunan: 7,
      basisTingkatBiaya: "flat",
    });
    const bep = calculateBreakEvenOmzet(40_000_000, 32_000_000, 22, sched.angsuran[0]);
    // D1 = 4.604.166,67; biayaTetap = 800.000; BEP = (800.000 + D1)/0,22
    expect(bep.persenDariOmzet).toBeGreaterThan(60.5);
    expect(bep.persenDariOmzet).toBeLessThan(62);
    expect(bep.biayaTetapNegatif).toBe(false);
  });
  it("menandai biaya tetap negatif bila biaya variabel tersirat melebihi opex", () => {
    // pendapatan 40jt, mc 22% -> biayaVariabel = 31,2jt; opex 20jt < itu -> biayaTetap negatif.
    const bep = calculateBreakEvenOmzet(40_000_000, 20_000_000, 22, 1_000_000);
    expect(bep.biayaTetapNegatif).toBe(true);
  });
});

describe("calculateROI", () => {
  it("ROI tahunan positif untuk arus kas inkremental sehat", () => {
    const cashflow: CashflowPeriod[] = Array.from({ length: 12 }, (_, i) => ({
      bulan: i + 1,
      pendapatan: 0,
      opex: 0,
      capex: 0,
      cfads: 0,
      debtService: 0,
      arusKasBersih: 0,
      arusKasInkremental: 5_000_000,
    }));
    const sched = buildFinancingSchedule({
      kebutuhanDana: 50_000_000,
      tenorBulan: 12,
      jenisSkema: "syariah",
      jenisAkad: "murabahah",
      tingkatBiayaTahunan: 10,
      basisTingkatBiaya: "flat",
    });
    // Σ inkremental = 60jt; totalImbalan = 50jt×10%×1 = 5jt; laba = 55jt; ROI = 55jt/50jt/1 = 110%
    const roi = calculateROI(cashflow, sched, 50_000_000, 12);
    expect(roi).toBeCloseTo(110, 1);
  });
});
