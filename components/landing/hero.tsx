import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ComparisonVisual } from "@/components/landing/comparison-visual";
import { Reveal } from "@/components/landing/reveal";

export function Hero() {
  return (
    <section className="bg-brand-gradient relative overflow-hidden border-b border-border bg-ivory">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <nav className="flex items-center justify-between">
          <span className="font-display text-lg font-semibold text-deepteal">
            Kelayakan Pembiayaan
          </span>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/about">Tentang</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Masuk</Link>
            </Button>
          </div>
        </nav>
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-10 lg:grid-cols-2 lg:items-center">
        <Reveal className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-deep">
            Analisis kelayakan pembiayaan
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.1] text-ink sm:text-5xl">
            Satu kebutuhan dana. Dua skema. Satu perbandingan yang adil.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate">
            Hitung kelayakan pembiayaan syariah dan konvensional dalam satu
            kerangka kerja yang sama. Setiap angka bisa ditelusuri balik ke rumus
            dan asumsinya, bukan kotak hitam.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">Buka Dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#cara-kerja">Lihat cara kerja</Link>
            </Button>
          </div>
          <p className="text-xs text-slate">
            Normalisasi ke Effective Annual Rate - perbandingan apple-to-apple antar-skema.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <ComparisonVisual />
        </Reveal>
      </div>
    </section>
  );
}
