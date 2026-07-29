"use server";

/**
 * Server Action Copilot (V5.2). Memuat skenario milik pengguna (dengan metrik
 * cache), membangun konteks, dan menjalankan mesin jawaban rule-based.
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { scenarios, scenarioResults } from "@/db/schema";
import { getSessionUserId } from "@/lib/queries";
import { JENIS_AKAD_LABEL } from "@/lib/constants";
import type { StatusKelayakan } from "@/lib/engine";
import { answerCopilot, type CopilotAnswer, type ScenarioContext } from "@/lib/ai/copilot";

type Ok = { ok: true; data: CopilotAnswer };
type Err = { ok: false; error: string };

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

export async function askCopilot(question: string): Promise<Ok | Err> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  const rows = await db
    .select({
      id: scenarios.id,
      nama: scenarios.nama,
      jenisSkema: scenarios.jenisSkema,
      jenisAkad: scenarios.jenisAkad,
      status: scenarioResults.status,
      earPersen: scenarioResults.earPersen,
      dscrRataRata: scenarioResults.dscrRataRata,
      dscrMinimum: scenarioResults.dscrMinimum,
      npv: scenarioResults.npv,
      irrPersen: scenarioResults.irrPersen,
    })
    .from(scenarios)
    .innerJoin(scenarioResults, eq(scenarioResults.scenarioId, scenarios.id))
    .where(eq(scenarios.userId, userId))
    .orderBy(desc(scenarios.createdAt));

  const ctx: ScenarioContext[] = rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    skemaLabel:
      r.jenisSkema === "konvensional"
        ? "Konvensional"
        : r.jenisAkad
          ? JENIS_AKAD_LABEL[r.jenisAkad]
          : "Syariah",
    status: r.status as StatusKelayakan,
    earPersen: num(r.earPersen),
    dscrRataRata: num(r.dscrRataRata),
    dscrMinimum: num(r.dscrMinimum),
    npv: r.npv ?? 0,
    irrPersen: num(r.irrPersen),
  }));

  return { ok: true, data: answerCopilot(question ?? "", ctx) };
}
