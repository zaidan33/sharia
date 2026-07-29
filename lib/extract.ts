/**
 * Document Extraction Agent (V4.2) - regex baseline + DeepSeek (V6.4).
 *
 * Mengekstrak field skenario dari teks bebas (dokumen pengajuan, ringkasan
 * usaha). Jalur utama kini DeepSeek (lebih akurat untuk teks naratif); bila
 * API key tidak diset / gagal, mundur ke parser regex Bahasa Indonesia.
 *
 * `extractScenarioFields` (regex) dan `normalizeExtracted` (validasi) tetap
 * murni - tanpa db/fetch/env, dapat diuji langsung. Hanya
 * `extractScenarioFieldsEnhanced` yang memanggil DeepSeek (sisi-server).
 */
import type { ScenarioInput } from "@/lib/engine";
import { SEKTOR_USAHA } from "@/lib/constants";
import { askDeepSeek } from "@/lib/ai/deepseek";

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

// ---------------------------------------------------------------------------
// V6.4: DeepSeek extraction + normalisasi (validasi hasil AI menjadi aman).
// ---------------------------------------------------------------------------

/** Ambil nilai numerik dari input apa pun (string/number); null bila invalid. */
function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    // "300.000.000" / "300,5" / "Rp 300 juta" -> tangani pemisah ID sederhana.
    const cleaned = v.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
    if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Bilangan bulat dalam rentang [min,max]; null bila invalid/di luar rentang. */
function clampInt(v: unknown, min: number, max: number): number | null {
  const n = toNum(v);
  if (n === null) return null;
  const i = Math.round(n);
  if (i < min || i > max) return null;
  return i;
}

/** Bilangan desimal dalam rentang [min,max]; null bila invalid/di luar rentang. */
function clampNum(v: unknown, min: number, max: number): number | null {
  const n = toNum(v);
  if (n === null) return null;
  if (n < min || n > max) return null;
  return n;
}

/** Cocokkan string ke salah satu enum (case-insensitive); null bila tak cocok. */
function matchEnum<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const direct = allowed.find((a) => a.toLowerCase() === s);
  if (direct) return direct;
  // Alias ramah bahasa Indonesia.
  if (s === "mm" || s === "mmq" || s === "musyarakah_mutanaqisah" || s === "musyarakah")
    return (allowed as readonly string[]).includes("musyarakah_mutanaqishah")
      ? ("musyarakah_mutanaqishah" as T)
      : null;
  return null;
}

const SEKTOR_LOWER = SEKTOR_USAHA.map((s) => s.toLowerCase());

/**
 * Normalisasi objek mentah (hasil parse JSON DeepSeek) menjadi ExtractedScenario
 * yang aman - tiap field divalidasi/dijepit ke batas skema; yang invalid dibuang.
 * Fungsi murni, tidak mempercayai output model begitu saja.
 */
