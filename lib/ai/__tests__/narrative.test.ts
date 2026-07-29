/**
 * Tes Narrative Generation Agent (V5.1).
 */
import { describe, it, expect } from "vitest";
import { generateNarrative } from "../narrative";
import { computeScenario, type ScenarioInput } from "@/lib/engine";
import { SEED_SCENARIOS } from "@/lib/seed-data";

const S1 = SEED_SCENARIOS[0];

describe("generateNarrative", () => {
  const comp = computeScenario(S1);
  const n = generateNarrative(S1, comp);

  it("semua bagian terisi (non-empty)", () => {
    expect(n.profil.length).toBeGreaterThan(20);
    expect(n.kelayakan.length).toBeGreaterThan(20);
    expect(n.rekomendasi.length).toBeGreaterThan(10);
    expect(n.full.length).toBeGreaterThan(n.profil.length);
  });

  it("profil memuat nama, akad, dan tenor", () => {
    expect(n.profil).toContain(S1.nama);
    expect(n.profil).toContain(`${S1.tenorBulan} bulan`);
    // S1 syariah murabahah -> label "murabahah"
    expect(n.profil.toLowerCase()).toContain("murabahah");
  });

  it("metrics punya 4 paragraf (ear, dscr, npv, irr)", () => {
    for (const k of ["ear", "dscr", "npv", "irr"] as const) {
      expect(n.metrics[k].length).toBeGreaterThan(15);
    }
  });

  it("status LAYAK (S1) -> rekomendasi 'lanjutkan'", () => {
    expect(comp.status).toBe("LAYAK");
    expect(n.rekomendasi.toLowerCase()).toContain("lanjutkan");
  });

  it("NPV positif (S1) -> paragraf npv menyebut POSITIF", () => {
    expect(comp.varian.base.npv).toBeGreaterThan(0);
    expect(n.metrics.npv).toContain("POSITIF");
  });

  it("status TIDAK_LAYAK -> rekomendasi 'pertimbangkan ulang'", () => {
    // Bangun input yang jelas tidak layak: DSCR rata-rata < 1.
    const bad: ScenarioInput = {
      ...S1,
      deltaPendapatanBulanan: 100_000, // arus kas inkremental sangat kecil
      deltaOpexBulanan: 50_000,
      kebutuhanDana: 200_000_000,
      tenorBulan: 12,
    };
    const badComp = computeScenario(bad);
    if (badComp.status === "TIDAK_LAYAK") {
      const nb = generateNarrative(bad, badComp);
      expect(nb.rekomendasi.toLowerCase()).toContain("pertimbangkan ulang");
    }
  });

  it("tidak memuat em dash / en dash / NaN", () => {
    const blob = n.full;
    expect(blob).not.toContain("—"); // em dash
    expect(blob).not.toContain("–"); // en dash
    expect(blob).not.toContain("NaN");
    expect(blob).not.toContain("Infinity");
  });
});
