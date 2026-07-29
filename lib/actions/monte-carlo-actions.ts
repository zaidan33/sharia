"use server";

import { db } from "@/db";
import { monteCarloResults } from "@/db/schema";
import { getSessionUserId, getScenarioOwned } from "@/lib/queries";
import { dbRowToScenarioInput } from "@/lib/mappers";
import { runMonteCarlo, type MonteCarloResult } from "@/lib/engine/monte-carlo";

type Ok = { ok: true; data: MonteCarloResult };
type Err = { ok: false; error: string };

/**
 * Jalankan simulasi Monte Carlo untuk skenario, simpan (upsert per skenario),
 * kembalikan hasil lengkap untuk visualisasi.
 */
export async function computeMonteCarlo(
  scenarioId: number,
  iterations = 1000,
): Promise<Ok | Err> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  const row = await getScenarioOwned(scenarioId, userId);
  if (!row) return { ok: false, error: "NOT_FOUND" };

  const result = runMonteCarlo(dbRowToScenarioInput(row), { iterations });

  await db
    .insert(monteCarloResults)
    .values({
      scenarioId,
      iterations: result.iterations,
      seed: result.seed,
      result,
    })
    .onConflictDoUpdate({
      target: monteCarloResults.scenarioId,
      set: {
        iterations: result.iterations,
        seed: result.seed,
        result,
        computedAt: new Date(),
      },
    });

  return { ok: true, data: result };
}
