/**
 * Penyusun data laporan PDF (V6.5) - PRD V6 §5.
 *
 * Fungsi murni: menggabungkan input skenario, hasil perhitungan, narasi (V5.1),
 * sensitivitas (V2.1), dan daftar pembanding (V2.2) menjadi objek datar yang
 * siap dirender react-pdf. Tidak memanggil db/fetch/env - semua masukan disuntik
 * dari halaman server. Dapat diuji langsung.
 */
import type { ScenarioComputation, ScenarioInput } from "@/lib/engine";
import type { NarrativeResult } from "@/lib/ai/narrative";
import type { SensitivitySwing } from "@/lib/engine/sensitivity";
import type { ScenarioForCompare } from "@/lib/queries";
import {
  JENIS_AKAD_LABEL,
  PROFIL_RISIKO_LABEL,
  BASIS_TINGKAT_LABEL,
} from "@/lib/constants";
import { CaveatList } from "@/lib/caveats";
import {
  formatPersen,
  formatRasio,
  formatRupiah,
  formatRupiahCompact,
} from "@/lib/format";

export type Tone = "good" | "watch" | "bad" | "neutral";

export interface ProfileRow {
  label: string;
  value: string;
}
export interface IndicatorRow {
  label: string;
  value: string;
  tone: Tone;
  note?: string;
}
export interface CashflowYear {
  tahun: number;
  arusKasBersih: number;
}
export interface TornadoRow {
  label: string;
  low: number;
  high: number;
  base: number;
  swing: number;
}
export interface CompareRow {
  nama: string;
  skema: string;
  status: string;
  ear: string;
  dscr: string;
  npv: string;
  current: boolean;
}

export interface ReportData {
  nama: string;
  tanggal: string;
  status: string;
  statusTone: Tone;
  profil: ProfileRow[];
  struktur: ProfileRow[];
  indikator: IndicatorRow[];
  ringkasanEksekutif: string;
  simpulan: string;
  narrativeSource: "ai" | "template";
  arusKas: {
    years: CashflowYear[];
    total: number;
    totalPembayaran: string;
    angsuranPertama: string;
    tenorBulan: number;
  };
  sensitivitas: {
    target: string;
    baseValue: number;
    rows: TornadoRow[];
    axisMin: number;
    axisMax: number;
  };
  perbandingan: CompareRow[] | null;
  caveats: { title: string; body: string }[];
}

function skemaLabel(input: ScenarioInput): string {
  return input.jenisSkema === "konvensional"
    ? "Konvensional"
    : input.jenisAkad
      ? JENIS_AKAD_LABEL[input.jenisAkad]
      : "Syariah";
}

function dscrTone(v: number | null): Tone {
  if (v === null) return "neutral";
  if (v >= 1.25) return "good";
  if (v >= 1.0) return "watch";
  return "bad";
}
function derTone(v: number | null): Tone {
  if (v === null) return "neutral";
  if (v <= 2) return "good";
  if (v <= 3) return "watch";
  return "bad";
}

/** Status kelayakan -> tone warna. */
export function statusToneOf(status: string): Tone {
  if (status === "LAYAK") return "good";
  if (status === "WASPADA") return "watch";
  return "bad";
}

/** Agregasi arus kas bulanan (varian base) ke nilai tahunan. */
function aggregateYearly(
  cashflow: ScenarioComputation["varian"]["base"]["cashflow"],
): CashflowYear[] {
  const map = new Map<number, number>();
  for (const p of cashflow) {
    const tahun = Math.ceil(p.bulan / 12);
    map.set(tahun, (map.get(tahun) ?? 0) + p.arusKasBersih);
  }
  return [...map.entries()]
    .map(([tahun, arusKasBersih]) => ({ tahun, arusKasBersih }))
    .sort((a, b) => a.tahun - b.tahun);
}

export interface BuildReportDataArgs {
  input: ScenarioInput;
  comp: ScenarioComputation;
  narrative: NarrativeResult;
  sensitivitySwings: SensitivitySwing[];
  sensitivityTarget: "npv" | "irr" | "dscr";
  baseMetric: number;
  comparison: ScenarioForCompare[];
  currentId: number;
  tanggal: string;
}

