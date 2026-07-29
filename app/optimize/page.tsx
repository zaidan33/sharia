import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/queries";
import { OptimizerForm } from "@/components/scenario/optimizer-form";

export default async function OptimizePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Cari struktur optimal
        </h1>
        <p className="text-sm text-slate">
          Jelajahi kombinasi skema, akad, dan tenor secara otomatis untuk
          kebutuhan dana dan kondisi usaha Anda. Hasil dirangking menurut skor
          tertimbang (DSCR, NPV, biaya efektif, IRR).
        </p>
      </div>
      <OptimizerForm />
    </div>
  );
}