export function normalizeExtracted(raw: unknown): ExtractedScenario {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: ExtractedScenario = {};

  const nama = typeof o.nama === "string" ? o.nama.trim() : "";
  if (nama.length >= 3 && nama.length <= 120) out.nama = nama;

  if (typeof o.jenisUsaha === "string") {
    const s = o.jenisUsaha.trim().toLowerCase();
    const found = SEKTOR_LOWER.find((x) => x === s);
    if (found) out.jenisUsaha = SEKTOR_USAHA[SEKTOR_LOWER.indexOf(found)];
  }

  const tujuan = typeof o.tujuanPembiayaan === "string" ? o.tujuanPembiayaan.trim() : "";
  if (tujuan.length >= 3 && tujuan.length <= 200) out.tujuanPembiayaan = tujuan;

  const profil = matchEnum(o.profilRisiko, ["rendah", "sedang", "tinggi"] as const);
  if (profil) out.profilRisiko = profil;

  const dana = clampInt(o.kebutuhanDana, 1_000_000, 500_000_000_000);
  if (dana !== null) out.kebutuhanDana = dana;
  const tenor = clampInt(o.tenorBulan, 3, 240);
  if (tenor !== null) out.tenorBulan = tenor;

  const skema = matchEnum(o.jenisSkema, ["syariah", "konvensional"] as const);
  if (skema) out.jenisSkema = skema;
  const akad = matchEnum(o.jenisAkad, ["murabahah", "ijarah", "musyarakah_mutanaqishah"] as const);
  if (akad) out.jenisAkad = akad;

  const tingkat = clampNum(o.tingkatBiayaTahunan, 0, 60);
  if (tingkat !== null) out.tingkatBiayaTahunan = tingkat;
  const basis = matchEnum(o.basisTingkatBiaya, ["flat", "efektif"] as const);
  if (basis) out.basisTingkatBiaya = basis;

  const pendapatan = clampInt(o.pendapatanBulananAwal, 0, Number.MAX_SAFE_INTEGER);
  if (pendapatan !== null) out.pendapatanBulananAwal = pendapatan;
  const opex = clampInt(o.opexBulananAwal, 0, Number.MAX_SAFE_INTEGER);
  if (opex !== null) out.opexBulananAwal = opex;
  const ekuitas = clampInt(o.ekuitasAwal, 1, Number.MAX_SAFE_INTEGER);
  if (ekuitas !== null) out.ekuitasAwal = ekuitas;
  const kewajiban = clampInt(o.kewajibanLain, 0, Number.MAX_SAFE_INTEGER);
  if (kewajiban !== null) out.kewajibanLain = kewajiban;
  const deltaP = clampInt(o.deltaPendapatanBulanan, 0, Number.MAX_SAFE_INTEGER);
  if (deltaP !== null) out.deltaPendapatanBulanan = deltaP;
  const deltaO = clampInt(o.deltaOpexBulanan, 0, Number.MAX_SAFE_INTEGER);
  if (deltaO !== null) out.deltaOpexBulanan = deltaO;

  const tumbuh = clampNum(o.pertumbuhanPendapatanTahunan, -50, 100);
  if (tumbuh !== null) out.pertumbuhanPendapatanTahunan = tumbuh;
  const inflasi = clampNum(o.inflasiBiayaTahunan, -20, 50);
  if (inflasi !== null) out.inflasiBiayaTahunan = inflasi;
  const marginKontrib = clampNum(o.marginKontribusiPersen, 1, 100);
  if (marginKontrib !== null) out.marginKontribusiPersen = marginKontrib;
  const discount = clampNum(o.discountRateTahunan, 0, 40);
  if (discount !== null) out.discountRateTahunan = discount;
  const terminal = clampNum(o.pertumbuhanTerminalTahunan, 0, 40);
  if (terminal !== null) out.pertumbuhanTerminalTahunan = terminal;

  // Konsistensi (pra-pengisian; validasi final tetap di skema saat simpan).
  if (out.jenisAkad) out.jenisSkema = out.jenisSkema ?? "syariah";
  if (out.jenisSkema === "konvensional") out.jenisAkad = null;
  // MMQ hanya boleh basis efektif.
  if (out.jenisAkad === "musyarakah_mutanaqishah" && out.basisTingkatBiaya === "flat")
    out.basisTingkatBiaya = "efektif";

  return out;
}

const EXTRACT_SYSTEM_PROMPT =
  "Anda asisten ekstraksi data keuangan. Dari teks dokumen pengajuan pembiayaan " +
  "Berbahasa Indonesia, ekstrak informasi menjadi JSON valid dengan kunci berikut " +
  "(hanya sertakan kunci yang sungguh disebut teks, jangan mengarang). Semua " +
  "nominal rupiah sebagai BILANGAN BULAT penuh (contoh 300000000), persentase " +
  "sebagai angka (contoh 12 bukan 0,12). Kunci: nama (string), jenisUsaha (salah " +
  "satu: " + SEKTOR_USAHA.join(", ") + "), tujuanPembiayaan (string), profilRisiko " +
  "(rendah/sedang/tinggi), kebutuhanDana (rupiah), tenorBulan (bulan), jenisSkema " +
  "(syariah/konvensional), jenisAkad (murabahah/ijarah/musyarakah_mutanaqishah), " +
  "tingkatBiayaTahunan (persen), basisTingkatBiaya (flat/efektif), pendapatanBulananAwal, " +
  "opexBulananAwal, ekuitasAwal, kewajibanLain, deltaPendapatanBulanan, deltaOpexBulanan, " +
  "pertumbuhanPendapatanTahunan (persen/tahun), inflasiBiayaTahunan (persen/tahun), " +
  "marginKontribusiPersen (persen), discountRateTahunan (persen). Jawab HANYA objek JSON.";

/** Ambil objek JSON pertama dari string (tangani code fence / teks pengantar). */
function parseJsonLoose(s: string): unknown {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : s;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Ekstraksi field skenario. Jalur utama DeepSeek (JSON terstruktur); bila tidak
 * dikonfigurasi/gagal, mundur ke regex. Hasil AI senantiasa dinormalisasi lalu
 * digabung dengan regex (AI lebih diutamakan, regex mengisi celah). Murni data.
 */
export async function extractScenarioFieldsEnhanced(
  text: string,
): Promise<ExtractedScenario> {
  const regex = extractScenarioFields(text);
  if (!text || !text.trim()) return {};

  const ai = await askDeepSeek(EXTRACT_SYSTEM_PROMPT, text, {
    json: true,
    temperature: 0,
    maxTokens: 900,
    timeoutMs: 25_000,
  });
  if (ai === null) return regex;

  const parsed = parseJsonLoose(ai);
  if (parsed === null) return regex;
  const normalized = normalizeExtracted(parsed);

  // Gabung: AI diutamakan, regex mengisi kunci yang tidak diberikan AI.
  return { ...regex, ...normalized };
}
