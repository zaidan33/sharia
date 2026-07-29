import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="bg-deepteal">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-16 text-center">
        <h2 className="font-display text-2xl font-semibold text-ivory sm:text-3xl">
          Mulai analisis skenario pertama Anda
        </h2>
        <Button asChild size="lg" variant="secondary" className="bg-ivory text-deepteal hover:bg-ivory/90">
          <Link href="/dashboard">Buka Dashboard</Link>
        </Button>
      </div>
    </section>
  );
}
