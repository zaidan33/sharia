import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId, listScenariosForUser } from "@/lib/queries";
import { ScenarioCard } from "@/components/scenario/scenario-card";
import { ScenarioEmptyState } from "@/components/scenario/scenario-empty-state";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const items = await listScenariosForUser(userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Skenario pembiayaan
          </h1>
          <p className="text-sm text-slate">{items.length} skenario tersimpan</p>
        </div>
        <Button asChild>
          <Link href="/scenarios/new">
            <Plus className="size-4" /> Skenario baru
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <ScenarioEmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <ScenarioCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
