# Implementation Plan — Analytical Engine & Web App Kelayakan Pembiayaan

**Versi:** 1.1
**Untuk:** implementasi dengan Claude Code
**Boilerplate:** https://github.com/CodeGuide-dev/codeguide-starter-fullstack
**Rujukan produk:** `PRD.md` v1.1 — cakupan, definisi metrik, dan rasional fitur

---

## 1. Ringkasan Teknis

| Kebutuhan | Komponen |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack), TypeScript strict |
| Autentikasi | Better Auth — akun tertutup, tanpa pendaftaran publik |
| Database | Drizzle ORM + PostgreSQL 16 |
| UI | Tailwind CSS v4 + shadcn/ui (New York style) |
| Grafik | Recharts |
| Validasi | Zod, dipakai bersama untuk form dan Server Action |
| Font | Poppins, Inter, JetBrains Mono via `next/font/google` |
| Engine perhitungan | Modul TypeScript murni di `/lib/engine/`, dipanggil dari Server Actions |
| Pengujian | Vitest untuk engine, Playwright (opsional) untuk alur kritis |

**Aturan yang mengikat sepanjang implementasi:**

1. Modul di `/lib/engine/` adalah fungsi murni. Tidak mengimpor `db`, tidak memanggil `fetch`, tidak membaca `process.env`.
2. Uang direpresentasikan sebagai `bigint` di database dan `number` bilangan bulat rupiah di engine. Tidak ada uang bertipe `float` yang disimpan.
3. Tidak ada `NaN` atau `Infinity` yang keluar dari engine. Nilai yang tak terdefinisi dikembalikan sebagai `null` dan ditangani UI (`PRD.md` §10).
4. Setiap Server Action memverifikasi sesi dan kepemilikan baris sebelum menyentuh data.

## 2. Setup Proyek

```bash
git clone https://github.com/CodeGuide-dev/codeguide-starter-fullstack.git kelayakan-pembiayaan
cd kelayakan-pembiayaan
npm install
cp .env.example .env      # isi dulu variabel di bawah sebelum lanjut
npm run db:up             # PostgreSQL via Docker
npm run db:push           # setelah skema Bagian 4 dibuat
npm run dev
```

Dependency tambahan untuk MVP:

```bash
npm install recharts zod
npm install -D vitest @vitest/coverage-v8 tsx
npx shadcn@latest add card table badge tabs select form input label button separator dialog alert tooltip skeleton sonner
```

Script tambahan di `package.json`:

```json
{
  "scripts": {
    "db:seed": "tsx db/seed.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Variabel `.env` yang harus terisi:

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | koneksi PostgreSQL |
| `BETTER_AUTH_SECRET` | rahasia sesi, hasil `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` saat pengembangan |
| `SEED_USER_EMAIL` | email akun awal yang dibuat skrip seed |
| `SEED_USER_PASSWORD` | kata sandi akun awal |

Pendaftaran publik dimatikan di `lib/auth.ts` (`emailAndPassword.disableSignUp: true`). Akun awal dibuat oleh `db/seed.ts` dari dua variabel terakhir.

## 3. Struktur Folder (MVP)

```
app/
  page.tsx                       -> landing page
  layout.tsx                     -> font + tema
  globals.css                    -> token warna (Bagian 10)
  (auth)/sign-in/page.tsx
  dashboard/
    page.tsx                     -> daftar skenario
    loading.tsx
  scenarios/
    new/page.tsx                 -> form skenario baru
    [id]/
      page.tsx                   -> detail hasil skenario
      edit/page.tsx              -> ubah skenario
      loading.tsx
      error.tsx
      not-found.tsx
components/
  ui/                            -> komponen shadcn (dari boilerplate)
  landing/
    hero.tsx
    comparison-visual.tsx        -> elemen signature (Bagian 9)
    problem-section.tsx
    how-it-works.tsx
    transparency-section.tsx
    cta-section.tsx
  scenario/
    scenario-form.tsx            -> form 4 langkah
    scenario-card.tsx
    scenario-empty-state.tsx
    cashflow-table.tsx
    cashflow-chart.tsx
    dscr-indicator.tsx
    dscr-chart.tsx
    metric-card.tsx
    formula-panel.tsx            -> "Bagaimana ini dihitung"
    variant-tabs.tsx             -> base / best / worst
    delete-scenario-dialog.tsx
    model-caveats.tsx            -> batasan model (PRD §11)
lib/
  engine/
    financing-cost.ts
    cashflow.ts
    ratios.ts
    valuation.ts
    rate-conversion.ts           -> normalisasi EAR
    index.ts                     -> computeScenario(): orkestrasi satu skenario
    __tests__/
      financing-cost.test.ts
      cashflow.test.ts
      ratios.test.ts
      valuation.test.ts
      golden-seed.test.ts        -> uji 20 kasus terhadap Bagian 8
  actions/
    scenario-actions.ts
  validation/
    scenario-schema.ts           -> Zod, dipakai form + action
  auth.ts                        -> dari boilerplate, sign-up dimatikan
  format.ts                      -> formatRupiah, formatPersen, formatRasio
  utils.ts
  ai/                            -> placeholder kosong untuk V4–V5
db/
  schema/
    scenarios.ts
    scenario-results.ts
    index.ts
  seed.ts
  index.ts
```

## 4. Skema Database

Skema ini sengaja disederhanakan dari desain lengkap V2–V5 (yang memisahkan `assumptions`, `akad_structures`, dan `simulation_runs` sebagai tabel tersendiri). Untuk MVP seluruh asumsi digabung dalam satu tabel `scenarios`; migrasi ke skema penuh dilakukan saat fitur V2+ mulai dikerjakan. Enum dideklarasikan sebagai `pgEnum` agar penambahan akad baru nanti terkendali dan tidak menjadi teks bebas.

```typescript
// db/schema/scenarios.ts
import {
  pgTable, pgEnum, serial, text, integer, bigint, numeric, timestamp, index,
} from 'drizzle-orm/pg-core';
import { user } from './auth'; // dari boilerplate Better Auth

export const jenisSkemaEnum   = pgEnum('jenis_skema', ['syariah', 'konvensional']);
export const jenisAkadEnum    = pgEnum('jenis_akad', ['murabahah', 'ijarah', 'musyarakah_mutanaqishah']);
export const basisTingkatEnum = pgEnum('basis_tingkat', ['flat', 'efektif']);
export const profilRisikoEnum = pgEnum('profil_risiko', ['rendah', 'sedang', 'tinggi']);

