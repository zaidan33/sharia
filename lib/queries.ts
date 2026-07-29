/**
 * Akses data server-side (SSR) - dipakai halaman (server component) dan
 * Server Action. Dipisah dari actions agar tidak memanggil 'use server' saat render.
 */
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { scenarios, scenarioResults } from "@/db/schema";

export interface ScenarioSummary {
  id: number;
  nama: string;
  jenisUsaha: string;
  profilRisiko: "rendah" | "sedang" | "tinggi";
  jenisSkema: "syariah" | "konvensional";
  jenisAkad: "murabahah" | "ijarah" | "musyarakah_mutanaqishah" | null;
  status: "LAYAK" | "WASPADA" | "TIDAK_LAYAK";
  earPersen: string | null;
  dscrRataRata: string | null;
  npv: number | null;
  createdAt: Date;
}

/** userId dari sesi, atau null bila tidak terotentikasi. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function listScenariosForUser(
  userId: string,
): Promise<ScenarioSummary[]> {
  return db
    .select({
      id: scenarios.id,
      nama: scenarios.nama,
      jenisUsaha: scenarios.jenisUsaha,
      profilRisiko: scenarios.profilRisiko,
      jenisSkema: scenarios.jenisSkema,
      jenisAkad: scenarios.jenisAkad,
      status: scenarioResults.status,
      earPersen: scenarioResults.earPersen,
      dscrRataRata: scenarioResults.dscrRataRata,
      npv: scenarioResults.npv,
      createdAt: scenarios.createdAt,
    })
    .from(scenarios)
    .innerJoin(scenarioResults, eq(scenarioResults.scenarioId, scenarios.id))
    .where(eq(scenarios.userId, userId))
    .orderBy(desc(scenarios.createdAt));
}

/** Baris skenario milik userId, atau null (tidak ada / milik pengguna lain). */
export async function getScenarioOwned(id: number, userId: string) {
  const [row] = await db
    .select()
    .from(scenarios)
    .where(and(eq(scenarios.id, id), eq(scenarios.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** Skenario + seluruh metrik tersimpan, untuk Komparator (V2.2). */
export interface ScenarioForCompare {
  id: number;
  nama: string;
  jenisSkema: "syariah" | "konvensional";
  jenisAkad: "murabahah" | "ijarah" | "musyarakah_mutanaqishah" | null;
  status: "LAYAK" | "WASPADA" | "TIDAK_LAYAK";
  earPersen: string | null;
  angsuranPertama: number | null;
  totalPembayaran: number | null;
  dscrRataRata: string | null;
  npv: number | null;
  irrPersen: string | null;
  der: string | null;
}

export async function listScenariosForCompare(
  userId: string,
): Promise<ScenarioForCompare[]> {
  return db
    .select({
      id: scenarios.id,
      nama: scenarios.nama,
      jenisSkema: scenarios.jenisSkema,
      jenisAkad: scenarios.jenisAkad,
      status: scenarioResults.status,
      earPersen: scenarioResults.earPersen,
      angsuranPertama: scenarioResults.angsuranPertama,
      totalPembayaran: scenarioResults.totalPembayaran,
      dscrRataRata: scenarioResults.dscrRataRata,
      npv: scenarioResults.npv,
      irrPersen: scenarioResults.irrPersen,
      der: scenarioResults.der,
    })
    .from(scenarios)
    .innerJoin(scenarioResults, eq(scenarioResults.scenarioId, scenarios.id))
    .where(eq(scenarios.userId, userId))
    .orderBy(desc(scenarios.createdAt));
}
