import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";

/** Shell bersama untuk route privat: header (brand + nav + user + keluar) + main. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user.email;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="font-display text-lg font-semibold text-deepteal"
            >
              Kelayakan Pembiayaan
            </Link>
            <nav className="flex items-center gap-1">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/scenarios/new">Skenario baru</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/compare">Bandingkan</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/optimize">Optimizer</Link>
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {email && (
              <span className="hidden text-sm text-slate sm:inline">
                {email}
              </span>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