export const scenarios = pgTable('scenarios', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),

  // Identitas
  nama: text('nama').notNull(),
  jenisUsaha: text('jenis_usaha').notNull(),
  tujuanPembiayaan: text('tujuan_pembiayaan').notNull(),
  profilRisiko: profilRisikoEnum('profil_risiko').notNull(),

  // Struktur pembiayaan — nilai uang dalam rupiah penuh, bigint
  kebutuhanDana: bigint('kebutuhan_dana', { mode: 'number' }).notNull(),
  tenorBulan: integer('tenor_bulan').notNull(),
  jenisSkema: jenisSkemaEnum('jenis_skema').notNull(),
  jenisAkad: jenisAkadEnum('jenis_akad'),                                 // null bila konvensional
  tingkatBiayaTahunan: numeric('tingkat_biaya_tahunan', { precision: 6, scale: 3 }).notNull(),
  basisTingkatBiaya: basisTingkatEnum('basis_tingkat_biaya').notNull(),

  // Kondisi usaha saat ini
  pendapatanBulananAwal: bigint('pendapatan_bulanan_awal', { mode: 'number' }).notNull(),
  opexBulananAwal: bigint('opex_bulanan_awal', { mode: 'number' }).notNull(),
  pertumbuhanPendapatanTahunan: numeric('pertumbuhan_pendapatan_tahunan', { precision: 6, scale: 3 }).notNull(),
  inflasiBiayaTahunan: numeric('inflasi_biaya_tahunan', { precision: 6, scale: 3 }).notNull(),
  marginKontribusiPersen: numeric('margin_kontribusi_persen', { precision: 5, scale: 2 }).notNull(),
  ekuitasAwal: bigint('ekuitas_awal', { mode: 'number' }).notNull(),
  kewajibanLain: bigint('kewajiban_lain', { mode: 'number' }).notNull().default(0),

  // Dampak pembiayaan (untuk NPV/IRR inkremental)
  deltaPendapatanBulanan: bigint('delta_pendapatan_bulanan', { mode: 'number' }).notNull(),
  deltaOpexBulanan: bigint('delta_opex_bulanan', { mode: 'number' }).notNull(),

  // Asumsi valuasi
  discountRateTahunan: numeric('discount_rate_tahunan', { precision: 6, scale: 3 }).notNull().default('12'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index('scenarios_user_created_idx').on(t.userId, t.createdAt),
}));
```

```typescript
// db/schema/scenario-results.ts
import { pgTable, pgEnum, serial, integer, numeric, bigint, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { scenarios } from './scenarios';

export const statusKelayakanEnum = pgEnum('status_kelayakan', ['LAYAK', 'WASPADA', 'TIDAK_LAYAK']);

// Cache hasil perhitungan agar dashboard tidak menghitung ulang setiap render.
// Satu baris per skenario -> unique index supaya upsert bisa memakai onConflict.
export const scenarioResults = pgTable('scenario_results', {
  id: serial('id').primaryKey(),
  scenarioId: integer('scenario_id')
    .references(() => scenarios.id, { onDelete: 'cascade' })
    .notNull(),

  // Semua ringkasan diambil dari varian `base`
  earPersen: numeric('ear_persen', { precision: 8, scale: 4 }).notNull(),
  angsuranPertama: bigint('angsuran_pertama', { mode: 'number' }).notNull(),
  totalPembayaran: bigint('total_pembayaran', { mode: 'number' }).notNull(),

  dscrRataRata: numeric('dscr_rata_rata', { precision: 10, scale: 4 }),
  dscrMinimum: numeric('dscr_minimum', { precision: 10, scale: 4 }),
  dscrRataRataWorst: numeric('dscr_rata_rata_worst', { precision: 10, scale: 4 }),

  npv: bigint('npv', { mode: 'number' }),
  irrPersen: numeric('irr_persen', { precision: 8, scale: 4 }),          // null bila tak terdefinisi
  irrUnik: boolean('irr_unik'),                                          // false bila arus kas berganti tanda > 1x
  der: numeric('der', { precision: 10, scale: 4 }),
  roiTahunanPersen: numeric('roi_tahunan_persen', { precision: 10, scale: 4 }),
  bepOmzetBulanan: bigint('bep_omzet_bulanan', { mode: 'number' }),

  status: statusKelayakanEnum('status').notNull(),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  scenarioUnique: uniqueIndex('scenario_results_scenario_id_key').on(t.scenarioId),
}));
```

Kolom yang boleh `null` adalah kolom yang metriknya bisa tak terdefinisi menurut `PRD.md` §10. Tidak ada nilai sentinel semacam `-999`.

## 5. Validasi (`lib/validation/scenario-schema.ts`)

Satu skema Zod dipakai oleh form klien dan Server Action, sehingga aturan tidak perlu ditulis dua kali dan tidak bisa berbeda.

```typescript
import { z } from 'zod';

export const scenarioInputSchema = z.object({
  nama: z.string().trim().min(3).max(120),
  jenisUsaha: z.string().trim().min(2).max(60),
  tujuanPembiayaan: z.string().trim().min(3).max(200),
  profilRisiko: z.enum(['rendah', 'sedang', 'tinggi']),

  kebutuhanDana: z.number().int().min(1_000_000).max(500_000_000_000),
  tenorBulan: z.number().int().min(3).max(240),
  jenisSkema: z.enum(['syariah', 'konvensional']),
  jenisAkad: z.enum(['murabahah', 'ijarah', 'musyarakah_mutanaqishah']).nullable(),
  tingkatBiayaTahunan: z.number().min(0).max(60),
  basisTingkatBiaya: z.enum(['flat', 'efektif']),

  pendapatanBulananAwal: z.number().int().min(0),
  opexBulananAwal: z.number().int().min(0),
  pertumbuhanPendapatanTahunan: z.number().min(-50).max(100),
  inflasiBiayaTahunan: z.number().min(-20).max(50),
  marginKontribusiPersen: z.number().min(1).max(100),
  ekuitasAwal: z.number().int().min(1),
  kewajibanLain: z.number().int().min(0),

  deltaPendapatanBulanan: z.number().int().min(0),
  deltaOpexBulanan: z.number().int().min(0),
  discountRateTahunan: z.number().min(0).max(40),
})
  .refine((v) => v.jenisSkema === 'konvensional' ? v.jenisAkad === null : v.jenisAkad !== null, {
    message: 'Jenis akad wajib diisi untuk skema syariah dan harus kosong untuk konvensional.',
    path: ['jenisAkad'],
  })
  .refine((v) => v.deltaOpexBulanan < v.deltaPendapatanBulanan, {
    message: 'Tambahan opex harus lebih kecil dari tambahan pendapatan, jika tidak proyek tidak akan pernah menghasilkan arus kas positif.',
    path: ['deltaOpexBulanan'],
  });

export type ScenarioInput = z.infer<typeof scenarioInputSchema>;
```

Catatan: `refine` kedua adalah penjaga kewarasan, bukan aturan finansial mutlak. Proyek yang menambah biaya lebih besar dari pendapatan memang mungkin ada (misalnya penggantian aset), tetapi untuk MVP kasus itu tidak dimodelkan — menolaknya lebih jujur daripada menghasilkan IRR yang tidak terdefinisi tanpa penjelasan.

## 6. Modul Engine (`/lib/engine/`)

Seluruh rumus dinyatakan lengkap di sini agar implementasi tidak perlu menebak. Notasi mengikuti `PRD.md` §5.

### 6.1 Konversi tingkat (`rate-conversion.ts`)

```typescript
/** Tingkat bulanan dari tingkat tahunan efektif: r_m = (1 + r_a)^(1/12) − 1 */
export function monthlyFromEffectiveAnnual(annualPercent: number): number;

/** Tingkat tahunan efektif dari tingkat bulanan: r_a = (1 + r_m)^12 − 1 */
export function effectiveAnnualFromMonthly(monthlyRate: number): number;

/**
 * EAR sebuah jadwal pembayaran: cari r_m yang membuat NPV dari
 * [−pokok, angsuran_1, …, angsuran_n] sama dengan nol, lalu tahunkan.
 * Ini satu-satunya cara EAR dihitung — tidak ada rumus pintas per akad.
 */
export function effectiveAnnualRateOfSchedule(pokok: number, schedule: number[]): number | null;
```

> **Penting.** Untuk skema konvensional, `tingkatBiayaTahunan` dengan basis `efektif` diperlakukan sebagai tingkat **nominal tahunan** yang dibagi 12 untuk memperoleh tingkat bulanan (praktik pasar). Akibatnya EAR hasil normalisasi sedikit lebih tinggi dari angka kuotasi karena efek majemuk: kuotasi 12% menghasilkan EAR 12,68%. Ini bukan bug, dan UI menampilkan keduanya berdampingan.

### 6.2 Biaya pembiayaan (`financing-cost.ts`)

```typescript
export interface FinancingCostInput {
  kebutuhanDana: number;
  tenorBulan: number;
  jenisSkema: 'syariah' | 'konvensional';
  jenisAkad: 'murabahah' | 'ijarah' | 'musyarakah_mutanaqishah' | null;
  tingkatBiayaTahunan: number;
  basisTingkatBiaya: 'flat' | 'efektif';
}

