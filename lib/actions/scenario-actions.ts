"use server";

/**
 * Server Actions skenario - IMPLEMENTATION_PLAN §8.
 * Kontrak: verifikasi sesi + kepemilikan untuk SEMUA aksi. userId hanya dari sesi,
 * tidak pernah dari klien. Pembacaan (list/get) didelegasikan ke lib/queries.
 */
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { db } from "@/db";
import { scenarios, scenarioResults } from "@/db/schema";
import { scenarioInputSchema } from "@/lib/validation/scenario-schema";
import { computeScenario, type ScenarioComputation } from "@/lib/engine";
import {
  dbRowToScenarioInput,
  scenarioInputToFields,
  scenarioInputToInsert,
  resultMetrics,
  toResultRow,
} from "@/lib/mappers";
import {
  getSessionUserId,
  getScenarioOwned,
  listScenariosForUser,
  type ScenarioSummary,
} from "@/lib/queries";

export interface ScenarioWithComputation {
  scenario: typeof scenarios.$inferSelect;
  computation: ScenarioComputation;
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function flattenFieldErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function createScenario(
  raw: unknown,
): Promise<ActionResult<{ id: number }>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  const parsed = scenarioInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "INVALID_INPUT",
      fieldErrors: flattenFieldErrors(parsed.error),
    };
  }

  const computation = computeScenario(parsed.data);
  let newId = 0;
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(scenarios)
      .values(scenarioInputToInsert(parsed.data, userId))
      .returning({ id: scenarios.id });
    newId = row.id;
    await tx
      .insert(scenarioResults)
      .values(toResultRow(row.id, computation))
      .onConflictDoUpdate({
        target: scenarioResults.scenarioId,
        set: { ...resultMetrics(computation), computedAt: new Date() },
      });
  });

  revalidatePath("/dashboard");
  return { ok: true, data: { id: newId } };
}

export async function updateScenario(
  id: number,
  raw: unknown,
): Promise<ActionResult<{ id: number }>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  const parsed = scenarioInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "INVALID_INPUT",
      fieldErrors: flattenFieldErrors(parsed.error),
    };
  }

  const existing = await getScenarioOwned(id, userId);
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const computation = computeScenario(parsed.data);
  await db.transaction(async (tx) => {
    await tx
      .update(scenarios)
      .set({ ...scenarioInputToFields(parsed.data), updatedAt: new Date() })
      .where(and(eq(scenarios.id, id), eq(scenarios.userId, userId)));
    await tx
      .insert(scenarioResults)
      .values(toResultRow(id, computation))
      .onConflictDoUpdate({
        target: scenarioResults.scenarioId,
        set: { ...resultMetrics(computation), computedAt: new Date() },
      });
  });

  revalidatePath("/dashboard");
  revalidatePath(`/scenarios/${id}`);
  return { ok: true, data: { id } };
}

export async function getScenario(
  id: number,
): Promise<ScenarioWithComputation | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const row = await getScenarioOwned(id, userId);
  if (!row) return null;
  // Hitung ulang untuk data lengkap (semua varian) - murah (<50ms, NFR §13).
  return { scenario: row, computation: computeScenario(dbRowToScenarioInput(row)) };
}

export async function listScenarios(): Promise<ScenarioSummary[]> {
  const userId = await getSessionUserId();
  if (!userId) return [];
  return listScenariosForUser(userId);
}

export async function deleteScenario(
  id: number,
): Promise<ActionResult<void>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  // scenario_results terhapus otomatis (FK ON DELETE CASCADE).
  await db
    .delete(scenarios)
    .where(and(eq(scenarios.id, id), eq(scenarios.userId, userId)));

  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

/**
 * Hitung ulang NPV/IRR tanpa menyimpan - dipakai slider discount rate di
 * halaman detail (PRD §9.6). override menggantikan discountRate skenario.
 */
export async function recomputeScenario(
  id: number,
  discountRateOverride?: number,
): Promise<ActionResult<ScenarioComputation>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  const row = await getScenarioOwned(id, userId);
  if (!row) return { ok: false, error: "NOT_FOUND" };

  const input = dbRowToScenarioInput(row);
  if (discountRateOverride !== undefined) {
    input.discountRateTahunan = discountRateOverride;
  }
  return { ok: true, data: computeScenario(input) };
}
