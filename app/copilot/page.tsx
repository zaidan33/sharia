import { redirect } from "next/navigation";
import { getSessionUserId, listScenariosForUser } from "@/lib/queries";
import { CopilotChat } from "@/components/scenario/copilot-chat";

export default async function CopilotPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const scenarios = await listScenariosForUser(userId);
  const suggestions = scenarios.map((s) => s.nama);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Copilot skenario
        </h1>
        <p className="text-sm text-slate">
          Tanya jawab tentang skenario Anda - perbandingan, risiko, atau
          rekomendasi. Jawaban disusun dari aturan, bukan model bahasa.
        </p>
      </div>
      <CopilotChat suggestions={suggestions} />
    </div>
  );
}