export interface FinancingSchedule {
  angsuran: number[];        // D_t, total kewajiban per bulan (pokok + imbalan)
  porsiPokok: number[];
  porsiImbalan: number[];
  totalPembayaran: number;
  totalImbalan: number;
  earPersen: number | null;  // hasil normalisasi
}

export function buildFinancingSchedule(input: FinancingCostInput): FinancingSchedule;
```

Rumus per skema, dengan `P` = kebutuhan dana, `n` = tenor bulan, `r` = tingkat tahunan:

| Skema | Basis | Angsuran per bulan |
|---|---|---|
| Anuitas konvensional | efektif | `i = r/12`; `A = P·i(1+i)ⁿ / ((1+i)ⁿ − 1)`; pokok_t = A − sisa_{t−1}·i |
| Murabahah | flat | Harga jual `H = P(1 + r·n/12)`; angsuran = `H/n`; pokok_t = `P/n`; margin_t = `(H−P)/n` |
| Murabahah | efektif | Sama dengan anuitas — margin dihitung atas saldo menurun |
| Ijarah | flat | Sama dengan murabahah flat; komponen disebut *ujrah*, bukan margin |
| Ijarah | efektif | Sama dengan anuitas |
| Musyarakah mutanaqishah | efektif | pokok_t = `P/n` (pengalihan porsi lurus); imbalan_t = `sisa_{t−1}·r/12`; angsuran_t = jumlah keduanya — menurun tiap bulan |
| Musyarakah mutanaqishah | flat | Ditolak pada validasi: MMQ secara definisi bekerja atas sisa porsi kepemilikan |

`earPersen` selalu dihitung dari `angsuran[]` yang dihasilkan, bukan dari `tingkatBiayaTahunan`.

### 6.3 Proyeksi arus kas (`cashflow.ts`)

```typescript
export type Variant = 'base' | 'best' | 'worst';

export const VARIANT_MULTIPLIERS: Record<Variant, { pendapatan: number; opex: number }> = {
  base:  { pendapatan: 1.00, opex: 1.00 },
  best:  { pendapatan: 1.08, opex: 0.97 },
  worst: { pendapatan: 0.90, opex: 1.05 },
};

export interface CashflowPeriod {
  bulan: number;             // 1..n
  pendapatan: number;
  opex: number;
  capex: number;
  cfads: number;             // pendapatan − opex − capex
  debtService: number;       // D_t dari financing schedule
  arusKasBersih: number;     // cfads − debtService
  arusKasInkremental: number;// Δpendapatan_t − Δopex_t
}

export function projectCashflow(
  input: CashflowInput,
  variant: Variant,
): CashflowPeriod[];
```

Deret proyeksi, dengan `g` = pertumbuhan tahunan, `f` = inflasi tahunan, `m` = pengali varian:

```
g_m = (1 + g)^(1/12) − 1
f_m = (1 + f)^(1/12) − 1

Pendapatan_t  = Pendapatan₀ · m_pendapatan · (1 + g_m)^(t−1)
Opex_t        = Opex₀       · m_opex       · (1 + f_m)^(t−1)
ΔPendapatan_t = ΔPendapatan₀· m_pendapatan · (1 + g_m)^(t−1)
ΔOpex_t       = ΔOpex₀      · m_opex       · (1 + f_m)^(t−1)
```

Bulan pertama memakai eksponen nol, sehingga nilai bulan 1 sama persis dengan input pengguna. Capex bawaan nol pada MVP; field disediakan agar V2 tidak perlu mengubah tanda tangan fungsi. Jadwal pembiayaan tidak dikalikan pengali varian — kewajiban ke pemberi dana tetap berapa pun realisasi usaha.

### 6.4 Rasio (`ratios.ts`)

```typescript
/** DSCR_t = CFADS_t / D_t. null bila D_t = 0. */
export function calculateDSCR(cashflow: CashflowPeriod[]): (number | null)[];

/** DER = (kebutuhanDana + kewajibanLain) / ekuitasAwal. null bila ekuitas = 0. */
export function calculateDER(kebutuhanDana: number, kewajibanLain: number, ekuitasAwal: number): number | null;

/**
 * ROI tahunan atas dana yang dibiayai:
 *   labaInkremental = Σ arusKasInkremental_t − totalImbalan
 *   ROI = (labaInkremental / kebutuhanDana) / (n/12) × 100
 * Dilaporkan sebagai persen per tahun, bukan kumulatif — supaya bisa
 * dibandingkan langsung dengan EAR dan discount rate.
 */
export function calculateROI(...): number;

/**
 * Break-even dalam omzet rupiah per bulan.
 *   biayaVariabel₀ = (1 − marginKontribusi) × Pendapatan₀
 *   biayaTetap₀    = Opex₀ − biayaVariabel₀
 *   BEP            = (biayaTetap₀ + D₁) / marginKontribusi
 * Dinyatakan dalam rupiah, bukan unit, karena input harga jual dan biaya
 * variabel per unit tidak dikumpulkan dan tidak bermakna untuk usaha jasa.
 */
export function calculateBreakEvenOmzet(...): { bepRupiah: number; persenDariOmzet: number; biayaTetapNegatif: boolean };
```

### 6.5 Valuasi (`valuation.ts`)

```typescript
/**
 * NPV atas arus kas INKREMENTAL, bukan arus kas seluruh usaha.
 *   r_m = (1 + discountRate)^(1/12) − 1
 *   NPV = −kebutuhanDana + Σ_{t=1..n} ΔCF_t / (1 + r_m)^t
 */
export function calculateNPV(cashflow: CashflowPeriod[], discountRateTahunan: number, investasiAwal: number): number;

/**
 * IRR bulanan dari [−investasiAwal, ΔCF_1, …, ΔCF_n], lalu ditahunkan:
 * IRR_a = (1 + IRR_m)^12 − 1.
 *
 * Newton-Raphson dengan fallback bisection pada rentang [−0.99, 10].
 * Mengembalikan null bila tidak ada perubahan tanda (tak terdefinisi).
 * `unik` bernilai false bila tanda arus kas berubah lebih dari sekali —
 * UI menandainya dan mengarahkan pengguna ke NPV.
 */
export function calculateIRR(
  cashflow: CashflowPeriod[],
  investasiAwal: number,
): { irrTahunanPersen: number | null; unik: boolean };
```

### 6.6 Orkestrasi (`index.ts`)

```typescript
export interface ScenarioComputation {
  schedule: FinancingSchedule;
  varian: Record<Variant, {
    cashflow: CashflowPeriod[];
    dscr: (number | null)[];
    dscrRataRata: number | null;
    dscrMinimum: number | null;
    npv: number;
    irr: { irrTahunanPersen: number | null; unik: boolean };
  }>;
  der: number | null;
  roiTahunanPersen: number;
  breakEven: { bepRupiah: number; persenDariOmzet: number; biayaTetapNegatif: boolean };
  status: 'LAYAK' | 'WASPADA' | 'TIDAK_LAYAK';
}

