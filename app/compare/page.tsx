import { redirect } from "next/navigation";
import { getSessionUserId, listScenariosForCompare } from "@/lib/queries";
import { Comparator } from "@/components/scenario/comparator";

export default async function ComparePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const scenarios = await listScenariosForCompare(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Bandingkan skenario
        </h1>
        <p className="text-sm text-slate">
          Bandingkan biaya efektif dan kelayakan beberapa skema secara
          apple-to-apple - pilih dua atau lebih skenario.
        </p>
      </div>
      <Comparator scenarios={scenarios} />
    </div>
  );
}
