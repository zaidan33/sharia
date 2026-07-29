/**
 * Tes penyusun data laporan PDF (V6.5).
 */
import { describe, it, expect } from "vitest";
import { buildReportData, statusToneOf } from "../build-report-data";
import { computeScenario } from "@/lib/engine";
import { runSensitivity } from "@/lib/engine/sensitivity";
import { generateNarrative } from "@/lib/ai/narrative";
import { SEED_SCENARIOS } from "@/lib/seed-data";

const S1 = SEED_SCENARIOS[0];

function build() {
  const comp = computeScenario(S1);
  const narrative = generateNarrative(S1, comp);
  const sens = runSensitivity(S1, "npv");
  return buildReportData({
    input: S1,
    comp,
    narrative,
    sensitivitySwings: sens.swings,
    sensitivityTarget: sens.target,
    baseMetric: sens.base.npv,
    comparison: [],
    currentId: 1,
    tanggal: "30 Juli 2026",
  });
}

describe("buildReportData", () => {
  it("memetakan status -> tone", () => {
    expect(statusToneOf("LAYAK")).toBe("good");
    expect(statusToneOf("WASPADA")).toBe("watch");
    expect(statusToneOf("TIDAK_LAYAK")).toBe("bad");
  });

  it("mengisi profil (4), struktur (5), indikator (8)", () => {
    const d = build();
    expect(d.profil).toHaveLength(4);
    expect(d.struktur).toHaveLength(5);
    expect(d.indikator).toHaveLength(8);
    expect(d.profil[0].value).toBe(S1.nama);
  });

  it("S1 (LAYAK) -> status LAYAK & tone good", () => {
    const d = build();
    expect(d.status).toBe("LAYAK");
    expect(d.statusTone).toBe("good");
  });

  it("arus kas teragregasi per tahun sesuai tenor", () => {
    const d = build();
    expect(d.arusKas.years.length).toBe(Math.ceil(S1.tenorBulan / 12));
    expect(d.arusKas.years[0].tahun).toBe(1);
    expect(typeof d.arusKas.total).toBe("number");
  });

  it("sensitivitas: rows terurut swing menurun, maks 8, axis mencakup base", () => {
    const d = build();
    expect(d.sensitivitas.rows.length).toBeLessThanOrEqual(8);
    expect(d.sensitivitas.axisMin).toBeLessThanOrEqual(d.sensitivitas.baseValue);
    expect(d.sensitivitas.axisMax).toBeGreaterThanOrEqual(d.sensitivitas.baseValue);
    const swings = d.sensitivitas.rows.map((r) => r.swing);
    const sorted = [...swings].sort((a, b) => b - a);
    expect(swings).toEqual(sorted);
  });

  it("perbandingan null bila tidak ada skenario lain", () => {
    expect(build().perbandingan).toBeNull();
  });

  it("tidak ada NaN/Infinity pada seluruh data (serializable)", () => {
    const blob = JSON.stringify(build());
    expect(blob).not.toContain("NaN");
    expect(blob).not.toContain("Infinity");
  });

  it("ringkasan & simpulan terisi", () => {
    const d = build();
    expect(d.ringkasanEksekutif.length).toBeGreaterThan(20);
    expect(d.simpulan.length).toBeGreaterThan(10);
    expect(d.caveats.length).toBeGreaterThan(0);
  });
});
