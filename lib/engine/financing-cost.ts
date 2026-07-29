/**
 * Jadwal pembiayaan untuk empat skema - IMPLEMENTATION_PLAN §6.2.
 * P = kebutuhan dana, n = tenor bulan, r = tingkat tahunan (fraction).
 *
 * Catatan basis (§6.1): untuk basis efektif, tingkat tahunan diperlakukan
 * sebagai nominal tahunan yang dibagi 12 -> i = r/12 (praktik pasar). Akibatnya
 * EAR hasil normalisasi sedikit lebih tinggi dari angka kuotasi karena efek
 * majemuk (kuotasi 12% -> EAR 12,68%).
 */
import { effectiveAnnualRateOfSchedule } from "./rate-conversion";

export interface FinancingCostInput {
  kebutuhanDana: number;
  tenorBulan: number;
  jenisSkema: "syariah" | "konvensional";
  jenisAkad: "murabahah" | "ijarah" | "musyarakah_mutanaqishah" | null;
  tingkatBiayaTahunan: number; // persen
  basisTingkatBiaya: "flat" | "efektif";
}

export interface FinancingSchedule {
  angsuran: number[]; // D_t, total kewajiban per bulan (pokok + imbalan)
  porsiPokok: number[];
  porsiImbalan: number[];
  totalPembayaran: number;
  totalImbalan: number;
  earPersen: number | null; // hasil normalisasi
}

type ScheduleKind = "annuity" | "flat" | "mmq";

function kindOf(input: FinancingCostInput): ScheduleKind {
  if (input.jenisAkad === "musyarakah_mutanaqishah") {
    if (input.basisTingkatBiaya === "flat") {
      // MMQ secara definisi bekerja atas sisa porsi kepemilikan; basis flat
      // ditolak pada validasi (Fase 3). Pertahankan guard defensif di engine.
      throw new Error(
        "Musyarakah mutanaqishah hanya berlaku untuk basis efektif.",
      );
    }
    return "mmq";
  }
  return input.basisTingkatBiaya === "flat" ? "flat" : "annuity";
}

export function buildFinancingSchedule(
  input: FinancingCostInput,
): FinancingSchedule {
  const P = input.kebutuhanDana;
  const n = input.tenorBulan;
  const r = input.tingkatBiayaTahunan / 100; // annual fraction
  const i = r / 12; // nominal monthly fraction (basis efektif)

  const angsuran = new Array<number>(n);
  const porsiPokok = new Array<number>(n);
  const porsiImbalan = new Array<number>(n);

  switch (kindOf(input)) {
    case "annuity": {
      // A = P·i(1+i)^n / ((1+i)^n - 1); bila i = 0 angsuran rata P/n.
      const growth = Math.pow(1 + i, n);
      const A = i === 0 ? P / n : (P * i * growth) / (growth - 1);
      let sisa = P;
      for (let t = 0; t < n; t++) {
        const imbalan = sisa * i;
        const pokok = A - imbalan;
        angsuran[t] = A;
        porsiPokok[t] = pokok;
        porsiImbalan[t] = imbalan;
        sisa -= pokok;
      }
      break;
    }
    case "flat": {
      // Harga jual H = P(1 + r·n/12); angsuran = H/n; pokok = P/n; margin = (H-P)/n.
      const H = P * (1 + (r * n) / 12);
      const angsuranFlat = H / n;
      const pokokFlat = P / n;
      const marginFlat = (H - P) / n;
      for (let t = 0; t < n; t++) {
        angsuran[t] = angsuranFlat;
        porsiPokok[t] = pokokFlat;
        porsiImbalan[t] = marginFlat;
      }
      break;
    }
    case "mmq": {
      // Pengalihan porsi lurus + imbalan atas sisa kepemilikan -> angsuran menurun.
      const pokokPerBulan = P / n;
      let sisa = P;
      for (let t = 0; t < n; t++) {
        const imbalan = sisa * i;
        angsuran[t] = pokokPerBulan + imbalan;
        porsiPokok[t] = pokokPerBulan;
        porsiImbalan[t] = imbalan;
        sisa -= pokokPerBulan;
      }
      break;
    }
  }

  let totalPembayaran = 0;
  let totalImbalan = 0;
  for (let t = 0; t < n; t++) {
    totalPembayaran += angsuran[t];
    totalImbalan += porsiImbalan[t];
  }

  const earPersen = effectiveAnnualRateOfSchedule(P, angsuran);

  return {
    angsuran,
    porsiPokok,
    porsiImbalan,
    totalPembayaran,
    totalImbalan,
    earPersen,
  };
}
