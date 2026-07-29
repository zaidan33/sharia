/**
 * Pemetaan antara baris DB, input engine, dan hasil perhitungan.
 * Dipakai Server Action dan skrip seed. Bukan bagian engine (boleh impor db).
 */
import type { ScenarioComputation, ScenarioInput } from "@/lib/engine";
import { scenarios } from "@/db/schema/scenarios";

type ScenarioRow = typeof scenarios.$inferSelect;

/** Konversi string numerik DB -> number untuk engine (bigint sudah number). */
export function dbRowToScenarioInput(row: ScenarioRow): ScenarioInput {
  return {
    nama: row.nama,
    jenisUsaha: row.jenisUsaha,
    tujuanPembiayaan: row.tujuanPembiayaan,
    profilRisiko: row.profilRisiko,
    kebutuhanDana: row.kebutuhanDana,
    tenorBulan: row.tenorBulan,
    jenisSkema: row.jenisSkema,
    jenisAkad: row.jenisAkad,
    tingkatBiayaTahunan: Number(row.tingkatBiayaTahunan),
    basisTingkatBiaya: row.basisTingkatBiaya,
    pendapatanBulananAwal: row.pendapatanBulananAwal,
    opexBulananAwal: row.opexBulananAwal,
    pertumbuhanPendapatanTahunan: Number(row.pertumbuhanPendapatanTahunan),
    inflasiBiayaTahunan: Number(row.inflasiBiayaTahunan),
    marginKontribusiPersen: Number(row.marginKontribusiPersen),
    ekuitasAwal: row.ekuitasAwal,
    kewajibanLain: row.kewajibanLain,
    deltaPendapatanBulanan: row.deltaPendapatanBulanan,
    deltaOpexBulanan: row.deltaOpexBulanan,
    discountRateTahunan: Number(row.discountRateTahunan),
  };
}

/**
 * Kolom skenario siap tulis: persen di-string-kan (kolom numeric butuh string),
 * uang tetap number (bigint mode:number). Dipakai insert & update.
 */
export function scenarioInputToFields(data: ScenarioInput) {
  return {
    nama: data.nama,
    jenisUsaha: data.jenisUsaha,
    tujuanPembiayaan: data.tujuanPembiayaan,
    profilRisiko: data.profilRisiko,
    kebutuhanDana: data.kebutuhanDana,
    tenorBulan: data.tenorBulan,
    jenisSkema: data.jenisSkema,
    jenisAkad: data.jenisAkad,
    tingkatBiayaTahunan: String(data.tingkatBiayaTahunan),
    basisTingkatBiaya: data.basisTingkatBiaya,
    pendapatanBulananAwal: data.pendapatanBulananAwal,
    opexBulananAwal: data.opexBulananAwal,
    pertumbuhanPendapatanTahunan: String(data.pertumbuhanPendapatanTahunan),
    inflasiBiayaTahunan: String(data.inflasiBiayaTahunan),
    marginKontribusiPersen: String(data.marginKontribusiPersen),
    ekuitasAwal: data.ekuitasAwal,
    kewajibanLain: data.kewajibanLain,
    deltaPendapatanBulanan: data.deltaPendapatanBulanan,
    deltaOpexBulanan: data.deltaOpexBulanan,
    discountRateTahunan: String(data.discountRateTahunan),
  };
}

export function scenarioInputToInsert(data: ScenarioInput, userId: string) {
  return { userId, ...scenarioInputToFields(data) };
}

/** numeric DB butuh string; uang (bigint) integer dibulatkan ke rupiah penuh. */
function num(v: number | null | undefined): string | null {
  return v === null || v === undefined ? null : String(v);
}

/** Untuk kolom NOT NULL - EAR & ROI selalu terdefinisi untuk input valid
 *  (pokok >= 1 jt); fallback 0 hanya untuk input degenerate yang tak lolos validasi. */
function numNN(v: number | null | undefined): string {
  return String(v ?? 0);
}

/** Hanya kolom metrik (tanpa scenarioId) - dipakai untuk upsert set. */
export function resultMetrics(comp: ScenarioComputation) {
  return {
    earPersen: numNN(comp.schedule.earPersen),
    angsuranPertama: Math.round(comp.schedule.angsuran[0] ?? 0),
    totalPembayaran: Math.round(comp.schedule.totalPembayaran),
    dscrRataRata: num(comp.varian.base.dscrRataRata),
    dscrMinimum: num(comp.varian.base.dscrMinimum),
    dscrRataRataWorst: num(comp.varian.worst.dscrRataRata),
    npv: Math.round(comp.varian.base.npv),
    irrPersen: num(comp.varian.base.irr.irrTahunanPersen),
    irrUnik: comp.varian.base.irr.unik,
    der: num(comp.der),
    roiTahunanPersen: numNN(comp.roiTahunanPersen),
    bepOmzetBulanan: Math.round(comp.breakEven.bepRupiah),
    status: comp.status,
  };
}

/** Baris siap-insert untuk scenario_results. */
export function toResultRow(scenarioId: number, comp: ScenarioComputation) {
  return { scenarioId, ...resultMetrics(comp) };
}
