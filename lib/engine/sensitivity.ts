/**
 * Sensitivity engine (V2.1) - IMPLEMENTATION_PLAN V2 instr 1.
 * Mengubah tiap parameter ±10% / ±20% dari nilai base, lalu mengukur dampaknya
 * pada NPV, IRR, dan DSCR (varian base). Fungsi murni - tidak impor db/fetch/env.
 */
import { computeScenario, type ScenarioInput } from "./index";

export type SensitivityTarget = "npv" | "irr" | "dscr";

export interface SensitivityPoint {
  param: string;
  label: string;
  deltaPct: number; // -20 | -10 | 10 | 20
  value: number; // nilai input setelah diubah
  npv: number;
  irr: number | null;
  dscr: number | null;
  metric: number | null; // nilai metrik target (npv/irr/dscr) untuk tornado
}

export interface SensitivitySwing {
  param: string;
  label: string;
  low: number;
  high: number;
  base: number;
  swing: number; // |high - low|
}

export interface SensitivityResult {
  target: SensitivityTarget;
  base: { npv: number; irr: number | null; dscr: number | null };
  points: SensitivityPoint[];
  swings: SensitivitySwing[]; // urut swing menurun (untuk tornado)
}

const RUPIAH = new Set([
  "pendapatanBulananAwal",
  "opexBulananAwal",
  "deltaPendapatanBulanan",
  "deltaOpexBulanan",
  "kebutuhanDana",
  "ekuitasAwal",
  "kewajibanLain",
]);

const PARAMS: { key: keyof ScenarioInput; label: string }[] = [
  { key: "pendapatanBulananAwal", label: "Pendapatan awal" },
  { key: "opexBulananAwal", label: "Opex awal" },
  { key: "pertumbuhanPendapatanTahunan", label: "Pertumbuhan pendapatan" },
  { key: "inflasiBiayaTahunan", label: "Inflasi biaya" },
  { key: "deltaPendapatanBulanan", label: "Tambahan pendapatan" },
  { key: "deltaOpexBulanan", label: "Tambahan opex" },
  { key: "kebutuhanDana", label: "Kebutuhan dana" },
  { key: "tingkatBiayaTahunan", label: "Tingkat biaya" },
  { key: "discountRateTahunan", label: "Discount rate" },
];

const DELTAS = [-0.2, -0.1, 0.1, 0.2];

function pick(
  npv: number,
  irr: number | null,
  dscr: number | null,
  target: SensitivityTarget,
): number | null {
  const v = target === "npv" ? npv : target === "irr" ? irr : dscr;
  return v === null || !Number.isFinite(v) ? null : v;
}

export function runSensitivity(
  input: ScenarioInput,
  target: SensitivityTarget = "npv",
): SensitivityResult {
  const baseComp = computeScenario(input);
  const base = {
    npv: baseComp.varian.base.npv,
    irr: baseComp.varian.base.irr.irrTahunanPersen,
    dscr: baseComp.varian.base.dscrRataRata,
  };
  const baseMetric = pick(base.npv, base.irr, base.dscr, target) ?? 0;

  const points: SensitivityPoint[] = [];
  for (const p of PARAMS) {
    const baseVal = input[p.key] as number;
    for (const d of DELTAS) {
      const scaled = RUPIAH.has(p.key as string)
        ? Math.round(baseVal * (1 + d))
        : baseVal * (1 + d);
      const varied: ScenarioInput = { ...input, [p.key]: scaled };
      const comp = computeScenario(varied);
      const npv = comp.varian.base.npv;
      const irr = comp.varian.base.irr.irrTahunanPersen;
      const dscr = comp.varian.base.dscrRataRata;
      points.push({
        param: p.key as string,
        label: p.label,
        deltaPct: d * 100,
        value: scaled,
        npv,
        irr,
        dscr,
        metric: pick(npv, irr, dscr, target),
      });
    }
  }

  const swings: SensitivitySwing[] = PARAMS.map((p) => {
    const vals = points
      .filter((x) => x.param === (p.key as string) && x.metric !== null)
      .map((x) => x.metric as number);
    if (vals.length === 0) {
      return { param: p.key as string, label: p.label, low: 0, high: 0, base: 0, swing: 0 };
    }
    const low = Math.min(...vals);
    const high = Math.max(...vals);
    return {
      param: p.key as string,
      label: p.label,
      low,
      high,
      base: baseMetric,
      swing: Math.abs(high - low),
    };
  }).sort((a, b) => b.swing - a.swing);

  return { target, base, points, swings };
}
