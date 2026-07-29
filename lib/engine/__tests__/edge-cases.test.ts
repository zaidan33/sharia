/**
 * Kasus batas PRD §10 - dipastikan tidak memunculkan NaN/Infinity.
 */
import { describe, it, expect } from "vitest";
import { computeScenario } from "../index";
import { calculateIRR } from "../valuation";
import { effectiveAnnualRateOfSchedule } from "../rate-conversion";
import type { CashflowPeriod } from "../cashflow";

const period = (inkremental: number): CashflowPeriod => ({
  bulan: 0,
  pendapatan: 0,
  opex: 0,
  capex: 0,
  cfads: 0,
  debtService: 0,
  arusKasBersih: 0,
  arusKasInkremental: inkremental,
});

describe("kasus batas §10", () => {
  it("debt service = 0 (pokok 0 & tingkat 0) -> DSCR & EAR null, tanpa NaN/Infinity", () => {
    const r = computeScenario({
      nama: "x",
      jenisUsaha: "x",
      tujuanPembiayaan: "x",
      profilRisiko: "rendah",
      kebutuhanDana: 0,
      tenorBulan: 12,
      jenisSkema: "syariah",
      jenisAkad: "murabahah",
      tingkatBiayaTahunan: 0,
      basisTingkatBiaya: "flat",
      pendapatanBulananAwal: 40_000_000,
      opexBulananAwal: 30_000_000,
      pertumbuhanPendapatanTahunan: 5,
      inflasiBiayaTahunan: 4,
      marginKontribusiPersen: 30,
      ekuitasAwal: 25_000_000,
      kewajibanLain: 0,
      deltaPendapatanBulanan: 7_000_000,
      deltaOpexBulanan: 2_000_000,
      discountRateTahunan: 12,
    });
    expect(r.varian.base.dscrRataRata).toBeNull();
    expect(r.varian.base.dscrMinimum).toBeNull();
    expect(r.schedule.earPersen).toBeNull();
    const json = JSON.stringify(r);
    expect(json).not.toContain("NaN");
    expect(json).not.toContain("Infinity");
  });

  it("seluruh arus kas inkremental negatif -> IRR null (tak terdefinisi)", () => {
    const cf = [period(-1_000_000), period(-1_000_000), period(-1_000_000)];
    const r = calculateIRR(cf, 100_000_000);
    // [-inv, -, -, -] tidak ada perubahan tanda -> IRR null
    expect(r.irrTahunanPersen).toBeNull();
  });

  it("jadwal seluruh nol -> EAR null", () => {
    expect(effectiveAnnualRateOfSchedule(0, [0, 0, 0])).toBeNull();
  });
});
