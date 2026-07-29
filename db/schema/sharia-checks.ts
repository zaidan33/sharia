/**
 * Cache hasil cek kepatuhan syariah (V5.3). Satu baris per skenario.
 */
import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { scenarios } from "./scenarios";

export const shariaChecks = pgTable(
  "sharia_checks",
  {
    id: serial("id").primaryKey(),
    scenarioId: integer("scenario_id")
      .references(() => scenarios.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status").notNull(), // SYARIAH | TIDAK_SESUI | PERLU_KONFIRMASI_DPS
    earPersen: numeric("ear_persen", { precision: 8, scale: 4 }),
    findings: jsonb("findings").notNull(),
    dpsChecklist: jsonb("dps_checklist").notNull(),
    dpsConfirmed: boolean("dps_confirmed").notNull().default(false),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    scenarioUnique: uniqueIndex("sharia_checks_scenario_key").on(t.scenarioId),
  }),
);