/** Satu-satunya pintu masuk perhitungan. Fungsi murni. */
export function computeScenario(input: ScenarioInput): ScenarioComputation;
```

Aturan status mengikuti `PRD.md` §5.1 dan dihitung dari varian `base`.

## 7. Vektor Uji Acuan (Golden Tests)

Nilai-nilai berikut dihitung secara independen dan menjadi acuan `vitest`. Toleransi: ±Rp1 untuk uang, ±0,0001 untuk tingkat dan rasio.

### 7.1 Jadwal pembiayaan — pokok Rp100.000.000, tenor 24 bulan

| Skema | Kuotasi | Angsuran bulan 1 | Angsuran bulan 24 | Total pembayaran | EAR |
|---|---|---|---|---|---|
| Anuitas konvensional | 12% efektif | Rp4.707.347,22 | Rp4.707.347,22 | Rp112.976.333,34 | 12,6825% |
| Murabahah flat | 8% flat | Rp4.833.333,33 | Rp4.833.333,33 | Rp116.000.000,00 | 15,7057% |
| Musyarakah mutanaqishah | 12% efektif | Rp5.166.666,67 | Rp4.208.333,33 | Rp112.500.000,00 | 12,6825% |

Dua baris pertama membuktikan inti produk: kuotasi 8% flat lebih mahal daripada 12% efektif.

### 7.2 NPV & IRR

Arus kas `[−100.000.000, 10.000.000 × 12]`, discount rate 12% per tahun:

| Besaran | Nilai acuan |
|---|---|
| `r_m` bulanan | 0,0094887929 |
| NPV | Rp12.915.159,90 |
| IRR bulanan | 0,0292285408 |
| IRR tahunan | 41,2999% |

### 7.3 Hasil acuan 20 kasus seed (varian base, discount rate 12%)

`golden-seed.test.ts` mencocokkan seluruh baris ini. Bila ada satu saja yang meleset, engine berubah perilaku dan perubahan itu harus disengaja.

| # | Skenario | EAR % | Angsuran-1 (jt) | DSCR rata² | DSCR worst | NPV (jt) | IRR % | DER | ROI th % | BEP % omzet | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Warung Kelontong Modern | 13,66 | 4,60 | 1,85 | 0,59 | 10 | 32,8 | 3,00 | 76,1 | 61 | LAYAK |
| 2 | Konveksi Seragam Sekolah | 11,57 | 8,18 | 3,23 | 1,57 | 20 | 18,0 | 2,75 | 37,0 | 49 | LAYAK |
| 3 | Klinik Pratama Sehat | 10,59 | 12,71 | 5,51 | 3,39 | 82 | 21,3 | 2,00 | 31,2 | 42 | LAYAK |
| 4 | Peternakan Ayam Petelur | 13,80 | 13,40 | 0,85 | 0,10 | −1 | 9,9 | 3,30 | 98,1 | 110 | TIDAK LAYAK |
| 5 | Bengkel Motor Jaya | 15,71 | 4,83 | 2,45 | 1,11 | 12 | 25,7 | 2,50 | 55,1 | 54 | LAYAK |
| 6 | Kedai Kopi Kekinian | 12,68 | 11,62 | 3,07 | 1,62 | 12 | 15,4 | 2,75 | 41,8 | 57 | LAYAK |
| 7 | Toko Bangunan Makmur | 13,30 | 18,93 | 1,85 | 0,61 | 42 | 23,6 | 2,00 | 55,4 | 63 | LAYAK |
| 8 | Bimbingan Belajar Cerdas | 10,47 | 5,54 | 3,58 | 2,15 | 20 | 30,3 | 2,17 | 60,3 | 62 | LAYAK |
| 9 | Konveksi Batik Nusantara | 12,68 | 22,67 | 3,63 | 1,88 | 46 | 17,6 | 2,00 | 36,7 | 48 | LAYAK |
| 10 | Usaha Laundry Kilat | 14,93 | 4,95 | 1,58 | 0,47 | −4 | 4,4 | 3,40 | 61,4 | 80 | WASPADA |
| 11 | Apotek Mandiri Sehat | 14,10 | 9,53 | 2,31 | 0,86 | 24 | 25,2 | 2,00 | 55,7 | 52 | LAYAK |
| 12 | Jasa Ekspedisi Lokal | 12,13 | 19,57 | 4,33 | 2,09 | 62 | 16,7 | 2,77 | 27,9 | 40 | LAYAK |
| 13 | Restoran Padang Sederhana | 10,11 | 11,24 | 3,63 | 1,78 | 48 | 22,2 | 2,00 | 39,9 | 49 | LAYAK |
| 14 | Startup Aplikasi Pertanian | 13,80 | 23,77 | −0,28 | −0,73 | −24 | 7,0 | 2,00 | 46,8 | 194 | TIDAK LAYAK |
| 15 | Toko Sembako Grosir | 12,71 | 47,08 | 1,78 | 0,60 | 85 | 21,4 | 2,00 | 54,5 | 52 | LAYAK |
| 16 | Percetakan Digital Prima | 12,68 | 13,17 | 3,54 | 1,58 | 28 | 15,9 | 2,75 | 30,6 | 51 | LAYAK |
| 17 | Homestay Wisata Alam | 11,57 | 15,50 | 6,08 | 4,18 | 72 | 17,3 | 1,50 | 24,5 | 47 | LAYAK |
| 18 | Pabrik Tahu Tempe Barokah | 13,24 | 10,04 | 3,26 | 1,30 | 29 | 19,3 | 2,75 | 36,8 | 41 | LAYAK |
| 19 | Klinik Kecantikan Estetika | 11,31 | 15,27 | 4,83 | 2,89 | 55 | 24,0 | 2,00 | 47,0 | 47 | LAYAK |
| 20 | Tambak Udang Vaname | 14,93 | 123,83 | 1,15 | 0,37 | −75 | 6,7 | 3,67 | 62,6 | 96 | WASPADA |

Sebaran hasil: 16 LAYAK, 2 WASPADA, 2 TIDAK LAYAK. Ketiga kasus berisiko tinggi (#4, #14, #20) tidak ada yang berstatus LAYAK, dan tidak ada kasus berisiko rendah yang gagal — sesuai kriteria `PRD.md` §14.3. Seluruh EAR berada di rentang 10,11%–15,71%, jadi skema syariah dan konvensional benar-benar sebanding meski basis kuotasinya berbeda (§14.4).

Kasus #14 sengaja dipertahankan sebagai penguji kasus batas: opex melebihi pendapatan sehingga CFADS negatif, DSCR negatif, dan BEP berada jauh di atas omzet saat ini. UI harus menampilkannya dengan penjelasan, bukan `NaN`.

## 8. Server Actions (`lib/actions/scenario-actions.ts`)

```typescript
'use server';

