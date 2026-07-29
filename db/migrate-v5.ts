/**
 * Migrasi DDL V5 (V5.3 sharia_checks) - idempoten, dijalankan via tsx.
 * Jalankan: npx tsx db/migrate-v5.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/db";

async function main() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sharia_checks (
      id serial PRIMARY KEY,
      scenario_id integer NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
      status text NOT NULL,
      ear_persen numeric(8, 4),
      findings jsonb NOT NULL,
      dps_checklist jsonb NOT NULL,
      dps_confirmed boolean NOT NULL DEFAULT false,
      computed_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS sharia_checks_scenario_key ON sharia_checks(scenario_id)`,
  );
  console.log("✓ Migrasi V5 (V5.3 sharia_checks) terpakai.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
