/**
 * Sharia Reasoning Agent (V5.3) - IMPLEMENTATION_PLAN V5 instr 3.
 *
 * Pemeriksaan kepatuhan syariah rule-based atas struktur pembiayaan:
 *  - murabahah/ijarah: basis flat (margin/ujrah fix) - efektif menyerupai bunga berjalan.
 *  - musyarakah mutanaqishah: basis efektif (imbal atas sisa porsi bank).
 *  - konvensional: di luar lingkup syariah (flagged).
 *  - riba: EAR > ambang -> peringatan.
 * Output: status + temuan + checklist konfirmasi DPS. Fungsi murni.
 */
import type { ScenarioComputation, ScenarioInput } from "@/lib/engine";
import { formatPersen } from "@/lib/format";

export type ShariaStatus = "SYARIAH" | "TIDAK_SESUI" | "PERLU_KONFIRMASI_DPS";
export type FindingLevel = "ok" | "warning" | "violation";

export interface ShariaFinding {
  level: FindingLevel;
  rule: string;
  message: string;
}

export interface DpsItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface ShariaCheckResult {
  status: ShariaStatus;
  findings: ShariaFinding[];
  dpsChecklist: DpsItem[];
  summary: string;
}

const RIBA_THRESHOLD = 20; // EAR % di atas ini = peringatan riba

const DPS_GENERIC: DpsItem[] = [
  { id: "akad_sesuai_fatwa", label: "Akad sesuai ketentuan/fatwa DSN-MUI", checked: false },
  { id: "tanpa_riba", label: "Tidak mengandung unsur riba", checked: false },
  { id: "tanpa_gharar", label: "Tidak ada gharar/maysir berlebihan", checked: false },
  { id: "biaya_transparan", label: "Biaya transparan dan disepakati di awal", checked: false },
];

const DPS_MURABAHAH: DpsItem[] = [
  { id: "barang_pokok", label: "Barang pokok tersedia dan diserahterimakan", checked: false },
  { id: "margin_awal", label: "Margin disepakati di awal akad", checked: false },
];

const DPS_IJARAH: DpsItem[] = [
  { id: "objek_manfaat", label: "Objek manfaat jelas dan dimiliki lessor", checked: false },
  { id: "ujrah_awal", label: "Ujrah disepakati di awal akad", checked: false },
];

const DPS_MMQ: DpsItem[] = [
  { id: "kepemilikan_sewa", label: "Skema kepemilikan dan sewa berjalan sesuai", checked: false },
  { id: "imbal_hasil_adil", label: "Pembagian imbal hasil atas sisa porsi adil", checked: false },
];

function summaryFor(status: ShariaStatus): string {
  switch (status) {
    case "SYARIAH":
      return "Struktur sesuai prinsip syariah berdasarkan pemeriksaan otomatis. Konfirmasi Dewan Pengawas Syariah (DPS) tetap dianjurkan sebelum eksekusi.";
    case "TIDAK_SESUI":
      return "Struktur TIDAK SESUAI prinsip syariah (lihat temuan). Skema konvensional berada di luar lingkup pembiayaan syariah.";
    case "PERLU_KONFIRMASI_DPS":
      return "Tidak ada pelanggaran mutlak, tetapi ada indikator yang wajib dikonfirmasi Dewan Pengawas Syariah (DPS) sebelum eksekusi.";
  }
}

export function checkShariaCompliance(
  input: ScenarioInput,
  comp: ScenarioComputation,
): ShariaCheckResult {
  const findings: ShariaFinding[] = [];
  const ear = comp.schedule.earPersen;
  let dps: DpsItem[] = [];

  if (input.jenisSkema === "konvensional") {
    findings.push({
      level: "violation",
      rule: "Skema",
      message:
        "Skema konvensional memakai bunga - berada di luar lingkup pembiayaan syariah.",
    });
  } else {
    const akad = input.jenisAkad;
    if (akad === "murabahah") {
      dps = [...DPS_GENERIC, ...DPS_MURABAHAH];
      if (input.basisTingkatBiaya === "flat") {
        findings.push({ level: "ok", rule: "Basis murabahah", message: "Margin murabahah flat (fix di awal) - sesuai prinsip murabahah." });
      } else {
        findings.push({ level: "violation", rule: "Basis murabahah", message: "Murabahah mensyaratkan margin flat; basis efektif menyerupai bunga berjalan (riba)." });
      }
    } else if (akad === "ijarah") {
      dps = [...DPS_GENERIC, ...DPS_IJARAH];
      if (input.basisTingkatBiaya === "flat") {
        findings.push({ level: "ok", rule: "Basis ijarah", message: "Ujrah ijarah flat (fix di awal) - sesuai prinsip ijarah." });
      } else {
        findings.push({ level: "violation", rule: "Basis ijarah", message: "Ijarah mensyaratkan ujrah flat; basis efektif menyerupai bunga berjalan (riba)." });
      }
    } else if (akad === "musyarakah_mutanaqishah") {
      dps = [...DPS_GENERIC, ...DPS_MMQ];
      if (input.basisTingkatBiaya === "efektif") {
        findings.push({ level: "ok", rule: "Basis MMQ", message: "Imbal hasil MMQ atas sisa porsi bank (efektif) - sesuai prinsip musyarakah mutanaqishah." });
      } else {
        findings.push({ level: "violation", rule: "Basis MMQ", message: "MMQ biasanya berbasis efektif (imbal atas sisa porsi); basis flat tidak lazim - perlu tinjau DPS." });
      }
    }
  }

  // Pemeriksaan riba (berlaku semua skema).
  if (ear !== null && ear > RIBA_THRESHOLD) {
    findings.push({
      level: "warning",
      rule: "Batas riba",
      message: `Biaya efektif (EAR) ${formatPersen(ear, 2)} di atas ambang ${RIBA_THRESHOLD}% - mendekati praktik riba, wajib dikonfirmasi DPS.`,
    });
  } else if (ear !== null) {
    findings.push({ level: "ok", rule: "Batas biaya", message: `Biaya efektif (EAR) ${formatPersen(ear, 2)} di bawah ambang ${RIBA_THRESHOLD}%.` });
  }

  const hasViolation = findings.some((f) => f.level === "violation");
  const hasWarning = findings.some((f) => f.level === "warning");
  const status: ShariaStatus = hasViolation
    ? "TIDAK_SESUI"
    : hasWarning
      ? "PERLU_KONFIRMASI_DPS"
      : "SYARIAH";

  return {
    status,
    findings,
    dpsChecklist: dps,
    summary: summaryFor(status),
  };
}

/** Apakah seluruh item checklist DPS sudah dicentang (konfirmasi tuntas). */
export function isDpsConfirmed(checklist: DpsItem[]): boolean {
  return checklist.length > 0 && checklist.every((c) => c.checked);
}