export async function createScenario(raw: unknown): Promise<ActionResult<{ id: number }>>;
export async function updateScenario(id: number, raw: unknown): Promise<ActionResult<{ id: number }>>;
export async function getScenario(id: number): Promise<ScenarioWithComputation | null>;
export async function listScenarios(): Promise<ScenarioSummary[]>;
export async function deleteScenario(id: number): Promise<ActionResult<void>>;
export async function recomputeScenario(id: number, discountRateOverride?: number): Promise<ActionResult<ScenarioComputation>>;
```

Kontrak yang berlaku untuk semuanya:

1. Panggil `auth.api.getSession()`. Bila tidak ada sesi, kembalikan `{ ok: false, error: 'UNAUTHORIZED' }` — jangan `throw`.
2. Parse masukan dengan `scenarioInputSchema.safeParse`. Kembalikan galat per-field agar form bisa menampilkannya di tempat.
3. Setiap query menyertakan `where(eq(scenarios.userId, session.user.id))`. `userId` diambil dari sesi, tidak pernah dari klien.
4. `createScenario` dan `updateScenario` memanggil `computeScenario` lalu menulis `scenario_results` dalam satu transaksi, memakai `onConflictDoUpdate` pada `scenarioId`.
5. Setelah menulis, panggil `revalidatePath('/dashboard')` dan `revalidatePath('/scenarios/[id]', 'page')`.
6. `recomputeScenario` dengan `discountRateOverride` menghitung ulang tanpa menyimpan — dipakai slider discount rate di halaman detail (`PRD.md` §9.6).

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

## 9. Halaman, Routing & State UI

| Route | Deskripsi | Akses |
|---|---|---|
| `/` | Landing page | publik |
| `/sign-in` | Masuk | publik |
| `/dashboard` | Daftar skenario + ringkasan | terlindungi |
| `/scenarios/new` | Form 4 langkah | terlindungi |
| `/scenarios/[id]` | Detail hasil | terlindungi |
| `/scenarios/[id]/edit` | Ubah skenario | terlindungi |

Route terlindungi dijaga middleware yang mengalihkan ke `/sign-in`.

Setiap halaman data wajib menangani empat keadaan, tidak hanya keadaan sukses:

| Keadaan | Perlakuan |
|---|---|
| Memuat | `loading.tsx` dengan skeleton yang meniru bentuk kartu/tabel akhir |
| Kosong | `scenario-empty-state.tsx` — ajakan membuat skenario pertama, bukan tabel kosong |
| Galat | `error.tsx` dengan tombol coba lagi dan pesan yang bisa dipahami |
| Tidak ditemukan | `not-found.tsx` — termasuk saat skenario milik pengguna lain |

### 9.1 Landing Page — Spesifikasi

Mengikuti sistem desain `PRD.md` §12. Tiga peran font: Poppins (display), Inter (body/UI), JetBrains Mono (angka).

**Hero.** Elemen signature adalah perbandingan sisi-berdampingan biaya efektif, memakai angka dari `PRD.md` §2 dan tabel §7.1 dokumen ini — dua kartu berdampingan dengan angka mono besar, bukan headline di atas gradient.

Copy:
- Eyebrow: `ANALISIS KELAYAKAN PEMBIAYAAN`
- Headline: `Satu kebutuhan dana. Dua skema. Satu perbandingan yang adil.`
- Subheadline: `Hitung kelayakan pembiayaan syariah dan konvensional dalam satu kerangka kerja yang sama — setiap angka bisa ditelusuri balik ke rumus dan asumsinya.`
- CTA utama: `Buka Dashboard` → `/dashboard`
- CTA sekunder: `Lihat cara kerja` → anchor `#cara-kerja`

Isi kartu perbandingan (untuk Rp100 juta, 24 bulan):

| | Murabahah | Anuitas konvensional |
|---|---|---|
| Kuotasi | 8% flat | 12% efektif |
| Total dibayar | Rp116.000.000 | Rp112.976.333 |
| **Biaya efektif** | **15,71%** | **12,68%** |

Di bawahnya satu baris penutup: `Yang terlihat lebih murah belum tentu lebih murah.`

**Bagian Masalah.**
- Heading: `Perbandingan syariah vs konvensional jarang apple-to-apple`
- Body: `Margin murabahah dan ujrah ijarah umumnya dikutip flat atas pokok awal, sementara bunga anuitas dan bagi hasil musyarakah bekerja atas saldo menurun. Tanpa satu ukuran yang sama, angka kuotasi bisa menyesatkan arah keputusan.`

**Cara kerja** (anchor `#cara-kerja`):
1. `Isi asumsi` — kebutuhan dana, tenor, skema, kondisi usaha, dan dampak yang diharapkan.
2. `Engine menghitung` — jadwal pembiayaan, biaya efektif, arus kas, DSCR, DER, ROI, BEP, NPV, dan IRR.
3. `Lihat hasil transparan` — setiap angka membuka rumus dan nilai masukannya.

**Prinsip transparansi.**
- Heading: `Bukan skor kotak hitam`
- Body: `Setiap hasil menampilkan formula dan asumsi di baliknya, termasuk batasan model yang kami akui sendiri. Anda bisa memeriksa, bukan sekadar mempercayai.`

**CTA penutup.**
- Heading: `Mulai analisis skenario pertama Anda`
- Button: `Buka Dashboard`

Komponen shadcn yang dipakai: `Button`, `Card`, `Badge`, `Separator`.

### 9.2 Halaman Detail Skenario

Urutan bagian dari atas ke bawah:

1. Header: nama skenario, badge status, badge profil risiko, tombol Ubah dan Hapus.
2. Baris kartu metrik: EAR (dengan kuotasi asli sebagai pembanding kecil), DSCR rata-rata, DSCR minimum, NPV, IRR, DER, ROI, BEP. Setiap kartu punya pemicu `formula-panel.tsx`.
3. Tab varian (`base` / `best` / `worst`) yang mengendalikan grafik dan tabel di bawahnya.
4. Grafik arus kas: area CFADS, garis debt service, bar arus kas bersih.
5. Grafik DSCR per periode dengan garis ambang 1,25 dan 1,00.
6. Tabel arus kas bulanan, angka mono, kolom CFADS / debt service / DSCR / arus kas bersih.
7. Slider discount rate yang memicu `recomputeScenario` untuk memperbarui NPV dan IRR tanpa menyimpan.
8. `model-caveats.tsx` — batasan model dari `PRD.md` §11, dapat dilipat.

## 10. Token Desain (`app/globals.css`)

```css
@theme {
  --color-deepteal:   #0B4F4A;
  --color-amber:      #C1892E;
  --color-amber-deep: #8A5F16;
  --color-ivory:      #FAF7EF;
  --color-ink:        #14201F;
  --color-slate:      #5B6472;
  --color-feasible:   #3F7C58;
  --color-watch:      #8A6D1F;
  --color-risky:      #B5533C;

  --radius-card: 8px;
  --radius-control: 6px;
}

.num {
  font-family: var(--font-jetbrains-mono);
  font-variant-numeric: tabular-nums;
}
```

`--color-amber` hanya untuk latar tombol, garis aksen, dan elemen non-teks. Untuk teks amber di atas latar terang, pakai `--color-amber-deep` (`PRD.md` §12.1).

## 11. Seed Data — 20 Kasus

Nilai `tingkatBiayaTahunan` pada kasus syariah berbasis `flat` sengaja lebih rendah dari kasus konvensional, karena kuotasi flat memang selalu terlihat lebih rendah dari padanan efektifnya. Setelah normalisasi, seluruh EAR bertemu di rentang 10%–16% (§7.3). Inilah yang membuat seed data layak dipakai untuk mendemonstrasikan proposisi nilai produk, bukan sekadar mengisi tabel.

### 11.1 Ringkasan

| # | Nama Skenario | Sektor | Skema | Tenor | Kebutuhan Dana | Kuotasi | Risiko |
|---|---|---|---|---|---|---|---|
| 1 | Warung Kelontong Modern | Ritel | Syariah — Murabahah | 18 | 75 jt | 7,0% flat | Rendah |
| 2 | Konveksi Seragam Sekolah | Manufaktur | Konvensional | 36 | 250 jt | 11% efektif | Sedang |
| 3 | Klinik Pratama Sehat | Kesehatan | Syariah — Ijarah | 48 | 500 jt | 5,5% flat | Rendah |
| 4 | Peternakan Ayam Petelur | Peternakan | Konvensional | 12 | 150 jt | 13% efektif | Tinggi |
| 5 | Bengkel Motor Jaya | Jasa | Syariah — Murabahah | 24 | 100 jt | 8,0% flat | Sedang |
| 6 | Kedai Kopi Kekinian | F&B | Konvensional | 30 | 300 jt | 12% efektif | Sedang |
| 7 | Toko Bangunan Makmur | Ritel | Syariah — Murabahah | 24 | 400 jt | 6,8% flat | Rendah |
| 8 | Bimbingan Belajar Cerdas | Pendidikan | Konvensional | 24 | 120 jt | 10% efektif | Rendah |
| 9 | Konveksi Batik Nusantara | Manufaktur | Syariah — MMQ | 36 | 600 jt | 12% efektif | Sedang |
| 10 | Usaha Laundry Kilat | Jasa | Konvensional | 18 | 80 jt | 14% efektif | Tinggi |
| 11 | Apotek Mandiri Sehat | Kesehatan | Syariah — Murabahah | 24 | 200 jt | 7,2% flat | Rendah |
| 12 | Jasa Ekspedisi Lokal | Transportasi | Konvensional | 48 | 750 jt | 11,5% efektif | Sedang |
| 13 | Restoran Padang Sederhana | F&B | Syariah — Ijarah | 36 | 350 jt | 5,2% flat | Rendah |
| 14 | Startup Aplikasi Pertanian | Teknologi | Konvensional | 24 | 500 jt | 13% efektif | Tinggi |
| 15 | Toko Sembako Grosir | Ritel | Syariah — Murabahah | 24 | 1 M | 6,5% flat | Rendah |
| 16 | Percetakan Digital Prima | Jasa | Konvensional | 42 | 450 jt | 12% efektif | Sedang |
| 17 | Homestay Wisata Alam | Pariwisata | Syariah — MMQ | 60 | 600 jt | 11% efektif | Sedang |
| 18 | Pabrik Tahu Tempe Barokah | Manufaktur | Konvensional | 36 | 300 jt | 12,5% efektif | Sedang |
| 19 | Klinik Kecantikan Estetika | Kesehatan | Syariah — Ijarah | 30 | 400 jt | 5,8% flat | Rendah |
| 20 | Tambak Udang Vaname | Perikanan | Konvensional | 18 | 2 M | 14% efektif | Tinggi |

