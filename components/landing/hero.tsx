import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ComparisonVisual } from "@/components/landing/comparison-visual";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-ivory">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <nav className="flex items-center justify-between">
          <span className="font-display text-lg font-semibold text-deepteal">
            Kelayakan Pembiayaan
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Masuk</Link>
          </Button>
        </nav>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-deep">
            Analisis kelayakan pembiayaan
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Satu kebutuhan dana. Dua skema. Satu perbandingan yang adil.
          </h1>
          <p className="max-w-xl text-base text-slate">
            Hitung kelayakan pembiayaan syariah dan konvensional dalam satu
            kerangka kerja yang sama - setiap angka bisa ditelusuri balik ke
            rumus dan asumsinya.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">Buka Dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#cara-kerja">Lihat cara kerja</Link>
            </Button>
          </div>
        </div>

        <ComparisonVisual />
      </div>
    </section>
  );
}
