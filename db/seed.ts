/**
 * Skrip seed 20 kasus (IMPLEMENTATION_PLAN §11.2).
 * Menghitung + menyimpan hasil perhitungan agar dashboard langsung terisi.
 * Idempoten: skenario lama milik user seed dihapus dulu.
 *
 * Jalankan: npm run db:seed
 * Butuh: SEED_USER_EMAIL dan SEED_USER_PASSWORD di .env.
 */
import "dotenv/config";
// Akun awal hanya bisa dibuat jika ALLOW_SIGNUP aktif (lihat lib/auth.ts).
process.env.ALLOW_SIGNUP = "1";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { scenarios, scenarioResults } from "@/db/schema";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { computeScenario } from "@/lib/engine";
import { scenarioInputToInsert, toResultRow } from "@/lib/mappers";
import { SEED_SCENARIOS } from "@/lib/seed-data";

async function ensureSeedUser(): Promise<string> {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "SEED_USER_EMAIL dan SEED_USER_PASSWORD wajib diisi di .env",
    );
  }
  const [existing] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (existing) return existing.id;
  const created = await auth.api.signUpEmail({
    body: { email, password, name: "Pemilik Alat" },
  });
  return created.user.id;
}

async function seed() {
  const userId = await ensureSeedUser();
  // Idempoten: hapus skenario lama milik user seed sebelum menanam ulang.
  await db.delete(scenarios).where(eq(scenarios.userId, userId));

  for (const input of SEED_SCENARIOS) {
    const comp = computeScenario(input);
    const [row] = await db
      .insert(scenarios)
      .values(scenarioInputToInsert(input, userId))
      .returning({ id: scenarios.id });
    await db.insert(scenarioResults).values(toResultRow(row.id, comp));
  }

  console.log(`Seeded ${SEED_SCENARIOS.length} skenario untuk user ${userId}.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
