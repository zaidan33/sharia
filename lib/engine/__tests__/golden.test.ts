/**
 * Vektor uji acuan - IMPLEMENTATION_PLAN §7.1 (jadwal) dan §7.2 (NPV/IRR).
 * Toleransi: ±Rp1 untuk uang, ±0,0001 untuk tingkat dan rasio.
 */
import { describe, it, expect } from "vitest";
import { buildFinancingSchedule } from "../financing-cost";
import { monthlyFromEffectiveAnnual, effectiveAnnualFromMonthly } from "../rate-conversion";
import { solveMonthlyIRR } from "../numeric";
import { calculateNPV, calculateIRR } from "../valuation";
import type { CashflowPeriod } from "../cashflow";

const money = (a: number, e: number) => Math.abs(a - e) <= 1;
const rate = (a: number, e: number) => Math.abs(a - e) <= 0.0001;

const P = 100_000_000;
const n = 24;

const cfConstant = (val: number, count: number): CashflowPeriod[] =>
  Array.from({ length: count }, () => ({
    bulan: 0,
    pendapatan: 0,
    opex: 0,
    capex: 0,
    cfads: 0,
    debtService: 0,
    arusKasBersih: 0,
    arusKasInkremental: val,
  }));

describe("§7.1 jadwal pembiayaan (P 100jt, n 24)", () => {
  it("anuitas konvensional 12% efektif", () => {
    const s = buildFinancingSchedule({
      kebutuhanDana: P,
      tenorBulan: n,
      jenisSkema: "konvensional",
      jenisAkad: null,
      tingkatBiayaTahunan: 12,
      basisTingkatBiaya: "efektif",
    });
    expect(money(s.angsuran[0], 4_707_347.22)).toBe(true);
    expect(money(s.angsuran[n - 1], 4_707_347.22)).toBe(true);
    expect(money(s.totalPembayaran, 112_976_333.34)).toBe(true);
    expect(rate(s.earPersen!, 12.6825)).toBe(true);
  });

  it("murabahah 8% flat", () => {
    const s = buildFinancingSchedule({
      kebutuhanDana: P,
      tenorBulan: n,
      jenisSkema: "syariah",
      jenisAkad: "murabahah",
      tingkatBiayaTahunan: 8,
      basisTingkatBiaya: "flat",
    });
    expect(money(s.angsuran[0], 4_833_333.33)).toBe(true);
    expect(money(s.totalPembayaran, 116_000_000.0)).toBe(true);
    expect(s.porsiPokok[0]).toBeGreaterThan(0);
    expect(s.totalImbalan).toBeGreaterThan(0);
  });

  it("musyarakah mutanaqishah 12% efektif (angsuran menurun)", () => {
    const s = buildFinancingSchedule({
      kebutuhanDana: P,
      tenorBulan: n,
      jenisSkema: "syariah",
      jenisAkad: "musyarakah_mutanaqishah",
      tingkatBiayaTahunan: 12,
      basisTingkatBiaya: "efektif",
    });
    expect(money(s.angsuran[0], 5_166_666.67)).toBe(true);
    expect(money(s.angsuran[n - 1], 4_208_333.33)).toBe(true);
    expect(money(s.totalPembayaran, 112_500_000.0)).toBe(true);
    expect(rate(s.earPersen!, 12.6825)).toBe(true);
  });

  it("intisari produk: 8% flat lebih mahal daripada 12% efektif setelah dinormalkan", () => {
    const flat = buildFinancingSchedule({
      kebutuhanDana: P,
      tenorBulan: n,
      jenisSkema: "syariah",
      jenisAkad: "murabahah",
      tingkatBiayaTahunan: 8,
      basisTingkatBiaya: "flat",
    });
    const eff = buildFinancingSchedule({
      kebutuhanDana: P,
      tenorBulan: n,
      jenisSkema: "konvensional",
      jenisAkad: null,
      tingkatBiayaTahunan: 12,
      basisTingkatBiaya: "efektif",
    });
    expect(flat.earPersen!).toBeGreaterThan(eff.earPersen!);
  });

  it("MMQ + flat ditolak engine (validasi juga menolak)", () => {
    expect(() =>
      buildFinancingSchedule({
        kebutuhanDana: P,
        tenorBulan: n,
        jenisSkema: "syariah",
        jenisAkad: "musyarakah_mutanaqishah",
        tingkatBiayaTahunan: 12,
        basisTingkatBiaya: "flat",
      }),
    ).toThrow();
  });
});

describe("§7.2 NPV & IRR ([-100jt, 10jt × 12], discount 12%)", () => {
  const cf = cfConstant(10_000_000, 12);
  const fullCf = [-100_000_000, ...Array(12).fill(10_000_000)];

  it("r_m bulanan dari 12% tahunan = 0,0094887929", () => {
    expect(rate(monthlyFromEffectiveAnnual(12), 0.0094887929)).toBe(true);
  });

  it("NPV = 12.915.159,90", () => {
    expect(money(calculateNPV(cf, 12, 100_000_000), 12_915_159.9)).toBe(true);
  });

  it("IRR bulanan = 0,0292285408", () => {
    expect(rate(solveMonthlyIRR(fullCf)!, 0.0292285408)).toBe(true);
  });

  it("IRR tahunan = (1+IRR_m)^12 - 1 (≈41,30%; dokumen mencetak 41,2999%)", () => {
    const r = calculateIRR(cf, 100_000_000);
    // IRR_a mengikuti definisi dari IRR_m (bukan angka cetak dokumen yang dibulatkan).
    expect(rate(r.irrTahunanPersen!, effectiveAnnualFromMonthly(0.0292285408))).toBe(true);
    expect(r.irrTahunanPersen!).toBeGreaterThan(41.2);
    expect(r.irrTahunanPersen!).toBeLessThan(41.4);
    expect(r.unik).toBe(true);
  });
});
