"use server";

/**
 * Server Action Structure Optimizer (V4.1).
 * Stateless (tidak baca/tulis DB) - tapi tetap verifikasi sesi (CLAUDE.md #4).
 */
import { ZodError } from "zod";
import { getSessionUserId } from "@/lib/queries";
import { optimizerInputSchema } from "@/lib/validation/optimizer-schema";
import { findOptimalStructure, type CandidateStructure } from "@/lib/engine/optimizer";

export type OptimizerResult =
  | { ok: true; data: CandidateStructure[] }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function flattenFieldErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function optimizeStructure(raw: unknown): Promise<OptimizerResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  const parsed = optimizerInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "INVALID_INPUT",
      fieldErrors: flattenFieldErrors(parsed.error),
    };
  }

  const data = findOptimalStructure(parsed.data, 5);
  return { ok: true, data };
}
