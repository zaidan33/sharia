import { notFound, redirect } from "next/navigation";
import { getSessionUserId, getScenarioOwned } from "@/lib/queries";
import { dbRowToScenarioInput } from "@/lib/mappers";
import { ScenarioForm } from "@/components/scenario/scenario-form";

export default async function EditScenarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const row = await getScenarioOwned(Number(id), userId);
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Ubah skenario
        </h1>
        <p className="text-sm text-slate">{row.nama}</p>
      </div>
      <ScenarioForm
        mode="edit"
        scenarioId={row.id}
        initial={dbRowToScenarioInput(row)}
      />
    </div>
  );
}
