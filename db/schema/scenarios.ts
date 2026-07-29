import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  bigint,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth"; // dari boilerplate Better Auth

export const jenisSkemaEnum = pgEnum("jenis_skema", [
  "syariah",
  "konvensional",
]);
export const jenisAkadEnum = pgEnum("jenis_akad", [
  "murabahah",
  "ijarah",
  "musyarakah_mutanaqishah",
]);
export const basisTingkatEnum = pgEnum("basis_tingkat", ["flat", "efektif"]);
export const profilRisikoEnum = pgEnum("profil_risiko", [
  "rendah",
  "sedang",
  "tinggi",
]);

export const scenarios = pgTable(
  "scenarios",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),

    // Identitas
    nama: text("nama").notNull(),
    jenisUsaha: text("jenis_usaha").notNull(),
    tujuanPembiayaan: text("tujuan_pembiayaan").notNull(),
    profilRisiko: profilRisikoEnum("profil_risiko").notNull(),

    // Struktur pembiayaan - nilai uang dalam rupiah penuh (bigint)
    kebutuhanDana: bigint("kebutuhan_dana", { mode: "number" }).notNull(),
    tenorBulan: integer("tenor_bulan").notNull(),
    jenisSkema: jenisSkemaEnum("jenis_skema").notNull(),
    jenisAkad: jenisAkadEnum("jenis_akad"), // null bila konvensional
    tingkatBiayaTahunan: numeric("tingkat_biaya_tahunan", {
      precision: 6,
      scale: 3,
    }).notNull(),
    basisTingkatBiaya: basisTingkatEnum("basis_tingkat_biaya").notNull(),

    // Kondisi usaha saat ini
    pendapatanBulananAwal: bigint("pendapatan_bulanan_awal", {
      mode: "number",
    }).notNull(),
    opexBulananAwal: bigint("opex_bulanan_awal", { mode: "number" }).notNull(),
    pertumbuhanPendapatanTahunan: numeric("pertumbuhan_pendapatan_tahunan", {
      precision: 6,
      scale: 3,
    }).notNull(),
    inflasiBiayaTahunan: numeric("inflasi_biaya_tahunan", {
      precision: 6,
      scale: 3,
    }).notNull(),
    marginKontribusiPersen: numeric("margin_kontribusi_persen", {
      precision: 5,
      scale: 2,
    }).notNull(),
    ekuitasAwal: bigint("ekuitas_awal", { mode: "number" }).notNull(),
    kewajibanLain: bigint("kewajiban_lain", { mode: "number" })
      .notNull()
      .default(0),

    // Dampak pembiayaan (untuk NPV/IRR inkremental)
    deltaPendapatanBulanan: bigint("delta_pendapatan_bulanan", {
      mode: "number",
    }).notNull(),
    deltaOpexBulanan: bigint("delta_opex_bulanan", { mode: "number" }).notNull(),

    // Asumsi valuasi
    discountRateTahunan: numeric("discount_rate_tahunan", {
      precision: 6,
      scale: 3,
    })
      .notNull()
      .default("12"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdx: index("scenarios_user_created_idx").on(t.userId, t.createdAt),
  }),
);
