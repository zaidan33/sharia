/**
 * Anomaly Detection (V3.2) - IMPLEMENTATION_PLAN V3 instr 2.
 *
 * Membandingkan input skenario mentah terhadap 20 seed cases (IMPLEMENTATION_PLAN
 * §11) untuk menandai nilai yang menyimpang dari pola sektor. Metrik acuan =
 * median sektor; anomali = deviasi melampaui pita tertentu (mis. pendapatan
 * 60% lebih rendah dari median sektor). Bila sektor tak punya seed, acuan
 * fallback ke median lintas sektor. Fungsi murni - SEED_SCENARIOS konstan.
 */
import { SEED_SCENARIOS } from "@/lib/seed-data";
import type { ScenarioInput } from "./index";

export type AnomalyLevel = "info" | "watch" | "risk";

export interface AnomalyWarning {
  level: AnomalyLevel;
  metric: string;
  message: string;
}

type Dir = "low" | "high" | "both";

interface FieldRule {
  key: keyof ScenarioInput;
  label: string;
  dir: Dir;
  fmt: (v: number) => string;
}

// Pita deviasi dari median sektor sebelum dianggap anomali.
const LOW_BAND = 0.5; // < 50% median (>=50% di bawah)
const HIGH_BAND = 0.6; // > 160% median (>=60% di atas)
const BOTH_BAND = 0.7; // |deviasi| >= 70% (dua arah, asumsi)

const RULES: FieldRule[] = [
  { key: "pendapatanBulananAwal", label: "Pendapatan bulanan", dir: "low", fmt: fmtRupiah },
  { key: "opexBulananAwal", label: "Opex bulanan", dir: "high", fmt: fmtRupiah },
  { key: "tingkatBiayaTahunan", label: "Tingkat biaya tahunan", dir: "high", fmt: pct },
  { key: "pertumbuhanPendapatanTahunan", label: "Asumsi pertumbuhan pendapatan", dir: "both", fmt: pct },
  { key: "marginKontribusiPersen", label: "Margin kontribusi", dir: "both", fmt: pct },
  { key: "tenorBulan", label: "Tenor", dir: "both", fmt: (v) => `${Math.round(v)} bulan` },
];

function pct(v: number): string {
  return `${v.toFixed(1).replace(".", ",")}%`;
}
function fmtRupiah(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1e9).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1e6).toFixed(0)} jt`;
  if (abs >= 1_000) return `${sign}Rp${(abs / 1e3).toFixed(0)} rb`;
  return `${sign}Rp${abs}`;
}

interface Ref {
  cases: ScenarioInput[];
  label: string;
}

/** Kasus acuan: sektor sama bila ada (>=1), jika tidak lintas sektor. */
function reference(sector: string): Ref {
  const same = SEED_SCENARIOS.filter((s) => s.jenisUsaha === sector);
  if (same.length === 0)
    return { cases: SEED_SCENARIOS, label: "lintas sektor (sektor Anda belum punya acuan)" };
  return { cases: same, label: `sektor ${sector}` };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function levelFor(pctDev: number): AnomalyLevel {
  return pctDev >= 50 ? "risk" : "watch";
}

/**
 * Bandingkan input mentah terhadap pola sektor. Kembalikan daftar peringatan
 * (kosong bila tidak ada anomali). Tidak memanggil computeScenario - murah.
 */
export function detectAnomalies(input: ScenarioInput): AnomalyWarning[] {
  const warnings: AnomalyWarning[] = [];
  const ref = reference(input.jenisUsaha);

  for (const rule of RULES) {
    const value = input[rule.key] as number;
    if (!Number.isFinite(value)) continue;
    const med = median(ref.cases.map((c) => c[rule.key] as number));
    if (med === null || med === 0) continue;
    const ratio = value / med; // value relatif terhadap median

    if (rule.dir === "low" && ratio < 1 - LOW_BAND) {
      const dev = (1 - ratio) * 100;
      warnings.push({
        level: levelFor(dev),
        metric: rule.label,
        message: `${rule.label} Anda ${Math.round(dev)}% lebih rendah dari median ${ref.label} (${rule.fmt(med)}). Pastikan angka realistis - ini mempengaruhi kelayakan.`,
      });
    } else if (rule.dir === "high" && ratio > 1 + HIGH_BAND) {
      const dev = (ratio - 1) * 100;
      warnings.push({
        level: levelFor(dev),
        metric: rule.label,
        message: `${rule.label} Anda ${Math.round(dev)}% lebih tinggi dari median ${ref.label} (${rule.fmt(med)}). Periksa apakah ini memang kondisi Anda.`,
      });
    } else if (rule.dir === "both" && (ratio < 1 - BOTH_BAND || ratio > 1 + BOTH_BAND)) {
      const dev = Math.abs(ratio - 1) * 100;
      const arah = ratio < 1 ? "lebih rendah" : "lebih tinggi";
      warnings.push({
        level: "info",
        metric: rule.label,
        message: `${rule.label} (${rule.fmt(value)}) ${Math.round(dev)}% ${arah} dari median ${ref.label} (${rule.fmt(med)}). Asumsi ekstrem memperbesar ketidakpastian hasil.`,
      });
    }
  }

  // Pemeriksaan struktural (tidak butuh acuan sektor).
  if (input.pendapatanBulananAwal > 0 && input.opexBulananAwal > input.pendapatanBulananAwal) {
    warnings.push({
      level: "risk",
      metric: "Opex > pendapatan",
      message: "Opex bulanan melebihi pendapatan - usaha beroperasi rugi sebelum pembiayaan. Tinjau kembali angka opex/pendapatan.",
    });
  }

  return warnings;
}
