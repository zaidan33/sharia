/**
 * Document Extraction Agent (V4.2) - MVP regex-based.
 *
 * Mengekstrak field skenario dari teks bebas (dokumen pengajuan, ringkasan
 * usaha). MVP: parser regex Bahasa Indonesia; integrasi AI menyusul. Fungsi
 * murni - tidak impor db/fetch/env. Hanya mengembalikan field yang ditemukan
 * dengan keyakinan (Partial).
 */
import type { ScenarioInput } from "@/lib/engine";
import { SEKTOR_USAHA } from "@/lib/constants";

export type ExtractedScenario = Partial<ScenarioInput>;

/** Ambil angka (dengan pemisah ribuan/desimal ID) + satuan, konversi ke rupiah int. */
function parseRupiah(token: string, unit: string): number | null {
  // Hilangkan pemisah ribuan (titik), ganti koma desimal -> titik.
  const normalized = token.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return null;
  let mult = 1;
  const u = unit.toLowerCase();
  if (u === "juta" || u === "jt") mult = 1_000_000;
  else if (u === "miliar" || u === "milyar") mult = 1_000_000_000;
  else if (u === "triliun" || u === "trilyun") mult = 1_000_000_000_000;
  else if (u === "ribu" || u === "rb") mult = 1_000;
  return Math.round(n * mult);
}

const RUPIAH = /(?:rp\.?\s*)?([\d][\d.,]*)\s*(juta|jt|miliar|milyar|triliun|trilyun|ribu|rb)?/i;

/** Cari nilai rupiah pertama di dekat salah satu keyword. */
function findRupiahNear(text: string, keywords: string[]): number | null {
  for (const kw of keywords) {
    const re = new RegExp(kw + "[^\\d]{0,20}" + RUPIAH.source, "i");
    const m = text.match(re);
    if (m) {
      const v = parseRupiah(m[1], m[2] ?? "");
      if (v !== null && v > 0) return v;
    }
  }
  return null;
}

/** Cari persentase pertama di dekat salah satu keyword. */
function findPercentNear(text: string, keywords: string[]): number | null {
  for (const kw of keywords) {
    const re = new RegExp(kw + "[^\\d]{0,20}([\\d][\\d.,]*)\\s*%", "i");
    const m = text.match(re);
    if (m) {
      const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** Ambil sisa baris setelah "label:" (label bebas). */
function findLabeledLine(text: string, keywords: string[]): string | null {
  for (const kw of keywords) {
    const re = new RegExp(kw + "\\s*[:\\-]\\s*(.+)$", "im");
    const m = text.match(re);
    if (m) {
      const val = m[1].trim().replace(/[.;,]+$/, "");
      if (val.length >= 2 && val.length <= 200) return val;
    }
  }
  return null;
}

export function extractScenarioFields(text: string): ExtractedScenario {
  if (!text || !text.trim()) return {};
  const out: ExtractedScenario = {};

  // --- Identitas ---
  const nama = findLabeledLine(text, ["nama usaha", "nama", "usaha"]);
  if (nama) out.nama = nama;
  const tujuan = findLabeledLine(text, ["tujuan pembiayaan", "tujuan", "keperluan", "guna"]);
  if (tujuan) out.tujuanPembiayaan = tujuan;

  const lower = text.toLowerCase();
  const sektor = SEKTOR_USAHA.find((s) => lower.includes(s.toLowerCase()));
  if (sektor) out.jenisUsaha = sektor;

  const risiko = lower.match(/risiko\s*[:\-]?\s*(rendah|sedang|tinggi)/);
  if (risiko) out.profilRisiko = risiko[1] as ScenarioInput["profilRisiko"];

  // --- Struktur ---
  const dana = findRupiahNear(text, ["plafon", "pinjaman", "pembiayaan", "kebutuhan dana", "pokok pembiayaan", "dana"]);
  if (dana) out.kebutuhanDana = dana;

  // tenor: bulan atau tahun
  const tBulan = text.match(/(\d+)\s*(bulan|bln)/i);
  const tTahun = text.match(/([\d.,]+)\s*(tahun|thn)/i);
  if (tBulan) out.tenorBulan = parseInt(tBulan[1], 10);
  else if (tTahun) out.tenorBulan = Math.round(parseFloat(tTahun[1].replace(",", ".")) * 12);

  // skema & akad
  const akad = lower.match(/(murabahah|ijarah|musyarakah\s+mutanaqishah|musyarakah|mm\b)/);
  if (akad) {
    out.jenisSkema = "syariah";
    const a = akad[1];
    out.jenisAkad = a.startsWith("musyarakah") || a === "mm"
      ? "musyarakah_mutanaqishah"
      : (a === "ijarah" ? "ijarah" : "murabahah");
  } else if (/(konvensional|bunga)/.test(lower)) {
    out.jenisSkema = "konvensional";
    out.jenisAkad = null;
  } else if (lower.includes("syariah")) {
    out.jenisSkema = "syariah";
  }

  const tingkat = findPercentNear(text, ["tingkat biaya", "marja", "margin pembiayaan", "bunga", "biaya tahunan", "rate"]);
  if (tingkat !== null) out.tingkatBiayaTahunan = tingkat;

  // basis: jika efektif/saldo menurun disebut -> efektif; flat -> flat
  if (/saldo menurun|efektif/.test(lower)) out.basisTingkatBiaya = "efektif";
  else if (/flat/.test(lower)) out.basisTingkatBiaya = "flat";

  // --- Kondisi usaha ---
  const pendapatan = findRupiahNear(text, ["pendapatan", "omzet", "omset", "penjualan"]);
  if (pendapatan) out.pendapatanBulananAwal = pendapatan;
  const opex = findRupiahNear(text, ["opex", "biaya operasional", "biaya bulanan", "pengeluaran operasional", "biaya"]);
  if (opex) out.opexBulananAwal = opex;
  const ekuitas = findRupiahNear(text, ["ekuitas", "modal sendiri", "modal"]);
  if (ekuitas) out.ekuitasAwal = ekuitas;
  const kewajiban = findRupiahNear(text, ["kewajiban lain", "utang lain", "kewajiban"]);
  if (kewajiban) out.kewajibanLain = kewajiban;
  const deltaPendapatan = findRupiahNear(text, ["tambahan pendapatan", "kenaikan pendapatan", "pendapatan tambahan"]);
  if (deltaPendapatan) out.deltaPendapatanBulanan = deltaPendapatan;
  const deltaOpex = findRupiahNear(text, ["tambahan opex", "tambahan biaya", "kenaikan biaya"]);
  if (deltaOpex) out.deltaOpexBulanan = deltaOpex;

  const pertumbuhan = findPercentNear(text, ["pertumbuhan pendapatan", "pertumbuhan", "kenaikan omzet"]);
  if (pertumbuhan !== null) out.pertumbuhanPendapatanTahunan = pertumbuhan;
  const inflasi = findPercentNear(text, ["inflasi biaya", "inflasi", "kenaikan harga"]);
  if (inflasi !== null) out.inflasiBiayaTahunan = inflasi;
  const margin = findPercentNear(text, ["margin kontribusi", "margin"]);
  if (margin !== null) out.marginKontribusiPersen = margin;
  const discount = findPercentNear(text, ["discount rate", "tingkat diskonto", "diskonto"]);
  if (discount !== null) out.discountRateTahunan = discount;

  return out;
}
