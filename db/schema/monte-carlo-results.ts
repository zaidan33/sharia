/**
 * Cache hasil simulasi Monte Carlo (V3.1). Satu baris per skenario.
 */
import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { scenarios } from "./scenarios";

export const monteCarloResults = pgTable(
  "monte_carlo_results",
  {
    id: serial("id").primaryKey(),
    scenarioId: integer("scenario_id")
      .references(() => scenarios.id, { onDelete: "cascade" })
      .notNull(),
    iterations: integer("iterations").notNull(),
    seed: integer("seed").notNull(),
    result: jsonb("result").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    scenarioUnique: uniqueIndex("monte_carlo_results_scenario_key").on(
      t.scenarioId,
    ),
  }),
);
