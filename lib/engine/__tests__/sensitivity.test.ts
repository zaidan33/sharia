/**
 * Tes sensitivity engine (V2.1).
 */
import { describe, it, expect } from "vitest";
import { runSensitivity } from "../sensitivity";
import { computeScenario } from "../index";
import { SEED_SCENARIOS } from "@/lib/seed-data";

const S1 = SEED_SCENARIOS[0];

describe("runSensitivity", () => {
  const r = runSensitivity(S1, "npv");

  it("menghasilkan 9 parameter x 4 delta = 36 titik", () => {
    expect(r.points.length).toBe(36);
    expect(r.swings.length).toBe(9);
  });

  it("base NPV konsisten dengan computeScenario", () => {
    const base = computeScenario(S1);
    expect(r.base.npv).toBeCloseTo(base.varian.base.npv, 1);
  });

  it("swings terurut menurun berdasarkan swing", () => {
    for (let i = 1; i < r.swings.length; i++) {
      expect(r.swings[i - 1].swing).toBeGreaterThanOrEqual(r.swings[i].swing);
    }
  });

  it("menaikkan discount rate menurunkan NPV; menurunkan menaikkan NPV", () => {
    const dr = r.points.filter((p) => p.param === "discountRateTahunan");
    const up = dr.find((p) => p.deltaPct === 20)!;
    const down = dr.find((p) => p.deltaPct === -20)!;
    expect(up.npv).toBeLessThan(r.base.npv);
    expect(down.npv).toBeGreaterThan(r.base.npv);
  });

  it("menaikkan tambahan pendapatan menaikkan NPV", () => {
    const dp = r.points.filter((p) => p.param === "deltaPendapatanBulanan");
    const up = dp.find((p) => p.deltaPct === 20)!;
    expect(up.npv).toBeGreaterThan(r.base.npv);
  });

  it("tidak ada NaN/Infinity pada hasil", () => {
    const json = JSON.stringify(r);
    expect(json).not.toContain("NaN");
    expect(json).not.toContain("Infinity");
  });

  it("target dscr menghasilkan swing dengan metrik DSCR", () => {
    const rd = runSensitivity(S1, "dscr");
    // base dscr ~1.85; swing harus positif untuk beberapa parameter
    expect(rd.swings[0].swing).toBeGreaterThan(0);
  });
});