Sepuluh sektor, sepuluh skenario syariah dan sepuluh konvensional, tiga tingkat profil risiko. Kasus #20 sengaja bernilai Rp2 miliar untuk memastikan tipe `bigint` benar-benar diuji.

### 11.2 Seed Script (`db/seed.ts`)

```typescript
import 'dotenv/config';
import { db } from './index';
import { scenarios, scenarioResults } from './schema';
import { auth } from '../lib/auth';
import { computeScenario } from '../lib/engine';

async function ensureSeedUser(): Promise<string> {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  if (!email || !password) throw new Error('SEED_USER_EMAIL dan SEED_USER_PASSWORD wajib diisi di .env');
  const existing = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, email) });
  if (existing) return existing.id;
  const created = await auth.api.signUpEmail({ body: { email, password, name: 'Pemilik Alat' } });
  return created.user.id;
}

const seedData = [
  { nama: 'Warung Kelontong Modern', jenisUsaha: 'Ritel', tujuanPembiayaan: 'Modal kerja stok', kebutuhanDana: 75_000_000, tenorBulan: 18, jenisSkema: 'syariah', jenisAkad: 'murabahah', tingkatBiayaTahunan: '7.0', basisTingkatBiaya: 'flat', pendapatanBulananAwal: 40_000_000, opexBulananAwal: 32_000_000, deltaPendapatanBulanan: 7_000_000, deltaOpexBulanan: 2_000_000, pertumbuhanPendapatanTahunan: '5', inflasiBiayaTahunan: '4', marginKontribusiPersen: '22', ekuitasAwal: 25_000_000, kewajibanLain: 0, discountRateTahunan: '12', profilRisiko: 'rendah' },
  { nama: 'Konveksi Seragam Sekolah', jenisUsaha: 'Manufaktur', tujuanPembiayaan: 'Investasi mesin jahit', kebutuhanDana: 250_000_000, tenorBulan: 36, jenisSkema: 'konvensional', jenisAkad: null, tingkatBiayaTahunan: '11', basisTingkatBiaya: 'efektif', pendapatanBulananAwal: 90_000_000, opexBulananAwal: 68_000_000, deltaPendapatanBulanan: 11_500_000, deltaOpexBulanan: 3_500_000, pertumbuhanPendapatanTahunan: '7', inflasiBiayaTahunan: '5', marginKontribusiPersen: '30', ekuitasAwal: 100_000_000, kewajibanLain: 25_000_000, discountRateTahunan: '12', profilRisiko: 'sedang' },
  { nama: 'Klinik Pratama Sehat', jenisUsaha: 'Kesehatan', tujuanPembiayaan: 'Renovasi & alat medis', kebutuhanDana: 500_000_000, tenorBulan: 48, jenisSkema: 'syariah', jenisAkad: 'ijarah', tingkatBiayaTahunan: '5.5', basisTingkatBiaya: 'flat', pendapatanBulananAwal: 180_000_000, opexBulananAwal: 120_000_000, deltaPendapatanBulanan: 20_000_000, deltaOpexBulanan: 6_500_000, pertumbuhanPendapatanTahunan: '6', inflasiBiayaTahunan: '5', marginKontribusiPersen: '45', ekuitasAwal: 250_000_000, kewajibanLain: 0, discountRateTahunan: '12', profilRisiko: 'rendah' },
  { nama: 'Peternakan Ayam Petelur', jenisUsaha: 'Peternakan', tujuanPembiayaan: 'Modal kerja pakan', kebutuhanDana: 150_000_000, tenorBulan: 12, jenisSkema: 'konvensional', jenisAkad: null, tingkatBiayaTahunan: '13', basisTingkatBiaya: 'efektif', pendapatanBulananAwal: 70_000_000, opexBulananAwal: 58_000_000, deltaPendapatanBulanan: 19_000_000, deltaOpexBulanan: 6_000_000, pertumbuhanPendapatanTahunan: '4', inflasiBiayaTahunan: '7', marginKontribusiPersen: '20', ekuitasAwal: 50_000_000, kewajibanLain: 15_000_000, discountRateTahunan: '12', profilRisiko: 'tinggi' },
  { nama: 'Bengkel Motor Jaya', jenisUsaha: 'Jasa', tujuanPembiayaan: 'Investasi peralatan', kebutuhanDana: 100_000_000, tenorBulan: 24, jenisSkema: 'syariah', jenisAkad: 'murabahah', tingkatBiayaTahunan: '8.0', basisTingkatBiaya: 'flat', pendapatanBulananAwal: 45_000_000, opexBulananAwal: 34_000_000, deltaPendapatanBulanan: 7_000_000, deltaOpexBulanan: 2_000_000, pertumbuhanPendapatanTahunan: '5', inflasiBiayaTahunan: '4', marginKontribusiPersen: '30', ekuitasAwal: 40_000_000, kewajibanLain: 0, discountRateTahunan: '12', profilRisiko: 'sedang' },
  { nama: 'Kedai Kopi Kekinian', jenisUsaha: 'F&B', tujuanPembiayaan: 'Ekspansi cabang baru', kebutuhanDana: 300_000_000, tenorBulan: 30, jenisSkema: 'konvensional', jenisAkad: null, tingkatBiayaTahunan: '12', basisTingkatBiaya: 'efektif', pendapatanBulananAwal: 110_000_000, opexBulananAwal: 82_000_000, deltaPendapatanBulanan: 15_500_000, deltaOpexBulanan: 5_000_000, pertumbuhanPendapatanTahunan: '10', inflasiBiayaTahunan: '6', marginKontribusiPersen: '35', ekuitasAwal: 120_000_000, kewajibanLain: 30_000_000, discountRateTahunan: '12', profilRisiko: 'sedang' },
  { nama: 'Toko Bangunan Makmur', jenisUsaha: 'Ritel', tujuanPembiayaan: 'Modal kerja stok', kebutuhanDana: 400_000_000, tenorBulan: 24, jenisSkema: 'syariah', jenisAkad: 'murabahah', tingkatBiayaTahunan: '6.8', basisTingkatBiaya: 'flat', pendapatanBulananAwal: 160_000_000, opexBulananAwal: 128_000_000, deltaPendapatanBulanan: 28_500_000, deltaOpexBulanan: 9_000_000, pertumbuhanPendapatanTahunan: '6', inflasiBiayaTahunan: '5', marginKontribusiPersen: '22', ekuitasAwal: 200_000_000, kewajibanLain: 0, discountRateTahunan: '12', profilRisiko: 'rendah' },
  { nama: 'Bimbingan Belajar Cerdas', jenisUsaha: 'Pendidikan', tujuanPembiayaan: 'Renovasi & sarana', kebutuhanDana: 120_000_000, tenorBulan: 24, jenisSkema: 'konvensional', jenisAkad: null, tingkatBiayaTahunan: '10', basisTingkatBiaya: 'efektif', pendapatanBulananAwal: 55_000_000, opexBulananAwal: 38_000_000, deltaPendapatanBulanan: 8_500_000, deltaOpexBulanan: 2_500_000, pertumbuhanPendapatanTahunan: '8', inflasiBiayaTahunan: '4', marginKontribusiPersen: '55', ekuitasAwal: 60_000_000, kewajibanLain: 10_000_000, discountRateTahunan: '12', profilRisiko: 'rendah' },
  { nama: 'Konveksi Batik Nusantara', jenisUsaha: 'Manufaktur', tujuanPembiayaan: 'Ekspor perdana', kebutuhanDana: 600_000_000, tenorBulan: 36, jenisSkema: 'syariah', jenisAkad: 'musyarakah_mutanaqishah', tingkatBiayaTahunan: '12', basisTingkatBiaya: 'efektif', pendapatanBulananAwal: 220_000_000, opexBulananAwal: 165_000_000, deltaPendapatanBulanan: 27_000_000, deltaOpexBulanan: 8_500_000, pertumbuhanPendapatanTahunan: '9', inflasiBiayaTahunan: '6', marginKontribusiPersen: '28', ekuitasAwal: 300_000_000, kewajibanLain: 0, discountRateTahunan: '12', profilRisiko: 'sedang' },
  { nama: 'Usaha Laundry Kilat', jenisUsaha: 'Jasa', tujuanPembiayaan: 'Investasi mesin cuci', kebutuhanDana: 80_000_000, tenorBulan: 18, jenisSkema: 'konvensional', jenisAkad: null, tingkatBiayaTahunan: '14', basisTingkatBiaya: 'efektif', pendapatanBulananAwal: 38_000_000, opexBulananAwal: 30_000_000, deltaPendapatanBulanan: 6_500_000, deltaOpexBulanan: 2_000_000, pertumbuhanPendapatanTahunan: '4', inflasiBiayaTahunan: '6', marginKontribusiPersen: '40', ekuitasAwal: 25_000_000, kewajibanLain: 5_000_000, discountRateTahunan: '12', profilRisiko: 'tinggi' },
  { nama: 'Apotek Mandiri Sehat', jenisUsaha: 'Kesehatan', tujuanPembiayaan: 'Modal kerja obat', kebutuhanDana: 200_000_000, tenorBulan: 24, jenisSkema: 'syariah', jenisAkad: 'murabahah', tingkatBiayaTahunan: '7.2', basisTingkatBiaya: 'flat', pendapatanBulananAwal: 95_000_000, opexBulananAwal: 74_000_000, deltaPendapatanBulanan: 14_500_000, deltaOpexBulanan: 4_500_000, pertumbuhanPendapatanTahunan: '5', inflasiBiayaTahunan: '5', marginKontribusiPersen: '25', ekuitasAwal: 100_000_000, kewajibanLain: 0, discountRateTahunan: '12', profilRisiko: 'rendah' },
  { nama: 'Jasa Ekspedisi Lokal', jenisUsaha: 'Transportasi', tujuanPembiayaan: 'Pembelian armada', kebutuhanDana: 750_000_000, tenorBulan: 48, jenisSkema: 'konvensional', jenisAkad: null, tingkatBiayaTahunan: '11.5', basisTingkatBiaya: 'efektif', pendapatanBulananAwal: 280_000_000, opexBulananAwal: 210_000_000, deltaPendapatanBulanan: 27_500_000, deltaOpexBulanan: 9_000_000, pertumbuhanPendapatanTahunan: '7', inflasiBiayaTahunan: '6', marginKontribusiPersen: '30', ekuitasAwal: 300_000_000, kewajibanLain: 80_000_000, discountRateTahunan: '12', profilRisiko: 'sedang' },
  { nama: 'Restoran Padang Sederhana', jenisUsaha: 'F&B', tujuanPembiayaan: 'Renovasi & ekspansi', kebutuhanDana: 350_000_000, tenorBulan: 36, jenisSkema: 'syariah', jenisAkad: 'ijarah', tingkatBiayaTahunan: '5.2', basisTingkatBiaya: 'flat', pendapatanBulananAwal: 140_000_000, opexBulananAwal: 104_000_000, deltaPendapatanBulanan: 17_500_000, deltaOpexBulanan: 5_500_000, pertumbuhanPendapatanTahunan: '6', inflasiBiayaTahunan: '5', marginKontribusiPersen: '35', ekuitasAwal: 175_000_000, kewajibanLain: 0, discountRateTahunan: '12', profilRisiko: 'rendah' },
  { nama: 'Startup Aplikasi Pertanian', jenisUsaha: 'Teknologi', tujuanPembiayaan: 'Modal kerja & talent', kebutuhanDana: 500_000_000, tenorBulan: 24, jenisSkema: 'konvensional', jenisAkad: null, tingkatBiayaTahunan: '13', basisTingkatBiaya: 'efektif', pendapatanBulananAwal: 60_000_000, opexBulananAwal: 70_000_000, deltaPendapatanBulanan: 28_000_000, deltaOpexBulanan: 9_000_000, pertumbuhanPendapatanTahunan: '15', inflasiBiayaTahunan: '8', marginKontribusiPersen: '60', ekuitasAwal: 250_000_000, kewajibanLain: 0, discountRateTahunan: '12', profilRisiko: 'tinggi' },
  { nama: 'Toko Sembako Grosir', jenisUsaha: 'Ritel', tujuanPembiayaan: 'Modal kerja', kebutuhanDana: 1_000_000_000, tenorBulan: 24, jenisSkema: 'syariah', jenisAkad: 'murabahah', tingkatBiayaTahunan: '6.5', basisTingkatBiaya: 'flat', pendapatanBulananAwal: 380_000_000, opexBulananAwal: 300_000_000, deltaPendapatanBulanan: 71_500_000, deltaOpexBulanan: 23_000_000, pertumbuhanPendapatanTahunan: '5', inflasiBiayaTahunan: '5', marginKontribusiPersen: '18', ekuitasAwal: 500_000_000, kewajibanLain: 0, discountRateTahunan: '12', profilRisiko: 'rendah' },
  { nama: 'Percetakan Digital Prima', jenisUsaha: 'Jasa', tujuanPembiayaan: 'Investasi mesin cetak', kebutuhanDana: 450_000_000, tenorBulan: 42, jenisSkema: 'konvensional', jenisAkad: null, tingkatBiayaTahunan: '12', basisTingkatBiaya: 'efektif', pendapatanBulananAwal: 170_000_000, opexBulananAwal: 130_000_000, deltaPendapatanBulanan: 18_500_000, deltaOpexBulanan: 6_000_000, pertumbuhanPendapatanTahunan: '6', inflasiBiayaTahunan: '5', marginKontribusiPersen: '32', ekuitasAwal: 180_000_000, kewajibanLain: 45_000_000, discountRateTahunan: '12', profilRisiko: 'sedang' },
  { nama: 'Homestay Wisata Alam', jenisUsaha: 'Pariwisata', tujuanPembiayaan: 'Renovasi properti', kebutuhanDana: 600_000_000, tenorBulan: 60, jenisSkema: 'syariah', jenisAkad: 'musyarakah_mutanaqishah', tingkatBiayaTahunan: '11', basisTingkatBiaya: 'efektif', pendapatanBulananAwal: 150_000_000, opexBulananAwal: 95_000_000, deltaPendapatanBulanan: 17_500_000, deltaOpexBulanan: 5_500_000, pertumbuhanPendapatanTahunan: '8', inflasiBiayaTahunan: '5', marginKontribusiPersen: '50', ekuitasAwal: 400_000_000, kewajibanLain: 0, discountRateTahunan: '12', profilRisiko: 'sedang' },
  { nama: 'Pabrik Tahu Tempe Barokah', jenisUsaha: 'Manufaktur', tujuanPembiayaan: 'Ekspansi kapasitas', kebutuhanDana: 300_000_000, tenorBulan: 36, jenisSkema: 'konvensional', jenisAkad: null, tingkatBiayaTahunan: '12.5', basisTingkatBiaya: 'efektif', pendapatanBulananAwal: 130_000_000, opexBulananAwal: 100_000_000, deltaPendapatanBulanan: 14_500_000, deltaOpexBulanan: 4_500_000, pertumbuhanPendapatanTahunan: '6', inflasiBiayaTahunan: '6', marginKontribusiPersen: '26', ekuitasAwal: 120_000_000, kewajibanLain: 30_000_000, discountRateTahunan: '12', profilRisiko: 'sedang' },
  { nama: 'Klinik Kecantikan Estetika', jenisUsaha: 'Kesehatan', tujuanPembiayaan: 'Investasi alat', kebutuhanDana: 400_000_000, tenorBulan: 30, jenisSkema: 'syariah', jenisAkad: 'ijarah', tingkatBiayaTahunan: '5.8', basisTingkatBiaya: 'flat', pendapatanBulananAwal: 200_000_000, opexBulananAwal: 140_000_000, deltaPendapatanBulanan: 22_500_000, deltaOpexBulanan: 7_000_000, pertumbuhanPendapatanTahunan: '9', inflasiBiayaTahunan: '5', marginKontribusiPersen: '42', ekuitasAwal: 200_000_000, kewajibanLain: 0, discountRateTahunan: '12', profilRisiko: 'rendah' },
  { nama: 'Tambak Udang Vaname', jenisUsaha: 'Perikanan', tujuanPembiayaan: 'Modal kerja & bibit', kebutuhanDana: 2_000_000_000, tenorBulan: 18, jenisSkema: 'konvensional', jenisAkad: null, tingkatBiayaTahunan: '14', basisTingkatBiaya: 'efektif', pendapatanBulananAwal: 650_000_000, opexBulananAwal: 520_000_000, deltaPendapatanBulanan: 160_500_000, deltaOpexBulanan: 51_500_000, pertumbuhanPendapatanTahunan: '10', inflasiBiayaTahunan: '9', marginKontribusiPersen: '24', ekuitasAwal: 600_000_000, kewajibanLain: 200_000_000, discountRateTahunan: '12', profilRisiko: 'tinggi' },
] as const;

async function seed() {
  const userId = await ensureSeedUser();
  for (const s of seedData) {
    const [row] = await db.insert(scenarios).values({ ...s, userId }).returning({ id: scenarios.id });
    const hasil = computeScenario(s as never);
    // toResultRow: helper kecil di db/seed.ts yang memetakan ScenarioComputation
    // ke bentuk baris scenario_results (varian base + ringkasan worst).
    await db.insert(scenarioResults).values(toResultRow(row.id, hasil));
  }
  console.log(`Seeded ${seedData.length} skenario untuk user ${userId}.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
