/**
 * Tes Document Extraction (V4.2) - parser regex.
 */
import { describe, it, expect } from "vitest";
import { extractScenarioFields, normalizeExtracted } from "@/lib/extract";

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

describe("normalizeExtracted (V6.4)", () => {
  it("objek lengkap dengan pemisah ID -> dijejit & dipertahankan", () => {
    const r = normalizeExtracted({
      nama: "  Kedai Kopi Makmur  ",
      jenisUsaha: "f&b",
      tujuanPembiayaan: "Ekspansi cabang baru",
      profilRisiko: "SEDANG",
      kebutuhanDana: "Rp 300.000.000",
      tenorBulan: "30",
      tingkatBiayaTahunan: "12,5",
      basisTingkatBiaya: "Flat",
      pendapatanBulananAwal: 110_000_000,
      ekuitasAwal: "120.000.000",
      pertumbuhanPendapatanTahunan: 10,
      marginKontribusiPersen: 35,
      discountRateTahunan: 12,
    });
    expect(r.nama).toBe("Kedai Kopi Makmur");
    expect(r.jenisUsaha).toBe("F&B");
    expect(r.profilRisiko).toBe("sedang");
    expect(r.kebutuhanDana).toBe(300_000_000);
    expect(r.tenorBulan).toBe(30);
    expect(r.tingkatBiayaTahunan).toBe(12.5);
    expect(r.basisTingkatBiaya).toBe("flat");
    expect(r.ekuitasAwal).toBe(120_000_000);
  });

  it("akad alias (mmq) dipetakan; skema syariak otomatis", () => {
    const r = normalizeExtracted({ jenisAkad: "MMQ" });
    expect(r.jenisAkad).toBe("musyarakah_mutanaqishah");
    expect(r.jenisSkema).toBe("syariah");
  });

  it("konvensional -> jenisAkad dipaksa null", () => {
    const r = normalizeExtracted({ jenisSkema: "konvensional", jenisAkad: "murabahah" });
    expect(r.jenisSkema).toBe("konvensional");
    expect(r.jenisAkad).toBeNull();
  });

  it("MMQ + flat -> basis dipaksa efektif (kombinasi valid)", () => {
    const r = normalizeExtracted({
      jenisAkad: "musyarakah_mutanaqishah",
      basisTingkatBiaya: "flat",
    });
    expect(r.basisTingkatBiaya).toBe("efektif");
  });

  it("field di luar rentang / non-angka / enum salah dibuang", () => {
    const r = normalizeExtracted({
      nama: "AB", // < 3 char
      tenorBulan: 2, // < 3
      kebutuhanDana: 500, // < 1jt
      tingkatBiayaTahunan: 999, // > 60
      jenisUsaha: "Batik", // bukan sektor valid
      profilRisiko: "ekstrem",
      pendapatanBulananAwal: "bukan angka",
    });
    expect(r.nama).toBeUndefined();
    expect(r.tenorBulan).toBeUndefined();
    expect(r.kebutuhanDana).toBeUndefined();
    expect(r.tingkatBiayaTahunan).toBeUndefined();
    expect(r.jenisUsaha).toBeUndefined();
    expect(r.profilRisiko).toBeUndefined();
    expect(r.pendapatanBulananAwal).toBeUndefined();
  });

  it("input bukan objek -> objek kosong (tanpa lempar)", () => {
    expect(normalizeExtracted(null)).toEqual({});
    expect(normalizeExtracted("teks")).toEqual({});
    expect(normalizeExtracted(undefined)).toEqual({});
  });
});
