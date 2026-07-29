/**
 * Migrasi DDL V2 (V2.3 + V3.1) - dijalankan manual via tsx karena db:push
 * interaktif-broken. Idempoten (IF NOT EXISTS). Aman & aditif.
 * Jalankan: npx tsx db/migrate-v2.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/db";

async function main() {
  await db.execute(
    sql`ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS pertumbuhan_terminal_tahunan numeric(6,3)`,
  );
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS monte_carlo_results (
      id serial PRIMARY KEY,
      scenario_id integer NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
      iterations integer NOT NULL,
      seed integer NOT NULL,
      result jsonb NOT NULL,
      computed_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS monte_carlo_results_scenario_key ON monte_carlo_results(scenario_id)`,
  );
  console.log("✓ Migrasi V2 (V2.3 pertumbuhan_terminal + V3.1 monte_carlo_results) terpakai.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