```

Seed sekaligus menghitung dan menyimpan hasil, sehingga dashboard langsung terisi tanpa langkah manual. Jalankan dengan `npm run db:seed`.

## 12. Rencana Build Bertahap

- [ ] **Fase 0 — Setup.** Clone boilerplate, isi `.env`, `db:up`, `npm run dev` berjalan tanpa error. Matikan pendaftaran publik di `lib/auth.ts`.
- [ ] **Fase 1 — Skema DB.** Buat enum dan kedua tabel (Bagian 4), `db:push`, verifikasi lewat `db:studio`. Pastikan `userId` dan unique index terbentuk.
- [ ] **Fase 2 — Engine + uji.** Implementasikan `rate-conversion`, `financing-cost`, `cashflow`, `ratios`, `valuation`, `index`. Tulis test lebih dulu memakai vektor acuan Bagian 7.1–7.2. Fase ini selesai ketika `npm test` hijau — belum ada UI sama sekali.
- [ ] **Fase 3 — Validasi + Server Actions.** `scenario-schema.ts`, lalu keenam action dengan penjagaan sesi dan kepemilikan (Bagian 8).
- [ ] **Fase 4 — Dashboard & form.** `/dashboard`, `/scenarios/new`, `/scenarios/[id]/edit`, lengkap dengan keadaan memuat, kosong, galat, dan tidak ditemukan.
- [ ] **Fase 5 — Halaman detail.** Kartu metrik, `formula-panel`, tab varian, grafik arus kas, grafik DSCR, tabel, slider discount rate, panel batasan model.
- [ ] **Fase 6 — Seed data.** Jalankan `npm run db:seed`, lalu `golden-seed.test.ts` untuk mencocokkan seluruh 20 baris pada tabel §7.3.
- [ ] **Fase 7 — Landing page.** Implementasi Bagian 9.1 termasuk elemen signature perbandingan.
- [ ] **Fase 8 — QA.** Responsif 1440/1024/768, audit Lighthouse Accessibility ≥ 95 pada `/` dan `/dashboard`, telusuri seluruh 20 skenario untuk memastikan tidak ada `NaN`/`Infinity` yang bocor, dan periksa konsistensi warna/font terhadap `PRD.md` §12.

Fase 2 sengaja diselesaikan sebelum UI apa pun dibangun. Kesalahan formula yang baru ketahuan setelah dashboard jadi jauh lebih mahal untuk diperbaiki, dan seluruh angka di UI bergantung pada engine yang sama.

## 13. Kriteria Selesai (Definition of Done)

**Engine**
- [ ] Seluruh vektor acuan §7.1 dan §7.2 lolos dengan toleransi ±Rp1 / ±0,0001.
- [ ] `golden-seed.test.ts` mencocokkan 20 baris §7.3.
- [ ] Cakupan uji `lib/engine/` ≥ 90% baris.
- [ ] Tidak ada fungsi engine yang mengembalikan `NaN` atau `Infinity` untuk seluruh input yang lolos validasi Zod.
- [ ] Kasus #1, #4, dan #14 juga dicocokkan manual dengan spreadsheet pembanding.

**Aplikasi**
- [ ] Kedua puluh skenario seed dapat dibuat, dihitung, dilihat, diubah, dan dihapus tanpa error.
- [ ] Discount rate dapat diubah di halaman detail dan NPV/IRR memperbarui diri tanpa menyimpan.
- [ ] Setiap kartu metrik dapat membuka panel rumus berisi nilai masukannya.
- [ ] Mengakses skenario milik pengguna lain menghasilkan halaman *not found*, bukan data.
- [ ] Seluruh route terlindungi mengalihkan pengguna anonim ke `/sign-in`.
- [ ] Setiap halaman data punya keadaan memuat, kosong, galat, dan tidak ditemukan.

**Desain & aksesibilitas**
- [ ] Warna dan tipografi mengikuti token `PRD.md` §12; tidak ada nilai heksadesimal tertulis langsung di komponen.
- [ ] Skor Lighthouse Accessibility ≥ 95 pada `/` dan `/dashboard`.
- [ ] Alur form dapat diselesaikan sepenuhnya dengan keyboard.
- [ ] Indikator kelayakan dapat dibedakan tanpa mengandalkan warna saja.
- [ ] Landing page, dashboard, dan halaman detail dapat digunakan pada 1440px, 1024px, dan 768px.

**Cakupan**
- [ ] Tidak ada modul V2–V5 (sensitivity, Monte Carlo, AI layer, optimizer) yang diperlukan agar MVP dianggap selesai. Folder `lib/ai/` boleh kosong sebagai penanda perluasan.
