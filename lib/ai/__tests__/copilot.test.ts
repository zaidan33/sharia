/**
 * Tes Conversational Copilot (V5.2).
 */
import { describe, it, expect } from "vitest";
import { answerCopilot, type ScenarioContext } from "../copilot";

const CTX: ScenarioContext[] = [
  { id: 1, nama: "Toko Makmur", skemaLabel: "Murabahah", status: "LAYAK", earPersen: 7.2, dscrRataRata: 1.8, dscrMinimum: 1.4, npv: 10_000_000, irrPersen: 25 },
  { id: 2, nama: "Kedai Kopi", skemaLabel: "Konvensional", status: "WASPADA", earPersen: 13.5, dscrRataRata: 1.1, dscrMinimum: 0.9, npv: -2_000_000, irrPersen: null },
  { id: 3, nama: "Bengkel Jaya", skemaLabel: "Murabahah", status: "LAYAK", earPersen: 8.0, dscrRataRata: 2.0, dscrMinimum: 1.6, npv: 15_000_000, irrPersen: 30 },
  { id: 4, nama: "Investasi Ragu", skemaLabel: "Konvensional", status: "WASPADA", earPersen: 5.0, dscrRataRata: 1.05, dscrMinimum: 0.95, npv: 1_000_000, irrPersen: 10 },
];

describe("answerCopilot", () => {
  it("perbandingan dua skenario -> intent comparison + side-by-side", () => {
    const a = answerCopilot("Bagaimana perbandingan Toko Makmur dan Kedai Kopi?", CTX);
    expect(a.intent).toBe("comparison");
    expect(a.comparison).toHaveLength(2);
    expect(a.text).toContain("EAR");
    expect(a.text).toContain("Toko Makmur");
    expect(a.text).toContain("Kedai Kopi");
  });

  it("risiko -> menyorot DSCR < 1 dan NPV negatif", () => {
    const a = answerCopilot("Apa risiko Kedai Kopi?", CTX);
    expect(a.intent).toBe("risk");
    expect(a.text).toContain("RISIKO TINGGI");
    expect(a.text).toContain("NPV negatif");
  });

  it("risiko skenario sehat -> tidak ada risiko mencolok", () => {
    const a = answerCopilot("Apa risiko Bengkel Jaya?", CTX);
    expect(a.intent).toBe("risk");
    expect(a.text).toContain("tidak ada risiko mencolok");
  });

  it("rekomendasi -> pilih LAYAK dengan EAR terendah (bukan WASPADA EAR lebih rendah)", () => {
    const a = answerCopilot("Mana rekomendasi terbaik?", CTX);
    expect(a.intent).toBe("recommendation");
    // LAYAK: Toko Makmur (7,2) & Bengkel Jaya (8,0). Investasi Ragu WASPADA 5,0 diabaikan.
    expect(a.text).toContain("Rekomendasi: Toko Makmur");
    expect(a.text).not.toContain("Rekomendasi: Investasi Ragu");
  });

  it("info satu skenario -> ringkasan", () => {
    const a = answerCopilot("ceritakan Toko Makmur", CTX);
    expect(a.intent).toBe("info");
    expect(a.text).toContain("Toko Makmur");
    expect(a.text).toContain("LAYAK");
  });

  it("tanpa kecocokan -> bantuan + daftar skenario", () => {
    const a = answerCopilot("halo", CTX);
    expect(a.intent).toBe("info");
    expect(a.text).toContain("Toko Makmur");
    expect(a.text).toContain("Contoh");
  });

  it("daftar kosong -> ajakan buat skenario", () => {
    const a = answerCopilot("rekomendasi?", []);
    expect(a.text).toContain("Belum ada skenario");
  });

  it("tidak ada NaN/Infinity", () => {
    const blob = JSON.stringify([
      answerCopilot("bandingkan Toko Makmur dan Bengkel Jaya", CTX),
      answerCopilot("risiko Kedai Kopi", CTX),
      answerCopilot("rekomendasi", CTX),
    ]);
    expect(blob).not.toContain("NaN");
    expect(blob).not.toContain("Infinity");
  });
});
