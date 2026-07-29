/**
 * Tes valuasi NPV/IRR/terminal value (§6.5 + V2.3).
 */
import { describe, it, expect } from "vitest";
import { calculateNPV, calculateTerminalValue } from "../valuation";
import type { CashflowPeriod } from "../cashflow";

function periods12(value: number): CashflowPeriod[] {
  return Array.from({ length: 12 }, (_, i) => ({
    bulan: i + 1,
    pendapatan: 0,
    opex: 0,
    capex: 0,
    cfads: 0,
    debtService: 0,
    arusKasBersih: 0,
    arusKasInkremental: value,
  }));
}

describe("calculateNPV", () => {
  it("-pokok + PV arus kas inkremental", () => {
    const cf = periods12(10_000_000);
    // r_m = 1.1^(1/12)-1 ; NPV = -50jt + Σ 10jt/(1+r_m)^t
    const npv = calculateNPV(cf, 10, 50_000_000);
    expect(npv).toBeLessThan(10_000_000 * 12 - 50_000_000); // diskonto menurunkan
    expect(npv).toBeGreaterThan(0);
  });
});

describe("calculateTerminalValue", () => {
  it("semua null bila g tidak diisi", () => {
    const r = calculateTerminalValue(periods12(10_000_000), 10, null);
    expect(r.terminalValue).toBeNull();
    expect(r.pvTerminal).toBeNull();
    expect(r.pertumbuhanTerminal).toBeNull();
    // undefined sama dengan null (nonaktif)
    const r2 = calculateTerminalValue(periods12(10_000_000), 10, undefined);
    expect(r2.terminalValue).toBeNull();
  });

  it("null tv/pv bila g >= r (Gordon tak terdefinisi)", () => {
    // g=15%, r=10% -> r-g negatif
    const r = calculateTerminalValue(periods12(10_000_000), 10, 15);
    expect(r.terminalValue).toBeNull();
    expect(r.pvTerminal).toBeNull();
    expect(r.pertumbuhanTerminal).toBeCloseTo(0.15, 6);
  });

  it("hitung TV & PV sesuai rumus Gordon", () => {
    // 12 periode @ 10jt; g=2%, r=10%.
    const cf = periods12(10_000_000);
    const r = calculateTerminalValue(cf, 10, 2);
    // cfLastYear = (120jt * 12)/12 = 120jt
    // tv = 120jt * 1,02 / 0,08 = 1.530.000.000
    // nYears = 12/12 = 1 -> pv = tv / 1,1 = 1.390.909.090,9...
    expect(r.terminalValue).toBeCloseTo(1_530_000_000, -2);
    expect(r.pvTerminal).toBeCloseTo(1_530_000_000 / 1.1, -2);
    expect(r.pertumbuhanTerminal).toBeCloseTo(0.02, 6);
  });

  it("hon horizon > 1 tahun mendiskon PV lebih dalam", () => {
    // 24 periode @ 10jt; g=2%, r=10%.
    const cf = Array.from({ length: 24 }, (_, i) => ({
      ...periods12(10_000_000)[0],
      bulan: i + 1,
    }));
    const r = calculateTerminalValue(cf, 10, 2);
    // tv sama (run-rate 12 bulan terakhir tetap 120jt/th), tapi pv / 1,1^2
    expect(r.terminalValue).toBeCloseTo(1_530_000_000, -2);
    expect(r.pvTerminal).toBeCloseTo(1_530_000_000 / 1.21, -2);
  });

  it("tidak menghasilkan NaN/Infinity", () => {
    const r = calculateTerminalValue(periods12(10_000_000), 10, 2);
    const json = JSON.stringify(r);
    expect(json).not.toContain("NaN");
    expect(json).not.toContain("Infinity");
  });
});
