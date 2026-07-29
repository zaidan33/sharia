/**
 * Structure Optimizer (V4.1) - IMPLEMENTATION_PLAN V4 instr 1.
 *
 * Menjelajahi ruang struktur pembiayaan (skema × akad × tenor × tingkat biaya)
 * lalu menilai tiap kombinasi dengan skor tertimbang dan mengembalikan yang
 * terbaik. Fungsi murni - hanya memanggil computeScenario.
 *
 * Skor (PRD §16 / instruksi V4.1): 0,4 DSCR + 0,3 NPV + 0,2 EAR_rendah +
 * 0,1 IRR. Karena satuan metrik berbeda jauh (NPV rupiah, DSCR ~1-2), tiap
 * metrik di-min-max-normalisasi ke [0,1] pada pool kandidat sebelum ditimbang.
 */
import { computeScenario, type ScenarioInput } from "./index";

export interface OptimizerInput {
  // Kondisi usaha (tetap saat struktur dijelajah)
  pendapatanBulananAwal: number;
  opexBulananAwal: number;
  pertumbuhanPendapatanTahunan: number;
  inflasiBiayaTahunan: number;
  marginKontribusiPersen: number;
  ekuitasAwal: number;
  kewajibanLain: number;
  deltaPendapatanBulanan: number;
  deltaOpexBulanan: number;
  discountRateTahunan: number;
  // Struktur yang dicari
  kebutuhanDana: number;
  profilRisiko: "rendah" | "sedang" | "tinggi";
  // Rentang eksplorasi tenor
  tenorMin: number;
  tenorMax: number;
  tenorStep: number;
  // Asumsi kuotasi tingkat biaya per skema (poin persen)
  tingkatBiayaSyariah: number;
  tingkatBiayaKonvensional: number;
}

export interface CandidateStructure {
  jenisSkema: ScenarioInput["jenisSkema"];
  jenisAkad: ScenarioInput["jenisAkad"];
  basisTingkatBiaya: ScenarioInput["basisTingkatBiaya"];
  tenorBulan: number;
  tingkatBiayaTahunan: number;
  earPersen: number | null;
  npv: number;
  npvWithTerminal: number;
  irrTahunanPersen: number | null;
  dscrRataRata: number | null;
  dscrMinimum: number | null;
  status: ScenarioComputationStatus;
  score: number; // [0,1] - tertimbang
  peringkat: number;
}

type ScenarioComputationStatus = "LAYAK" | "WASPADA" | "TIDAK_LAYAK";

/** Konfigurasi tiap tipe struktur: akad & basis. */
const STRUCTURES: {
  jenisSkema: ScenarioInput["jenisSkema"];
  jenisAkad: ScenarioInput["jenisAkad"];
  basisTingkatBiaya: ScenarioInput["basisTingkatBiaya"];
  rateKey: "tingkatBiayaSyariah" | "tingkatBiayaKonvensional";
}[] = [
  { jenisSkema: "syariah", jenisAkad: "murabahah", basisTingkatBiaya: "flat", rateKey: "tingkatBiayaSyariah" },
  { jenisSkema: "syariah", jenisAkad: "ijarah", basisTingkatBiaya: "flat", rateKey: "tingkatBiayaSyariah" },
  { jenisSkema: "syariah", jenisAkad: "musyarakah_mutanaqishah", basisTingkatBiaya: "efektif", rateKey: "tingkatBiayaSyariah" },
  { jenisSkema: "konvensional", jenisAkad: null, basisTingkatBiaya: "efektif", rateKey: "tingkatBiayaKonvensional" },
];

function tenorRange(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let t = min; t <= max + 1e-9; t += step) out.push(Math.round(t));
  return out;
}

/** min-max normalisasi ke [0,1]. Null -> 0 (terburuk). Rentang degenerate -> 0,5. */
function normalize(
  values: (number | null)[],
  higherIsBetter: boolean,
): number[] {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (valid.length === 0) return values.map(() => 0);
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  return values.map((v) => {
    if (v === null || !Number.isFinite(v)) return 0;
    if (max === min) return 0.5;
    const n = (v - min) / (max - min);
    return higherIsBetter ? n : 1 - n;
  });
}

export function findOptimalStructure(
  input: OptimizerInput,
  topN = 5,
): CandidateStructure[] {
  const tenors = tenorRange(input.tenorMin, input.tenorMax, input.tenorStep);

  // Bangun semua kandidat + hitung metrik mentah.
  type Raw = Omit<CandidateStructure, "score" | "peringkat">;
  const raws: Raw[] = [];
  for (const s of STRUCTURES) {
    const tingkatBiayaTahunan = input[s.rateKey];
    for (const tenorBulan of tenors) {
      const scenario: ScenarioInput = {
        nama: "optimizer",
        jenisUsaha: "Optimizer",
        tujuanPembiayaan: "Pencarian struktur optimal",
        profilRisiko: input.profilRisiko,
        kebutuhanDana: input.kebutuhanDana,
        tenorBulan,
        jenisSkema: s.jenisSkema,
        jenisAkad: s.jenisAkad,
        tingkatBiayaTahunan,
        basisTingkatBiaya: s.basisTingkatBiaya,
        pendapatanBulananAwal: input.pendapatanBulananAwal,
        opexBulananAwal: input.opexBulananAwal,
        pertumbuhanPendapatanTahunan: input.pertumbuhanPendapatanTahunan,
        inflasiBiayaTahunan: input.inflasiBiayaTahunan,
        marginKontribusiPersen: input.marginKontribusiPersen,
        ekuitasAwal: input.ekuitasAwal,
        kewajibanLain: input.kewajibanLain,
        deltaPendapatanBulanan: input.deltaPendapatanBulanan,
        deltaOpexBulanan: input.deltaOpexBulanan,
        discountRateTahunan: input.discountRateTahunan,
        pertumbuhanTerminalTahunan: null,
      };
      const c = computeScenario(scenario);
      raws.push({
        jenisSkema: s.jenisSkema,
        jenisAkad: s.jenisAkad,
        basisTingkatBiaya: s.basisTingkatBiaya,
        tenorBulan,
        tingkatBiayaTahunan,
        earPersen: c.schedule.earPersen,
        npv: c.varian.base.npv,
        npvWithTerminal: c.npvWithTerminal,
        irrTahunanPersen: c.varian.base.irr.irrTahunanPersen,
        dscrRataRata: c.varian.base.dscrRataRata,
        dscrMinimum: c.varian.base.dscrMinimum,
        status: c.status,
      });
    }
  }

  // Normalisasi tiap metrik pada pool kandidat.
  const dscrN = normalize(raws.map((r) => r.dscrRataRata), true);
  const npvN = normalize(raws.map((r) => r.npv), true);
  const earN = normalize(raws.map((r) => r.earPersen), false); // EAR rendah lebih baik
  const irrN = normalize(raws.map((r) => r.irrTahunanPersen), true);

  const scored: CandidateStructure[] = raws.map((r, i) => ({
    ...r,
    score: 0.4 * dscrN[i] + 0.3 * npvN[i] + 0.2 * earN[i] + 0.1 * irrN[i],
    peringkat: 0,
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map((c, i) => ({ ...c, peringkat: i + 1 }));
}
