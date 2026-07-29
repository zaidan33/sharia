/**
 * Tes Monte Carlo engine (V3.1).
 */
import { describe, it, expect } from "vitest";
import { runMonteCarlo } from "../monte-carlo";
import { computeScenario } from "../index";
import { SEED_SCENARIOS } from "@/lib/seed-data";

const S1 = SEED_SCENARIOS[0];

describe("runMonteCarlo", () => {
  it("deterministik: seed sama -> hasil sama", () => {
    const a = runMonteCarlo(S1, { iterations: 200, seed: 42 });
    const b = runMonteCarlo(S1, { iterations: 200, seed: 42 });
    expect(a.npv.percentiles.p50).toBe(b.npv.percentiles.p50);
    expect(a.npv.histogram).toEqual(b.npv.histogram);
  });

  it("menghormati jumlah iterasi", () => {
    const r = runMonteCarlo(S1, { iterations: 500 });
    expect(r.iterations).toBe(500);
    // total hitungan histogram = iterasi
    const total = r.npv.histogram.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(500);
  });

  it("percentile terurut naik p5 <= p25 <= p50 <= p75 <= p95", () => {
    const r = runMonteCarlo(S1, { iterations: 1000 });
    const p = r.npv.percentiles;
    expect(p.p5).toBeLessThanOrEqual(p.p25);
    expect(p.p25).toBeLessThanOrEqual(p.p50);
    expect(p.p50).toBeLessThanOrEqual(p.p75);
    expect(p.p75).toBeLessThanOrEqual(p.p95);
  });

  it("NPV base (di μ) jatuh di rentang [p5, p95]", () => {
    const r = runMonteCarlo(S1, { iterations: 1000 });
    const base = computeScenario(S1).varian.base.npv;
    expect(base).toBeGreaterThanOrEqual(r.npv.percentiles.p5);
    expect(base).toBeLessThanOrEqual(r.npv.percentiles.p95);
  });

  it("probabilitas antara 0 dan 1", () => {
    const r = runMonteCarlo(S1, { iterations: 800 });
    expect(r.probNpvNegatif).toBeGreaterThanOrEqual(0);
    expect(r.probNpvNegatif).toBeLessThanOrEqual(1);
    expect(r.probDscrKurangDari1).toBeGreaterThanOrEqual(0);
    expect(r.probDscrKurangDari1).toBeLessThanOrEqual(1);
  });

  it("DSCR validSamples > 0 untuk skenario dengan debt service", () => {
    const r = runMonteCarlo(S1, { iterations: 300 });
    expect(r.dscr.validSamples).toBeGreaterThan(0);
    expect(r.dscr.percentiles).not.toBeNull();
  });

  it("tidak ada NaN/Infinity pada hasil", () => {
    const r = runMonteCarlo(S1, { iterations: 300 });
    const json = JSON.stringify(r);
    expect(json).not.toContain("NaN");
    expect(json).not.toContain("Infinity");
  });

  it("volatilitas eksplisit menyesuaikan lebar distribusi", () => {
    const kecil = runMonteCarlo(S1, {
      iterations: 1000,
      volPertumbuhanPendapatan: 0.5,
      volInflasiBiaya: 0.5,
    });
    const besar = runMonteCarlo(S1, {
      iterations: 1000,
      volPertumbuhanPendapatan: 15,
      volInflasiBiaya: 15,
    });
    // rentang (p95 - p5) lebih lebar saat volatilitas besar
    const lebarKecil = kecil.npv.percentiles.p95 - kecil.npv.percentiles.p5;
    const lebarBesar = besar.npv.percentiles.p95 - besar.npv.percentiles.p5;
    expect(lebarBesar).toBeGreaterThan(lebarKecil);
  });
});
