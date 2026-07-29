/**
 * Helper numerik murni untuk engine: NPV pada tingkat bulanan dan pencari akar IRR.
 * Tidak ada import selain Math; tidak ada efek samping, db, fetch, atau env.
 */

/**
 * NPV dari deret arus kas pada tingkat diskonto bulanan (sebagai fraction).
 * Indeks 0 adalah t=0 (arang awal, biasanya negatif), indeks t adalah t bulan.
 *   NPV = Σ_{t} cf[t] / (1 + r)^t
 */
export function npvAtMonthlyRate(cashflow: number[], monthlyRate: number): number {
  const factor = 1 + monthlyRate;
  let sum = 0;
  let pow = 1; // (1+r)^0
  for (const cf of cashflow) {
    sum += cf / pow;
    pow *= factor;
  }
  return sum;
}

/** Turunan pertama NPV terhadap tingkat bulanan (untuk Newton-Raphson). */
function npvDerivative(cashflow: number[], monthlyRate: number): number {
  const factor = 1 + monthlyRate;
  let sum = 0;
  let pow = factor; // (1+r)^1
  for (let t = 1; t < cashflow.length; t++) {
    sum += (-t * cashflow[t]) / pow;
    pow *= factor;
  }
  return sum;
}

/** Jumlah pergantian tanda pada deret arus kas (nol diabaikan). */
export function signChangeCount(cashflow: number[]): number {
  let prev = 0;
  let count = 0;
  for (const cf of cashflow) {
    const s = cf > 0 ? 1 : cf < 0 ? -1 : 0;
    if (s !== 0) {
      if (prev !== 0 && s !== prev) count++;
      prev = s;
    }
  }
  return count;
}

/**
 * Mengembalikan tanda terbatas untuk nilai yang meluap (Infinity/-Infinity):
 * pada tingkat sangat negatif suku terakhir cf[n] mendominasi, pada tingkat
 * sangat positif npv -> cf[0]. Ini menjaga logika tanda tetap benar tanpa
 * terganggu underflow (1+r)^t untuk tenor panjang.
 */
function finiteOrSign(v: number, cashflow: number[], atLowRate: boolean): number {
  if (Number.isFinite(v)) return v;
  if (atLowRate) {
    // tingkat rendah: suku terakhir mendominasi
    const last = cashflow[cashflow.length - 1];
    return last >= 0 ? 1 : -1;
  }
  // tingkat tinggi: cf[0] mendominasi
  return cashflow[0] >= 0 ? 1 : -1;
}

/**
 * Cari IRR bulanan (sebagai fraction) yang membuat NPV(cashflow) = 0 pada rentang
 * [-0.99, 10]. Newton-Raphson dengan fallback bisection. Mengembalikan null bila
 * tidak ada perubahan tanda NPV di rentang (IRR tak terdefinisi).
 *
 * Rentang [-0.99, 10] bulanan = annual [≈ -100%, +213%+], mencakup seluruh kasus
 * realistis. Nilai di tepi dievaluasi via finiteOrSign agar tidak pecah oleh
 * underflow floating-point pada tenor panjang.
 */
export function solveMonthlyIRR(cashflow: number[]): number | null {
  if (cashflow.length < 2) return null;
  // Tanpa pergantian tanda (semua nol / searah) -> IRR tak terdefinisi.
  if (signChangeCount(cashflow) === 0) return null;
  const LO = -0.99;
  const HI = 10;

  const f = (r: number) => npvAtMonthlyRate(cashflow, r);
  const fLoRaw = f(LO);
  const fHiRaw = f(HI);
  if (Number.isNaN(fLoRaw) || Number.isNaN(fHiRaw)) return null;
  const fLo = finiteOrSign(fLoRaw, cashflow, true);
  const fHi = finiteOrSign(fHiRaw, cashflow, false);

  if (fLo === 0) return LO;
  if (fHi === 0) return HI;
  // butuh pergantian tanda agar ada akar di bracket
  if ((fLo > 0 && fHi > 0) || (fLo < 0 && fHi < 0)) return null;

  // 1) Newton-Raphson dari titik awal 0.1
  let rate = 0.1;
  for (let i = 0; i < 80; i++) {
    const fv = f(rate);
    const df = npvDerivative(cashflow, rate);
    if (!Number.isFinite(df) || df === 0) break;
    const next = rate - fv / df;
    if (!Number.isFinite(next) || next <= LO || next >= HI) break; // keluar bracket -> bisection
    if (Math.abs(next - rate) < 1e-13) {
      rate = next;
      break;
    }
    rate = next;
  }
  const fAtRate = f(rate);
  if (Number.isFinite(fAtRate) && Math.abs(fAtRate) < 1e-7 && rate > LO && rate < HI) {
    return rate;
  }

  // 2) Fallback bisection pada [LO, HI]
  let a = LO;
  let b = HI;
  let fa = fLo;
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    const fmRaw = f(m);
    if (Number.isNaN(fmRaw)) return null;
    const fm = Number.isFinite(fmRaw) ? fmRaw : finiteOrSign(fmRaw, cashflow, m < 0);
    if (Math.abs(fm) < 1e-13 || (b - a) / 2 < 1e-14) return m;
    if ((fa > 0) === (fm > 0)) {
      a = m;
      fa = fm;
    } else {
      b = m;
    }
  }
  return (a + b) / 2;
}
