/**
 * Tes Assumption Calibration (V4.3).
 */
import { describe, it, expect } from "vitest";
import { calibrate } from "../calibrator";

describe("calibrate", () => {
  it("mengembalikan 3 asumsi dengan key yang benar", () => {
    const c = calibrate("Ritel");
    expect(c).toHaveLength(3);
    expect(c.map((a) => a.key)).toEqual([
      "pertumbuhanPendapatanTahunan",
      "inflasiBiayaTahunan",
      "marginKontribusiPersen",
    ]);
  });

  it("suggested berada dalam rentang [low, high]", () => {
    const c = calibrate("Manufaktur");
    for (const a of c) {
      expect(a.low).toBeLessThanOrEqual(a.suggested);
      expect(a.suggested).toBeLessThanOrEqual(a.high);
    }
  });

  it("median sektor Ritel wajar (pertumbuhan ~6, margin ~17,5)", () => {
    const c = calibrate("Ritel");
    const byKey = Object.fromEntries(c.map((a) => [a.key, a]));
    expect(byKey.pertumbuhanPendapatanTahunan.suggested).toBeCloseTo(6, 0);
    expect(byKey.marginKontribusiPersen.suggested).toBeCloseTo(17.5, 0);
    expect(byKey.pertumbuhanPendapatanTahunan.reference).toContain("Ritel");
  });

  it("sektor berbeda -> saran berbeda (Kesehatan margin > Ritel)", () => {
    const r = Object.fromEntries(calibrate("Ritel").map((a) => [a.key, a]));
    const k = Object.fromEntries(calibrate("Kesehatan").map((a) => [a.key, a]));
    expect(k.marginKontribusiPersen.suggested).toBeGreaterThan(
      r.marginKontribusiPersen.suggested,
    );
  });

  it("sektor tak dikenal -> fallback lintas sektor", () => {
    const c = calibrate("Lainnya");
    expect(c).toHaveLength(3);
    expect(c[0].reference).toContain("lintas sektor");
  });

  it("amount memicu penyempurnaan skala saat cukup kasus serupa", () => {
    // Lainnya -> pool lintas sektor; band ±50% sekitar 300 jt mencakup >3 kasus.
    const c = calibrate("Lainnya", 300_000_000, 0);
    expect(c[0].reference).toContain("serupa");
  });

  it("tidak ada NaN/Infinity", () => {
    const c = calibrate("Ritel", 100_000_000, 24);
    const json = JSON.stringify(c);
    expect(json).not.toContain("NaN");
    expect(json).not.toContain("Infinity");
  });
});
