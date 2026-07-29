/**
 * Skema validasi Structure Optimizer (V4.1) - dipakai form (klien) & Server Action.
 */
import { z } from "zod";

export const optimizerInputSchema = z
  .object({
    // Kondisi usaha
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
    // Struktur
    kebutuhanDana: z.number().int().min(1_000_000).max(500_000_000_000),
    profilRisiko: z.enum(["rendah", "sedang", "tinggi"]),
    // Eksplorasi tenor
    tenorMin: z.number().int().min(3).max(240),
    tenorMax: z.number().int().min(3).max(240),
    tenorStep: z.number().int().min(1).max(60),
    // Asumsi kuotasi tingkat biaya per skema (poin persen)
    tingkatBiayaSyariah: z.number().min(0).max(60),
    tingkatBiayaKonvensional: z.number().min(0).max(60),
  })
  .refine((v) => v.tenorMax >= v.tenorMin, {
    message: "Tenor maksimum harus >= minimum.",
    path: ["tenorMax"],
  })
  .refine((v) => v.deltaOpexBulanan < v.deltaPendapatanBulanan, {
    message:
      "Tambahan opex harus lebih kecil dari tambahan pendapatan; jika tidak proyek tidak akan pernah menghasilkan arus kas positif.",
    path: ["deltaOpexBulanan"],
  });

export type OptimizerInput = z.infer<typeof optimizerInputSchema>;
