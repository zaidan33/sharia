import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { getSessionUserId, getScenarioOwned, listScenariosForCompare } from "@/lib/queries";
import { dbRowToScenarioInput } from "@/lib/mappers";
import { computeScenario } from "@/lib/engine";
import { runSensitivity } from "@/lib/engine/sensitivity";
import { generateNarrative } from "@/lib/ai/narrative";
import { buildReportData } from "@/lib/report/build-report-data";
import { ReportClient } from "@/components/report/report-client";
import { Button } from "@/components/ui/button";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const row = await getScenarioOwned(Number(id), userId);
  if (!row) notFound();

  const input = dbRowToScenarioInput(row);
  const comp = computeScenario(input);
  // Narasi template (sinkron) agar dokumen laporan dirender cepat & deterministik.
  const narrative = generateNarrative(input, comp);
  const sens = runSensitivity(input, "npv");
  const comparison = (await listScenariosForCompare(userId)).filter(
    (s) => s.id !== row.id,
  );

  const tanggal = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const data = buildReportData({
    input,
    comp,
    narrative,
    sensitivitySwings: sens.swings,
    sensitivityTarget: sens.target,
    baseMetric: sens.base.npv,
    comparison,
    currentId: row.id,
    tanggal,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={`/scenarios/${row.id}`}>
              <ArrowLeft className="size-4" /> Kembali ke skenario
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Laporan kelayakan
          </h1>
          <p className="text-sm text-slate">{row.nama}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-slate">
          <FileText className="size-4 text-deepteal" />
          Dokumen PDF dibuat di peramban.
        </div>
      </div>

      <ReportClient data={data} />
    </div>
  );
}
