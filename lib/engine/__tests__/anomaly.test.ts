/**
 * Tes Anomaly Detection (V3.2).
 */
import { describe, it, expect } from "vitest";
import { detectAnomalies } from "../anomaly";
import { SEED_SCENARIOS } from "@/lib/seed-data";

const S1 = SEED_SCENARIOS[0]; // Ritel

// Input "normal" = semua metrik tepat di median sektor Ritel (seed V6).
const normalRitel = {
  ...S1,
  pendapatanBulananAwal: 57_500_000,
  opexBulananAwal: 47_500_000,
  tingkatBiayaTahunan: 9.5,
  pertumbuhanPendapatanTahunan: 6,
  marginKontribusiPersen: 17.5,
  tenorBulan: 21,
};

describe("detectAnomalies", () => {
  it("kasus normal (di median sektor) -> tidak ada peringatan", () => {
    expect(detectAnomalies(normalRitel)).toHaveLength(0);
  });

  it("pendapatan sangat rendah -> peringatan 'lebih rendah' sektor", () => {
    const w = detectAnomalies({ ...normalRitel, pendapatanBulananAwal: 1_000_000 });
    const p = w.find((x) => x.metric === "Pendapatan bulanan");
    expect(p).toBeDefined();
    expect(p!.message).toContain("lebih rendah");
    expect(p!.message).toContain("sektor Ritel");
    expect(p!.level === "watch" || p!.level === "risk").toBe(true);
  });

  it("tingkat biaya sangat tinggi -> peringatan 'lebih tinggi'", () => {
    const w = detectAnomalies({ ...normalRitel, tingkatBiayaTahunan: 50 });
    const t = w.find((x) => x.metric === "Tingkat biaya tahunan");
    expect(t).toBeDefined();
    expect(t!.message).toContain("lebih tinggi");
  });

  it("opex ekstrem -> peringatan 'lebih tinggi'", () => {
    const w = detectAnomalies({ ...normalRitel, opexBulananAwal: 1_000_000_000 });
    const o = w.find((x) => x.metric === "Opex bulanan");
    expect(o).toBeDefined();
    expect(o!.message).toContain("lebih tinggi");
  });

  it("opex > pendapatan -> peringatan struktural level risk", () => {
    const w = detectAnomalies({ ...normalRitel, opexBulananAwal: 200_000_000 });
    const o = w.find((x) => x.metric === "Opex > pendapatan");
    expect(o).toBeDefined();
    expect(o!.level).toBe("risk");
  });

  it("asumsi pertumbuhan optimis ekstrem -> peringatan info", () => {
    const w = detectAnomalies({ ...normalRitel, pertumbuhanPendapatanTahunan: 40 });
    const p = w.find((x) => x.metric === "Asumsi pertumbuhan pendapatan");
    expect(p).toBeDefined();
    expect(p!.level).toBe("info");
    expect(p!.message).toContain("lebih tinggi");
  });

  it("sektor tanpa acuan seed -> fallback 'lintas sektor'", () => {
    const w = detectAnomalies({
      ...normalRitel,
      jenisUsaha: "Lainnya",
      pendapatanBulananAwal: 1_000_000,
    });
    expect(w.some((x) => x.message.includes("lintas sektor"))).toBe(true);
  });

  it("tidak ada NaN pada pesan; level selalu valid", () => {
    const cases = [
      detectAnomalies(normalRitel),
      detectAnomalies({ ...normalRitel, pendapatanBulananAwal: 1_000_000 }),
      detectAnomalies({ ...normalRitel, tingkatBiayaTahunan: 50 }),
      detectAnomalies({ ...normalRitel, opexBulananAwal: 50_000_000 }),
    ];
    for (const w of cases) {
      for (const item of w) {
        expect(item.message).not.toContain("NaN");
        expect(["info", "watch", "risk"]).toContain(item.level);
      }
    }
  });
});