export function buildReportData(args: BuildReportDataArgs): ReportData {
  const { input, comp, narrative } = args;
  const base = comp.varian.base;

  const profil: ProfileRow[] = [
    { label: "Nama usaha", value: input.nama },
    { label: "Sektor", value: input.jenisUsaha },
    { label: "Tujuan pembiayaan", value: input.tujuanPembiayaan },
    { label: "Profil risiko", value: PROFIL_RISIKO_LABEL[input.profilRisiko] },
  ];

  const struktur: ProfileRow[] = [
    { label: "Skema", value: skemaLabel(input) },
    { label: "Akad", value: input.jenisAkad ? JENIS_AKAD_LABEL[input.jenisAkad] : "-" },
    { label: "Kebutuhan dana", value: formatRupiah(input.kebutuhanDana) },
    { label: "Tenor", value: `${input.tenorBulan} bulan` },
    { label: "Tingkat biaya (kuotasi)", value: `${formatPersen(input.tingkatBiayaTahunan, 1)} ${BASIS_TINGKAT_LABEL[input.basisTingkatBiaya]}` },
  ];

  const irrTone: Tone =
    base.irr.irrTahunanPersen === null
      ? "neutral"
      : base.irr.irrTahunanPersen > input.discountRateTahunan
        ? "good"
        : "bad";

  const indikator: IndicatorRow[] = [
    { label: "EAR (biaya efektif)", value: formatPersen(comp.schedule.earPersen, 2), tone: "neutral", note: `kuotasi ${formatPersen(input.tingkatBiayaTahunan, 1)}` },
    { label: "DSCR rata-rata", value: formatRasio(base.dscrRataRata), tone: dscrTone(base.dscrRataRata) },
    { label: "DSCR minimum", value: formatRasio(base.dscrMinimum), tone: dscrTone(base.dscrMinimum) },
    { label: "NPV", value: formatRupiah(base.npv), tone: base.npv > 0 ? "good" : "bad" },
    { label: "IRR tahunan", value: base.irr.irrTahunanPersen === null ? "tak terdefinisi" : formatPersen(base.irr.irrTahunanPersen, 2), tone: irrTone },
    { label: "DER", value: comp.der === null ? "tak terdefinisi" : formatRasio(comp.der), tone: derTone(comp.der) },
    { label: "ROI per tahun", value: formatPersen(comp.roiTahunanPersen, 1), tone: comp.roiTahunanPersen > 0 ? "good" : "bad" },
    { label: "BEP omzet/bulan", value: formatRupiah(comp.breakEven.bepRupiah), tone: "neutral" },
  ];

  const years = aggregateYearly(base.cashflow);
  const total = years.reduce((s, y) => s + y.arusKasBersih, 0);

  // Tornado: ambil maks 8 baris teratas (sudah terurut swing menurun).
  const topSwings = args.sensitivitySwings.slice(0, 8);
  const lows = topSwings.map((s) => s.low);
  const highs = topSwings.map((s) => s.high);
  const axisMin = lows.length ? Math.min(...lows, args.baseMetric) : 0;
  const axisMax = highs.length ? Math.max(...highs, args.baseMetric) : 1;

  const perbandingan: CompareRow[] | null =
    args.comparison.length > 0
      ? args.comparison.map((s) => ({
          nama: s.nama,
          skema:
            s.jenisSkema === "konvensional"
              ? "Konvensional"
              : s.jenisAkad
                ? JENIS_AKAD_LABEL[s.jenisAkad]
                : "Syariah",
          status: s.status,
          ear: s.earPersen ? formatPersen(Number(s.earPersen), 2) : "-",
          dscr: s.dscrRataRata ? formatRasio(Number(s.dscrRataRata)) : "-",
          npv: s.npv === null ? "-" : formatRupiahCompact(s.npv),
          current: s.id === args.currentId,
        }))
      : null;

  const ringkasanEksekutif =
    narrative.aiNarrative && narrative.aiNarrative.trim().length > 0
      ? narrative.aiNarrative
      : `${narrative.profil} ${narrative.kelayakan}`;

  return {
    nama: input.nama,
    tanggal: args.tanggal,
    status: comp.status,
    statusTone: statusToneOf(comp.status),
    profil,
    struktur,
    indikator,
    ringkasanEksekutif,
    simpulan: narrative.rekomendasi,
    narrativeSource: narrative.source,
    arusKas: {
      years,
      total,
      totalPembayaran: formatRupiah(comp.schedule.totalPembayaran),
      angsuranPertama: formatRupiah(comp.schedule.angsuran[0] ?? 0),
      tenorBulan: input.tenorBulan,
    },
    sensitivitas: {
      target: args.sensitivityTarget.toUpperCase(),
      baseValue: args.baseMetric,
      rows: topSwings.map((s) => ({
        label: s.label,
        low: s.low,
        high: s.high,
        base: s.base,
        swing: s.swing,
      })),
      axisMin,
      axisMax,
    },
    perbandingan,
    caveats: CaveatList.map((c) => ({ title: c.title, body: c.body })),
  };
}
