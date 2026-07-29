/**
 * Tes Document Extraction (V4.2) - parser regex.
 */
import { describe, it, expect } from "vitest";
import { extractScenarioFields } from "@/lib/extract";

const DOKUMEN = `
Nama Usaha: Kedai Kopi Makmur
Tujuan: Ekspansi cabang baru
Sektor: F&B
Profil risiko: sedang

Plafon pembiayaan: Rp 300.000.000
Tenor: 30 bulan
Skema: konvensional dengan bunga 12% per tahun (efektif, saldo menurun)

Pendapatan saat ini: Rp 110 juta/bulan
Biaya operasional: Rp 82.000.000/bulan
Ekuitas: Rp 120 jt
Kewajiban lain: Rp 30.000.000
Pertumbuhan pendapatan: 10% per tahun
Inflasi biaya: 6%
Margin kontribusi: 35%
Discount rate: 12%
`;

describe("extractScenarioFields", () => {
  const e = extractScenarioFields(DOKUMEN);

  it("teks kosong -> objek kosong", () => {
    expect(extractScenarioFields("")).toEqual({});
    expect(extractScenarioFields("   ")).toEqual({});
  });

  it("identitas: nama, tujuan, sektor, risiko", () => {
    expect(e.nama).toBe("Kedai Kopi Makmur");
    expect(e.tujuanPembiayaan).toBe("Ekspansi cabang baru");
    expect(e.jenisUsaha).toBe("F&B");
    expect(e.profilRisiko).toBe("sedang");
  });

  it("struktur: dana, tenor, skema konvensional, tingkat biaya, basis", () => {
    expect(e.kebutuhanDana).toBe(300_000_000);
    expect(e.tenorBulan).toBe(30);
    expect(e.jenisSkema).toBe("konvensional");
    expect(e.jenisAkad).toBeNull();
    expect(e.tingkatBiayaTahunan).toBe(12);
    expect(e.basisTingkatBiaya).toBe("efektif");
  });

  it("kondisi usaha: pendapatan, opex, ekuitas, kewajiban", () => {
    expect(e.pendapatanBulananAwal).toBe(110_000_000);
    expect(e.opexBulananAwal).toBe(82_000_000);
    expect(e.ekuitasAwal).toBe(120_000_000);
    expect(e.kewajibanLain).toBe(30_000_000);
  });

  it("asumsi: pertumbuhan, inflasi, margin, discount", () => {
    expect(e.pertumbuhanPendapatanTahunan).toBe(10);
    expect(e.inflasiBiayaTahunan).toBe(6);
    expect(e.marginKontribusiPersen).toBe(35);
    expect(e.discountRateTahunan).toBe(12);
  });

  it("akad syariah terdeteksi dari nama akad", () => {
    const s = extractScenarioFields("Pembiayaan murabahah plafon 75 juta, tenor 18 bulan, marja 7% flat.");
    expect(s.jenisSkema).toBe("syariah");
    expect(s.jenisAkad).toBe("murabahah");
    expect(s.basisTingkatBiaya).toBe("flat");
    expect(s.kebutuhanDana).toBe(75_000_000);
    expect(s.tenorBulan).toBe(18);
    expect(s.tingkatBiayaTahunan).toBe(7);
  });

  it("tenor dalam tahun dikonversi ke bulan", () => {
    const s = extractScenarioFields("Pinjaman 100 juta, tenor 2 tahun.");
    expect(s.tenorBulan).toBe(24);
  });
});
