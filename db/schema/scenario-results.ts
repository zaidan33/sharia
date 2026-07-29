import {
  pgTable,
  pgEnum,
  serial,
  integer,
  numeric,
  bigint,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { scenarios } from "./scenarios";

export const statusKelayakanEnum = pgEnum("status_kelayakan", [
  "LAYAK",
  "WASPADA",
  "TIDAK_LAYAK",
]);

// Cache hasil perhitungan agar dashboard tidak menghitung ulang setiap render.
// Satu baris per skenario -> unique index supaya upsert bisa memakai onConflict.
export const scenarioResults = pgTable(
  "scenario_results",
  {
    id: serial("id").primaryKey(),
    scenarioId: integer("scenario_id")
      .references(() => scenarios.id, { onDelete: "cascade" })
      .notNull(),

    // Semua ringkasan diambil dari varian base
    earPersen: numeric("ear_persen", { precision: 8, scale: 4 }).notNull(),
    angsuranPertama: bigint("angsuran_pertama", { mode: "number" }).notNull(),
    totalPembayaran: bigint("total_pembayaran", { mode: "number" }).notNull(),

    dscrRataRata: numeric("dscr_rata_rata", { precision: 10, scale: 4 }),
    dscrMinimum: numeric("dscr_minimum", { precision: 10, scale: 4 }),
    dscrRataRataWorst: numeric("dscr_rata_rata_worst", {
      precision: 10,
      scale: 4,
    }),

    npv: bigint("npv", { mode: "number" }),
    irrPersen: numeric("irr_persen", { precision: 8, scale: 4 }), // null bila tak terdefinisi
    irrUnik: boolean("irr_unik"), // false bila arus kas berganti tanda > 1x
    der: numeric("der", { precision: 10, scale: 4 }),
    roiTahunanPersen: numeric("roi_tahunan_persen", { precision: 10, scale: 4 }),
    bepOmzetBulanan: bigint("bep_omzet_bulanan", { mode: "number" }),

    status: statusKelayakanEnum("status").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    scenarioUnique: uniqueIndex("scenario_results_scenario_id_key").on(
      t.scenarioId,
    ),
  }),
);
