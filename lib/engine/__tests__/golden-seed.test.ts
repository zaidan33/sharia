/**
 * golden-seed - mencocokkan 20 baris §7.3.
 *
 * Tabel §7.3 dicetak dengan pembulatan tampilan (EAR 2 desimal, DSCR 2 desimal,
 * NPV dalam jt bulat, IRR/ROI 1 desimal, BEP bulat). Toleransi uji mengikuti
 * presisi tampilan tersebut. Engine sendiri presisi penuh; selisih nyata jauh
 * lebih kecil dari toleransi ini bila rumus benar.
 */
import { describe, it, expect } from "vitest";
import { computeScenario } from "@/lib/engine";
import { SEED_SCENARIOS, SEED_EXPECTED } from "@/lib/seed-data";

const close = (a: number, b: number, digits: number) =>
  expect(Number(a.toFixed(10))).toBeCloseTo(b, digits);

describe("§7.3 hasil acuan 20 kasus seed (varian base, discount 12%)", () => {
  SEED_SCENARIOS.forEach((input, i) => {
    const e = SEED_EXPECTED[i];
    it(`#${i + 1} ${input.nama}`, () => {
      const c = computeScenario(input);
      close(c.schedule.earPersen!, e.ear, 1);
      close(c.schedule.angsuran[0] / 1e6, e.angsuran1Jt, 1);
      close(c.varian.base.dscrRataRata!, e.dscrAvg, 1);
      close(c.varian.worst.dscrRataRata!, e.dscrWorst, 1);
      expect(Math.abs(Math.round(c.varian.base.npv / 1e6) - e.npvJt)).toBeLessThanOrEqual(1);
      close(c.varian.base.irr.irrTahunanPersen!, e.irr, 0);
      close(c.der!, e.der, 1);
      close(c.roiTahunanPersen, e.roi, 0);
      expect(Math.abs(Math.round(c.breakEven.persenDariOmzet) - e.bep)).toBeLessThanOrEqual(1);
      expect(c.status).toBe(e.status);
    });
  });
});

describe("§14 distribusi hasil", () => {
  const hasil = SEED_SCENARIOS.map((s) => computeScenario(s));

  it("seluruh EAR dalam rentang normalisasi 10%-16%", () => {
    for (const h of hasil) {
      expect(h.schedule.earPersen).not.toBeNull();
      expect(h.schedule.earPersen!).toBeGreaterThanOrEqual(10);
      expect(h.schedule.earPersen!).toBeLessThanOrEqual(16);
    }
  });

  it("kasus risiko tinggi (#4, #14, #20) tidak berstatus LAYAK", () => {
    expect(hasil[3].status).not.toBe("LAYAK");
    expect(hasil[13].status).not.toBe("LAYAK");
    expect(hasil[19].status).not.toBe("LAYAK");
  });

  it("kasus risiko rendah tidak ada yang TIDAK_LAYAK", () => {
    SEED_SCENARIOS.forEach((s, i) => {
      if (s.profilRisiko === "rendah") {
        expect(hasil[i].status).not.toBe("TIDAK_LAYAK");
      }
    });
  });

  it("tidak ada NaN/Infinity pada seluruh hasil", () => {
    const json = JSON.stringify(hasil);
    expect(json).not.toContain("NaN");
    expect(json).not.toContain("Infinity");
  });
});
