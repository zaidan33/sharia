/**
 * Monte Carlo engine (V3.1) - IMPLEMENTATION_PLAN V3 instr 1.
 *
 * Mengganggu dua asumsi proyeksi (pertumbuhan pendapatan & inflasi biaya) dengan
 * distribusi Normal(μ, σ) lalu mengukur distribusi NPV, IRR, dan DSCR varian base.
 *
 * Prinsip engine: murni, tidak impor db/fetch/env. Memakai PRNG berbiji
 * (mulberry32) + transformasi Box-Muller - bukan Math.random() - sehingga hasil
 * deterministik & dapat diuji. Jadwal pembiayaan konstan antar-iterasi (hanya
 * asumsi proyeksi yang divariasikan) untuk efisiensi.
 */
import { buildFinancingSchedule } from "./financing-cost";
import { projectCashflow } from "./cashflow";
import { calculateDSCR, dscrAverage } from "./ratios";
import { calculateNPV, calculateIRR } from "./valuation";
import type { ScenarioInput } from "./index";

export interface MonteCarloParams {
  iterations?: number; // default 1000
  seed?: number; // default 20240101 (deterministik)
  /** σ pertumbuhan pendapatan (poin persen). Default = max(0,3|μ|; 1,5). */
  volPertumbuhanPendapatan?: number;
  /** σ inflasi biaya (poin persen). Default = max(0,3|μ|; 1,0). */
  volInflasiBiaya?: number;
}

export interface Percentiles {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface HistogramBin {
  start: number;
  end: number;
  count: number;
}

export interface MonteCarloResult {
  iterations: number;
  seed: number;
  means: { pertumbuhan: number; inflasi: number }; // μ (pp)
  vols: { pertumbuhan: number; inflasi: number }; // σ (pp)
  npv: {
    percentiles: Percentiles;
    histogram: HistogramBin[];
    mean: number;
  };
  irr: { percentiles: Percentiles | null; validSamples: number };
  dscr: { percentiles: Percentiles | null; validSamples: number };
  /** Probabilitas risiko: P(NPV < 0) dan P(DSCR rata-rata < 1). */
  probNpvNegatif: number;
  probDscrKurangDari1: number;
}

const DEFAULT_SEED = 20240101;

/** PRNG deterministik - mulberry32. Mengembalikan uniform [0,1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generator sampel Normal(μ, σ) lewat Box-Muller dari uniform [0,1). */
function makeNormal(
  rng: () => number,
  mu: number,
  sigma: number,
): () => number {
  if (sigma <= 0) return () => mu;
  return () => {
    let u = rng();
    let v = rng();
    if (u < 1e-12) u = 1e-12; // hindari log(0)
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mu + sigma * z;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.floor((p / 100) * sortedAsc.length),
  );
  return sortedAsc[idx];
}

function percentilesOf(sortedAsc: number[]): Percentiles {
  return {
    p5: percentile(sortedAsc, 5),
    p25: percentile(sortedAsc, 25),
    p50: percentile(sortedAsc, 50),
    p75: percentile(sortedAsc, 75),
    p95: percentile(sortedAsc, 95),
  };
}

/** Bagi nilai berurut menjadi `bins` interval. */
function histogram(sortedAsc: number[], bins: number): HistogramBin[] {
  if (sortedAsc.length === 0 || bins <= 0) return [];
  const min = sortedAsc[0];
  const max = sortedAsc[sortedAsc.length - 1];
  if (min === max) {
    return [{ start: min, end: max, count: sortedAsc.length }];
  }
  const width = (max - min) / bins;
  const out: HistogramBin[] = [];
  for (let b = 0; b < bins; b++) {
    out.push({ start: min + b * width, end: min + (b + 1) * width, count: 0 });
  }
  for (const v of sortedAsc) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1; // nilai maksimum jatuh di bin terakhir
    out[idx].count++;
  }
  return out;
}

export function runMonteCarlo(
  input: ScenarioInput,
  params: MonteCarloParams = {},
): MonteCarloResult {
  const iterations = Math.max(1, Math.floor(params.iterations ?? 1000));
  const seed = params.seed ?? DEFAULT_SEED;

  const muG = input.pertumbuhanPendapatanTahunan;
  const muI = input.inflasiBiayaTahunan;
  const sigG =
    params.volPertumbuhanPendapatan ?? Math.max(Math.abs(muG) * 0.3, 1.5);
  const sigI = params.volInflasiBiaya ?? Math.max(Math.abs(muI) * 0.3, 1.0);

  // Jadwal pembiayaan konstan - tidak bergantung pada asumsi proyeksi.
  const schedule = buildFinancingSchedule({
    kebutuhanDana: input.kebutuhanDana,
    tenorBulan: input.tenorBulan,
    jenisSkema: input.jenisSkema,
    jenisAkad: input.jenisAkad,
    tingkatBiayaTahunan: input.tingkatBiayaTahunan,
    basisTingkatBiaya: input.basisTingkatBiaya,
  });
  const angsuran = schedule.angsuran;

  const rng = mulberry32(seed);
  const sampleG = makeNormal(rng, muG, sigG);
  const sampleI = makeNormal(rng, muI, sigI);

  const npvValues: number[] = [];
  const irrValues: number[] = [];
  const dscrValues: number[] = [];
  let npvNegatif = 0;
  let dscrKurangDari1 = 0;

  for (let it = 0; it < iterations; it++) {
    const g = clamp(sampleG(), -50, 100); // batas form: -50% s.d. 100%
    const i = clamp(sampleI(), -20, 50); // batas form: -20% s.d. 50%
    const cf = projectCashflow(
      {
        pendapatanBulananAwal: input.pendapatanBulananAwal,
        opexBulananAwal: input.opexBulananAwal,
        pertumbuhanPendapatanTahunan: g,
        inflasiBiayaTahunan: i,
        deltaPendapatanBulanan: input.deltaPendapatanBulanan,
        deltaOpexBulanan: input.deltaOpexBulanan,
        tenorBulan: input.tenorBulan,
        debtService: angsuran,
      },
      "base",
    );

    const npv = calculateNPV(cf, input.discountRateTahunan, input.kebutuhanDana);
    npvValues.push(npv);
    if (npv < 0) npvNegatif++;

    const irr = calculateIRR(cf, input.kebutuhanDana).irrTahunanPersen;
    if (irr !== null) irrValues.push(irr);

    const dscr = dscrAverage(calculateDSCR(cf));
    if (dscr !== null) {
      dscrValues.push(dscr);
      if (dscr < 1) dscrKurangDari1++;
    }
  }

  npvValues.sort((a, b) => a - b);
  irrValues.sort((a, b) => a - b);
  dscrValues.sort((a, b) => a - b);

  const npvMean =
    npvValues.reduce((a, b) => a + b, 0) / Math.max(1, npvValues.length);

  return {
    iterations,
    seed,
    means: { pertumbuhan: muG, inflasi: muI },
    vols: { pertumbuhan: sigG, inflasi: sigI },
    npv: {
      percentiles: percentilesOf(npvValues),
      histogram: histogram(npvValues, 15),
      mean: npvMean,
    },
    irr: {
      percentiles: irrValues.length > 0 ? percentilesOf(irrValues) : null,
      validSamples: irrValues.length,
    },
    dscr: {
      percentiles: dscrValues.length > 0 ? percentilesOf(dscrValues) : null,
      validSamples: dscrValues.length,
    },
    probNpvNegatif: npvNegatif / iterations,
    probDscrKurangDari1: dscrKurangDari1 / iterations,
  };
}
