import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // your drizzle instance
import { account, session, user, verification } from "@/db/schema/auth";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        schema: {
            user: user,
            account: account,
            session: session,
            verification: verification,
        }
    }),
    emailAndPassword: {
        enabled: true,
    },
    // Pendaftaran publik dimatikan (PRD §13). Akun awal hanya bisa dibuat oleh
    // skrip seed (db/seed.ts) yang menyetel ALLOW_SIGNUP=1; setiap percobaan
    // sign-up lain diblokir di databaseHooks. Catatan: better-auth v1.3.7 tidak
    // punya opsi emailAndPassword.disableSignUp (itu hanya untuk provider OAuth),
    // jadi databaseHooks.user.create.before yang mengembalikan false adalah cara
    // idiomatik yang benar untuk memblokir pembuatan user.
    databaseHooks: {
        user: {
            create: {
                before: async () => process.env.ALLOW_SIGNUP === "1",
            },
        },
    },
});