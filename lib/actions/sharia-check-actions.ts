"use server";

/**
 * Server Action Sharia Reasoning (V5.3). Verifikasi sesi + kepemilikan.
 */
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { shariaChecks } from "@/db/schema";
import { getSessionUserId, getScenarioOwned } from "@/lib/queries";
import { dbRowToScenarioInput } from "@/lib/mappers";
import { computeScenario } from "@/lib/engine";
import {
  checkShariaComplianceEnhanced,
  isDpsConfirmed,
  type ShariaCheckResult,
  type DpsItem,
} from "@/lib/ai/sharia-check";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string };

function num(v: number | null): string | null {
  return v === null ? null : String(v);
}

/** Jalankan pemeriksaan syariah, simpan (upsert), kembalikan hasil. */
export async function runShariaCheck(
  scenarioId: number,
): Promise<Ok<ShariaCheckResult> | Err> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  const row = await getScenarioOwned(scenarioId, userId);
  if (!row) return { ok: false, error: "NOT_FOUND" };

  const input = dbRowToScenarioInput(row);
  const comp = computeScenario(input);
  const result = await checkShariaComplianceEnhanced(input, comp);

  await db
    .insert(shariaChecks)
    .values({
      scenarioId,
      status: result.status,
      earPersen: num(comp.schedule.earPersen),
      findings: result.findings,
      dpsChecklist: result.dpsChecklist,
      dpsConfirmed: false,
    })
    .onConflictDoUpdate({
      target: shariaChecks.scenarioId,
      set: {
        status: result.status,
        findings: result.findings,
        dpsChecklist: result.dpsChecklist,
        dpsConfirmed: false,
        computedAt: new Date(),
      },
    });

  return { ok: true, data: result };
}

/** Simpan checklist DPS yang dicentang pengguna (simulasi konfirmasi DPS). */
export async function saveDpsChecklist(
  scenarioId: number,
  checklist: DpsItem[],
): Promise<Ok<{ checklist: DpsItem[]; confirmed: boolean }> | Err> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  const row = await getScenarioOwned(scenarioId, userId);
  if (!row) return { ok: false, error: "NOT_FOUND" };

  const confirmed = isDpsConfirmed(checklist);
  await db
    .update(shariaChecks)
    .set({ dpsChecklist: checklist, dpsConfirmed: confirmed })
    .where(and(eq(shariaChecks.scenarioId, scenarioId)));

  revalidatePath("/sharia-check");
  return { ok: true, data: { checklist, confirmed } };
}
