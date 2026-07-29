import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { getSessionUserId, getScenarioOwned } from "@/lib/queries";
import { dbRowToScenarioInput } from "@/lib/mappers";
import { computeScenario } from "@/lib/engine";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/scenario/status-badge";
import { DeleteScenarioDialog } from "@/components/scenario/delete-scenario-dialog";
import { ScenarioResults } from "@/components/scenario/scenario-results";
import { ModelCaveats } from "@/components/scenario/model-caveats";
import { JENIS_AKAD_LABEL, PROFIL_RISIKO_LABEL } from "@/lib/constants";

export default async function ScenarioDetailPage({
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
  const computation = computeScenario(input);
  const akad = row.jenisAkad ? JENIS_AKAD_LABEL[row.jenisAkad] : "Konvensional";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-ink">
              {row.nama}
            </h1>
            <StatusBadge status={computation.status} />
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-slate">
              Risiko {PROFIL_RISIKO_LABEL[row.profilRisiko]}
            </span>
          </div>
          <p className="text-sm text-slate">
            {row.jenisUsaha} - {akad} - {row.tujuanPembiayaan}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/scenarios/${row.id}/edit`}>
              <Pencil className="size-4" /> Ubah
            </Link>
          </Button>
          <DeleteScenarioDialog scenarioId={row.id} scenarioName={row.nama} />
        </div>
      </div>

      <ScenarioResults
        scenarioId={row.id}
        input={input}
        computation={computation}
      />

      <ModelCaveats />
    </div>
  );
}
