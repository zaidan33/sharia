/**
 * Skema validasi tunggal - dipakai form (klien) dan Server Action, sehingga
 * aturan tidak perlu ditulis dua kali dan tidak bisa berbeda.
 * IMPLEMENTATION_PLAN §5.
 */
import { z } from "zod";

export const scenarioInputSchema = z
  .object({
    nama: z.string().trim().min(3).max(120),
    jenisUsaha: z.string().trim().min(2).max(60),
    tujuanPembiayaan: z.string().trim().min(3).max(200),
    profilRisiko: z.enum(["rendah", "sedang", "tinggi"]),

    kebutuhanDana: z.number().int().min(1_000_000).max(500_000_000_000),
    tenorBulan: z.number().int().min(3).max(240),
    jenisSkema: z.enum(["syariah", "konvensional"]),
    jenisAkad: z
      .enum(["murabahah", "ijarah", "musyarakah_mutanaqishah"])
      .nullable(),
    tingkatBiayaTahunan: z.number().min(0).max(60),
    basisTingkatBiaya: z.enum(["flat", "efektif"]),

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
  .refine(
    (v) => (v.jenisSkema === "konvensional" ? v.jenisAkad === null : v.jenisAkad !== null),
    {
      message:
        "Jenis akad wajib diisi untuk skema syariah dan harus kosong untuk konvensional.",
      path: ["jenisAkad"],
    },
  )
  .refine(
    (v) =>
      !(
        v.jenisAkad === "musyarakah_mutanaqishah" &&
        v.basisTingkatBiaya === "flat"
      ),
    {
      message: "Musyarakah mutanaqishah hanya berlaku untuk basis efektif.",
      path: ["basisTingkatBiaya"],
    },
  )
  .refine((v) => v.deltaOpexBulanan < v.deltaPendapatanBulanan, {
    message:
      "Tambahan opex harus lebih kecil dari tambahan pendapatan; jika tidak proyek tidak akan pernah menghasilkan arus kas positif.",
    path: ["deltaOpexBulanan"],
  });

export type ScenarioInput = z.infer<typeof scenarioInputSchema>;
