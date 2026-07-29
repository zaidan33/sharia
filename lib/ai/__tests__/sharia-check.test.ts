/**
 * Tes Sharia Reasoning Agent (V5.3).
 */
import { describe, it, expect } from "vitest";
import { checkShariaCompliance, isDpsConfirmed } from "../sharia-check";
import { computeScenario, type ScenarioInput } from "@/lib/engine";
import { SEED_SCENARIOS } from "@/lib/seed-data";

const S1 = SEED_SCENARIOS[0]; // murabahah flat 7% -> SYARIAH

function check(over: Partial<ScenarioInput>) {
  const input = { ...S1, ...over };
  return checkShariaCompliance(input, computeScenario(input));
}

describe("checkShariaCompliance", () => {
  it("murabahah flat -> SYARIAH + checklist murabahah", () => {
    const r = check({});
    expect(r.status).toBe("SYARIAH");
    expect(r.findings.some((f) => f.level === "ok" && f.rule === "Basis murabahah")).toBe(true);
    expect(r.dpsChecklist.some((d) => d.id === "barang_pokok")).toBe(true);
  });

  it("murabahah efektif -> TIDAK_SESUI (violation)", () => {
    const r = check({ basisTingkatBiaya: "efektif" });
    expect(r.status).toBe("TIDAK_SESUI");
    expect(r.findings.some((f) => f.level === "violation" && f.rule === "Basis murabahah")).toBe(true);
  });

  it("ijarah flat -> SYARIAH; ijarah efektif -> TIDAK_SESUI", () => {
    expect(check({ jenisAkad: "ijarah", basisTingkatBiaya: "flat" }).status).toBe("SYARIAH");
    expect(check({ jenisAkad: "ijarah", basisTingkatBiaya: "efektif" }).status).toBe("TIDAK_SESUI");
  });

  it("MMQ efektif -> SYARIAH", () => {
    expect(check({ jenisAkad: "musyarakah_mutanaqishah", basisTingkatBiaya: "efektif" }).status).toBe("SYARIAH");
  });

  it("MMQ flat -> TIDAK_SESUI (cabang defensif; input MMQ+flat ditolak engine)", () => {
    // MMQ+flat ditolak di buildFinancingSchedule, jadi comp tak pernah ada di
    // alur normal. Uji cabang defensif dengan comp mock (hanya earPersen dipakai).
    const r = checkShariaCompliance(
      { ...S1, jenisAkad: "musyarakah_mutanaqishah", basisTingkatBiaya: "flat" },
      { schedule: { earPersen: 10 } } as unknown as Parameters<typeof checkShariaCompliance>[1],
    );
    expect(r.status).toBe("TIDAK_SESUI");
  });

  it("konvensional -> TIDAK_SESUI + checklist kosong", () => {
    const r = check({ jenisSkema: "konvensional", jenisAkad: null, basisTingkatBiaya: "efektif" });
    expect(r.status).toBe("TIDAK_SESUI");
    expect(r.dpsChecklist).toHaveLength(0);
    expect(r.findings.some((f) => f.level === "violation" && f.rule === "Skema")).toBe(true);
  });

  it("EAR > 20% -> PERLU_KONFIRMASI_DPS (peringatan riba)", () => {
    const input = { ...S1, tingkatBiayaTahunan: 50 };
    const comp = computeScenario(input);
    const ear = comp.schedule.earPersen;
    expect(ear).not.toBeNull();
    expect(ear as number).toBeGreaterThan(20);
    const r = checkShariaCompliance(input, comp);
    expect(r.status).toBe("PERLU_KONFIRMASI_DPS");
    expect(r.findings.some((f) => f.level === "warning" && f.rule === "Batas riba")).toBe(true);
  });

  it("konvensional dengan EAR tinggi tetap TIDAK_SESUI (skema dominan)", () => {
    const r = check({ jenisSkema: "konvensional", jenisAkad: null, basisTingkatBiaya: "efektif", tingkatBiayaTahunan: 50 });
    expect(r.status).toBe("TIDAK_SESUI");
  });

  it("tidak ada NaN/Infinity; setiap finding punya level valid", () => {
    const cases = [
      check({}),
      check({ basisTingkatBiaya: "efektif" }),
      check({ jenisSkema: "konvensional", jenisAkad: null, basisTingkatBiaya: "efektif" }),
    ];
    for (const r of cases) {
      const blob = JSON.stringify(r);
      expect(blob).not.toContain("NaN");
      expect(blob).not.toContain("Infinity");
      for (const f of r.findings) expect(["ok", "warning", "violation"]).toContain(f.level);
    }
  });
});

describe("isDpsConfirmed", () => {
  it("semua tercentang -> true", () => {
    expect(isDpsConfirmed([{ id: "a", label: "x", checked: true }, { id: "b", label: "y", checked: true }])).toBe(true);
  });
  it("ada yang belum -> false", () => {
    expect(isDpsConfirmed([{ id: "a", label: "x", checked: true }, { id: "b", label: "y", checked: false }])).toBe(false);
  });
  it("kosong -> false", () => {
    expect(isDpsConfirmed([])).toBe(false);
  });
});
