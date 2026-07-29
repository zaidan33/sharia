/**
 * Cache hasil analisis sensitivitas (V2.1). Satu baris per (skenario, target).
 */
import {
  pgTable,
  serial,
  integer,
  text,
  bigint,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { scenarios } from "./scenarios";

export const sensitivityResults = pgTable(
  "sensitivity_results",
  {
    id: serial("id").primaryKey(),
    scenarioId: integer("scenario_id")
      .references(() => scenarios.id, { onDelete: "cascade" })
      .notNull(),
    target: text("target").notNull(), // "npv" | "irr" | "dscr"
    baseNpv: bigint("base_npv", { mode: "number" }),
    points: jsonb("points").notNull(),
    swings: jsonb("swings").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    scenarioTargetUnique: uniqueIndex(
      "sensitivity_results_scenario_target_key",
    ).on(t.scenarioId, t.target),
  }),
);
