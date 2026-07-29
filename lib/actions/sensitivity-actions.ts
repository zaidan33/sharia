"use server";

import { db } from "@/db";
import { sensitivityResults } from "@/db/schema";
import { getSessionUserId, getScenarioOwned } from "@/lib/queries";
import { dbRowToScenarioInput } from "@/lib/mappers";
import {
  runSensitivity,
  type SensitivityResult,
  type SensitivityTarget,
} from "@/lib/engine/sensitivity";

type Ok = { ok: true; data: SensitivityResult };
type Err = { ok: false; error: string };

/** Hitung sensitivitas skenario, simpan (upsert per target), kembalikan hasil. */
export async function computeSensitivity(
  scenarioId: number,
  target: SensitivityTarget = "npv",
): Promise<Ok | Err> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  const row = await getScenarioOwned(scenarioId, userId);
  if (!row) return { ok: false, error: "NOT_FOUND" };

  const result = runSensitivity(dbRowToScenarioInput(row), target);

  await db
    .insert(sensitivityResults)
    .values({
      scenarioId,
      target,
      baseNpv: Math.round(result.base.npv),
      points: result.points,
      swings: result.swings,
    })
    .onConflictDoUpdate({
      target: [sensitivityResults.scenarioId, sensitivityResults.target],
      set: {
        baseNpv: Math.round(result.base.npv),
        points: result.points,
        swings: result.swings,
        computedAt: new Date(),
      },
    });

  return { ok: true, data: result };
}
