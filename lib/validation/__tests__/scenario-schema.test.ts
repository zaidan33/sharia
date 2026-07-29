/**
 * Tes skema validasi (aturan gabungan) dan mappers.
 */
import { describe, it, expect } from "vitest";
import { scenarioInputSchema } from "../scenario-schema";
import { resultMetrics, toResultRow } from "@/lib/mappers";
import { computeScenario } from "@/lib/engine";

const valid = {
  nama: "Warung Kelontong Modern",
  jenisUsaha: "Ritel",
  tujuanPembiayaan: "Modal kerja stok",
  profilRisiko: "rendah" as const,
  kebutuhanDana: 75_000_000,
  tenorBulan: 18,
  jenisSkema: "syariah" as const,
  jenisAkad: "murabahah" as const,
  tingkatBiayaTahunan: 7,
  basisTingkatBiaya: "flat" as const,
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
};

describe("scenarioInputSchema", () => {
  it("menerima input valid (seed #1)", () => {
    expect(scenarioInputSchema.safeParse(valid).success).toBe(true);
  });

  it("konvensional tidak boleh memiliki jenisAkad", () => {
    const r = scenarioInputSchema.safeParse({ ...valid, jenisSkema: "konvensional", jenisAkad: "murabahah", basisTingkatBiaya: "efektif" });
    expect(r.success).toBe(false);
  });

  it("syariah wajib memiliki jenisAkad", () => {
    const r = scenarioInputSchema.safeParse({ ...valid, jenisAkad: null });
    expect(r.success).toBe(false);
  });

  it("menolak MMQ + flat", () => {
    const r = scenarioInputSchema.safeParse({ ...valid, jenisAkad: "musyarakah_mutanaqishah", basisTingkatBiaya: "flat" });
    expect(r.success).toBe(false);
  });

  it("menolak deltaOpex >= deltaPendapatan", () => {
    const r = scenarioInputSchema.safeParse({ ...valid, deltaPendapatanBulanan: 5_000_000, deltaOpexBulanan: 5_000_000 });
    expect(r.success).toBe(false);
  });

  it("menolak kebutuhanDana < 1 jt", () => {
    const r = scenarioInputSchema.safeParse({ ...valid, kebutuhanDana: 500_000 });
    expect(r.success).toBe(false);
  });

  it("menolak ekuitasAwal = 0", () => {
    const r = scenarioInputSchema.safeParse({ ...valid, ekuitasAwal: 0 });
    expect(r.success).toBe(false);
  });

  it("fieldErrors dikelompokkan per field", () => {
    const r = scenarioInputSchema.safeParse({ ...valid, jenisSkema: "konvensional", jenisAkad: "murabahah", basisTingkatBiaya: "efektif" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "jenisAkad")).toBe(true);
    }
  });
});

describe("mappers", () => {
  it("resultMetrics + toResultRow bentuknya konsisten dengan engine", () => {
    const comp = computeScenario(valid);
    const m = resultMetrics(comp);
    expect(m.status).toBe("LAYAK");
    expect(typeof m.earPersen).toBe("string");
    expect(Number(m.earPersen)).toBeGreaterThan(10);
    const row = toResultRow(42, comp);
    expect(row.scenarioId).toBe(42);
    expect(row.status).toBe("LAYAK");
  });
});
