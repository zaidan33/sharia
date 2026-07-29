/**
 * Unit test proyeksi arus kas + orkestrasi computeScenario.
 */
import { describe, it, expect } from "vitest";
import { projectCashflow, VARIANT_MULTIPLIERS } from "../cashflow";
import { buildFinancingSchedule } from "../financing-cost";
import { computeScenario } from "../index";

const schedOf = (
  P: number,
  n: number,
  akad: "murabahah" | "ijarah" | "musyarakah_mutanaqishah",
  rate: number,
  basis: "flat" | "efektif",
) =>
  buildFinancingSchedule({
    kebutuhanDana: P,
    tenorBulan: n,
    jenisSkema: "syariah",
    jenisAkad: akad,
    tingkatBiayaTahunan: rate,
    basisTingkatBiaya: basis,
  });

describe("VARIANT_MULTIPLIERS (PRD §8)", () => {
  it("base/best/worst sesuai spec", () => {
    expect(VARIANT_MULTIPLIERS.base).toEqual({ pendapatan: 1.0, opex: 1.0 });
    expect(VARIANT_MULTIPLIERS.best).toEqual({ pendapatan: 1.08, opex: 0.97 });
    expect(VARIANT_MULTIPLIERS.worst).toEqual({ pendapatan: 0.9, opex: 1.05 });
  });
});

describe("projectCashflow", () => {
  const sched = schedOf(75_000_000, 18, "murabahah", 7, "flat");
  const input = {
    pendapatanBulananAwal: 40_000_000,
    opexBulananAwal: 32_000_000,
    pertumbuhanPendapatanTahunan: 5,
    inflasiBiayaTahunan: 4,
    deltaPendapatanBulanan: 7_000_000,
    deltaOpexBulanan: 2_000_000,
    tenorBulan: 18,
    debtService: sched.angsuran,
  };

  it("bulan 1 = input persis (eksponen nol)", () => {
    const base = projectCashflow(input, "base");
    expect(base[0].pendapatan).toBe(40_000_000);
    expect(base[0].opex).toBe(32_000_000);
    expect(base[0].arusKasInkremental).toBe(5_000_000);
    expect(base[0].debtService).toBe(sched.angsuran[0]);
  });

  it("pengali varian memengaruhi pendapatan/opex, BUKAN debt service", () => {
    const best = projectCashflow(input, "best");
    const worst = projectCashflow(input, "worst");
    expect(best[0].pendapatan).toBeCloseTo(40_000_000 * 1.08, 2);
    expect(worst[0].opex).toBeCloseTo(32_000_000 * 1.05, 2);
    // debt service tetap untuk semua varian
    expect(best[0].debtService).toBe(sched.angsuran[0]);
    expect(worst[0].debtService).toBe(sched.angsuran[0]);
  });

  it("pertumbuhan majemuk: bulan 2 > bulan 1", () => {
    const base = projectCashflow(input, "base");
    expect(base[1].pendapatan).toBeGreaterThan(base[0].pendapatan);
  });

  it("panjang deret = tenor", () => {
    expect(projectCashflow(input, "base").length).toBe(18);
  });
});

describe("computeScenario - smoke seed #1", () => {
  const hasil = computeScenario({
    nama: "Warung Kelontong Modern",
    jenisUsaha: "Ritel",
    tujuanPembiayaan: "Modal kerja stok",
    profilRisiko: "rendah",
    kebutuhanDana: 75_000_000,
    tenorBulan: 18,
    jenisSkema: "syariah",
    jenisAkad: "murabahah",
    tingkatBiayaTahunan: 7,
    basisTingkatBiaya: "flat",
    pendapatanBulananAwal: 40_000_000,
    opexBulananAwal: 32_000_000,
    pertumbuhanPendapatanTahunan: 5,
    inflasiBiayaTahunan: 4,
    marginKontribusiPersen: 22,
    ekuitasAwal: 25_000_000,
    kewajibanLain: 0,
    deltaPendapatanBulanan: 7_000_000,
    deltaOpexBulanan: 2_000_000,
    discountRateTahunan: 12,
  });

  it("status LAYAK dan metrik terdefinisi", () => {
    expect(hasil.status).toBe("LAYAK");
    expect(hasil.der).toBeCloseTo(3.0, 2);
    expect(hasil.varian.base.dscrRataRata).not.toBeNull();
    expect(hasil.varian.base.npv).toBeGreaterThan(0);
  });

  it("EAR dalam rentang normalisasi 10%-16%", () => {
    expect(hasil.schedule.earPersen!).toBeGreaterThan(10);
    expect(hasil.schedule.earPersen!).toBeLessThan(16);
  });

  it("varian worst punya DSCR rata-rata lebih rendah dari base", () => {
    expect(hasil.varian.worst.dscrRataRata!).toBeLessThan(
      hasil.varian.base.dscrRataRata!,
    );
  });

  it("tidak ada NaN/Infinity yang bocor", () => {
    const json = JSON.stringify(hasil);
    expect(json).not.toContain("NaN");
    expect(json).not.toContain("Infinity");
  });
});
