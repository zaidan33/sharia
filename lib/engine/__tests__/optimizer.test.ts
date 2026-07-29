/**
 * Tes Structure Optimizer (V4.1).
 */
import { describe, it, expect } from "vitest";
import { findOptimalStructure } from "../optimizer";
import { SEED_SCENARIOS } from "@/lib/seed-data";

const S1 = SEED_SCENARIOS[0];

const input = {
  pendapatanBulananAwal: S1.pendapatanBulananAwal,
  opexBulananAwal: S1.opexBulananAwal,
  pertumbuhanPendapatanTahunan: S1.pertumbuhanPendapatanTahunan,
  inflasiBiayaTahunan: S1.inflasiBiayaTahunan,
  marginKontribusiPersen: S1.marginKontribusiPersen,
  ekuitasAwal: S1.ekuitasAwal,
  kewajibanLain: S1.kewajibanLain,
  deltaPendapatanBulanan: S1.deltaPendapatanBulanan,
  deltaOpexBulanan: S1.deltaOpexBulanan,
  discountRateTahunan: S1.discountRateTahunan,
  kebutuhanDana: S1.kebutuhanDana,
  profilRisiko: S1.profilRisiko as "rendah",
  tenorMin: 12,
  tenorMax: 36,
  tenorStep: 6,
  tingkatBiayaSyariah: 7,
  tingkatBiayaKonvensional: 11,
};

describe("findOptimalStructure", () => {
  it("mengembalikan top-N terurut skor menurun", () => {
    const top = findOptimalStructure(input, 5);
    expect(top).toHaveLength(5);
    expect(top.map((c) => c.peringkat)).toEqual([1, 2, 3, 4, 5]);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].score).toBeGreaterThanOrEqual(top[i].score);
    }
  });

  it("skor di rentang [0,1]", () => {
    const top = findOptimalStructure(input, 5);
    for (const c of top) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(1);
    }
  });

  it("menjelajahi kedua skema + 3 akad syariah pada pool penuh", () => {
    const all = findOptimalStructure(input, 20); // 4 struktur x 5 tenor = 20
    expect(all).toHaveLength(20);
    const skema = new Set(all.map((c) => c.jenisSkema));
    expect(skema.has("syariah")).toBe(true);
    expect(skema.has("konvensional")).toBe(true);
    const akad = new Set(all.map((c) => c.jenisAkad));
    expect(akad.has("murabahah")).toBe(true);
    expect(akad.has("ijarah")).toBe(true);
    expect(akad.has("musyarakah_mutanaqishah")).toBe(true);
  });

  it("basisTingkatBiaya konsisten dengan akad", () => {
    const all = findOptimalStructure(input, 20);
    for (const c of all) {
      if (c.jenisAkad === "murabahah" || c.jenisAkad === "ijarah")
        expect(c.basisTingkatBiaya).toBe("flat");
      else expect(c.basisTingkatBiaya).toBe("efektif");
    }
  });

  it("tingkat biaya konvensional tinggi -> syariah dominasi peringkat atas", () => {
    const top = findOptimalStructure({ ...input, tingkatBiayaKonvensional: 30 }, 5);
    expect(top.every((c) => c.jenisSkema === "syariah")).toBe(true);
  });

  it("tidak ada NaN/Infinity pada hasil", () => {
    const all = findOptimalStructure(input, 20);
    const json = JSON.stringify(all);
    expect(json).not.toContain("NaN");
    expect(json).not.toContain("Infinity");
  });
});
