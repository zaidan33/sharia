import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ScenarioEmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <h2 className="font-display text-xl font-semibold text-ink">
        Belum ada skenario
      </h2>
      <p className="max-w-md text-sm text-slate">
        Buat skenario pembiayaan pertama untuk menganalisis kelayakannya - baik
        skema syariah maupun konvensional, dengan setiap angka bisa ditelusuri
        balik ke rumus dan asumsinya.
      </p>
      <Button asChild>
        <Link href="/scenarios/new">Buat skenario pertama</Link>
      </Button>
    </Card>
  );
}
