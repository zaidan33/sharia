/**
 * Narrative Generation Agent (V5.1) - IMPLEMENTATION_PLAN V5 instr 1.
 *
 * Menghasilkan ringkasan bahasa Indonesia dari hasil perhitungan skenario.
 * MVP: template-based (tanpa LLM). Fungsi murni - hanya baca input/computation
 * + format. Tidak ada em dash (pakai " - ").
 */
import type { ScenarioComputation, ScenarioInput, StatusKelayakan } from "@/lib/engine";
import { JENIS_AKAD_LABEL } from "@/lib/constants";
import { formatPersen, formatRasio, formatRupiah } from "@/lib/format";

export interface MetricNarrative {
  ear: string;
  dscr: string;
  npv: string;
  irr: string;
}

export interface NarrativeResult {
  profil: string;
  kelayakan: string;
  rekomendasi: string;
  metrics: MetricNarrative;
  full: string; // seluruh paragraf digabung
}

function akadLabel(input: ScenarioInput): string {
  return input.jenisSkema === "konvensional"
    ? "konvensional"
    : (input.jenisAkad ? JENIS_AKAD_LABEL[input.jenisAkad].toLowerCase() : "syariah");
}

function statusLabel(s: StatusKelayakan): string {
  return s === "LAYAK"
    ? "LAYAK"
    : s === "WASPADA"
      ? "WASPADA"
      : "TIDAK LAYAK";
}

function dscrInterpretation(avg: number | null, min: number | null): string {
  if (avg === null || min === null)
    return "Tak terdefinisi karena tidak ada beban angsuran pada periode proyeksi.";
  if (avg < 1)
    return `Tidak aman - rata-rata ${formatRasio(avg)} berarti arus kas usaha TIDAK menutupi angsuran (minimum ${formatRasio(min)}).`;
  if (avg < 1.25)
    return `Perlu perhatian - rata-rata ${formatRasio(avg)} memberi margin tipis (minimum ${formatRasio(min)}).`;
  return `Aman - rata-rata ${formatRasio(avg)} menutupi angsuran dengan margin cukup (minimum ${formatRasio(min)}).`;
}

function rekomendasiText(status: StatusKelayakan): string {
  if (status === "LAYAK")
    return "Rekomendasi: lanjutkan. Status LAYAK - pertahankan DSCR minimum di atas 1,00 dan pantau asumsi pertumbuhan.";
  if (status === "WASPADA")
    return "Rekomendasi: tinjau dulu. Status WASPADA - ada indikator yang perlu perhatian. Mitigasi risiko (tenor lebih panjang, dana lebih kecil, atau skema lain) sebelum melanjutkan.";
  return "Rekomendasi: pertimbangkan ulang. Status TIDAK LAYAK - struktur ini tidak menguntungkan. Ubah struktur (lihat halaman Optimizer) atau kurangi kebutuhan dana.";
}

export function generateNarrative(
  input: ScenarioInput,
  comp: ScenarioComputation,
): NarrativeResult {
  const base = comp.varian.base;
  const angsuran1 = comp.schedule.angsuran[0] ?? 0;
  const ear = comp.schedule.earPersen;
  const akad = akadLabel(input);

  // --- Profil pembiayaan ---
  const profil =
    `${input.nama} (${input.jenisUsaha}) mengajukan pembiayaan ${akad} ` +
    `sebesar ${formatRupiah(input.kebutuhanDana)} untuk ${input.tenorBulan} bulan, ` +
    `dengan tujuan ${input.tujuanPembiayaan.toLowerCase()}. ` +
    `Dengan tingkat biaya ${formatPersen(input.tingkatBiayaTahunan, 1)} (${input.basisTingkatBiaya}), ` +
    `biaya efektif tahunan (EAR) menjadi ${formatPersen(ear, 2)} dan angsuran pertama ${formatRupiah(angsuran1)} ` +
    `(total pembayaran ${formatRupiah(comp.schedule.totalPembayaran)}).`;

  // --- Per-metrik ---
  const dscrText = (v: number | null, min: number | null): string =>
    v === null ? "tak terdefinisi" : `${formatRasio(v)} (minimum ${min === null ? "-" : formatRasio(min)})`;

  const metrics: MetricNarrative = {
    ear:
      `Biaya efektif tahunan (EAR) ${formatPersen(ear, 2)} adalah satu-satunya angka apples-to-apple ` +
      `untuk membandingkan ${akad} dengan skema lain. Kuotasi awal ${formatPersen(input.tingkatBiayaTahunan, 1)} ` +
      `${input.basisTingkatBiaya} dinormalisasi ke EAR ini.`,
    dscr:
      `DSCR (debt service coverage ratio) rata-rata ${dscrText(base.dscrRataRata, base.dscrMinimum)}. ` +
      dscrInterpretation(base.dscrRataRata, base.dscrMinimum),
    npv:
      base.npv > 0
        ? `NPV ${formatRupiah(base.npv)} bernilai POSITIF - pembiayaan ini menambah nilai usaha pada discount rate ${formatPersen(input.discountRateTahunan, 1)}.`
        : `NPV ${formatRupiah(base.npv)} bernilai NOL/NEGATIF - pembiayaan ini TIDAK menambah nilai pada discount rate ${formatPersen(input.discountRateTahunan, 1)}.`,
    irr:
      base.irr.irrTahunanPersen === null
        ? `IRR tak terdefinisi (pola arus kas tidak lazim) - gunakan NPV sebagai acuan utama.`
        : base.irr.irrTahunanPersen > input.discountRateTahunan
          ? `IRR ${formatPersen(base.irr.irrTahunanPersen, 2)} berada DI ATAS discount rate ${formatPersen(input.discountRateTahunan, 1)} - pembiayaan menghasilkan imbal hasil melebihi biaya modal.`
          : `IRR ${formatPersen(base.irr.irrTahunanPersen, 2)} berada DI BAWAH discount rate ${formatPersen(input.discountRateTahunan, 1)} - imbal hasil tidak menutup biaya modal.`,
  };

  // --- Analisis kelayakan ---
  const kelayakan =
    `Berdasarkan proyeksi arus kas inkremental, status kelayakan: ${statusLabel(comp.status)}. ` +
    `${metrics.dscr} ${metrics.npv} ${base.irr.irrTahunanPersen === null ? "IRR tak terdefinisi." : `IRR ${formatPersen(base.irr.irrTahunanPersen, 2)}.`} ` +
    `DER ${comp.der === null ? "tak terdefinisi" : formatRasio(comp.der)}, ROI tahunan ${formatPersen(comp.roiTahunanPersen, 1)}, ` +
    `BEP omzet ${formatRupiah(comp.breakEven.bepRupiah)}/bulan.`;

  const rekomendasi = rekomendasiText(comp.status);

  const full = [profil, "", metrics.ear, metrics.dscr, metrics.npv, metrics.irr, "", kelayakan, "", rekomendasi].join("\n");

  return { profil, kelayakan, rekomendasi, metrics, full };
}
