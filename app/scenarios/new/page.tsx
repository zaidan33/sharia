import { ScenarioForm } from "@/components/scenario/scenario-form";

export default function NewScenarioPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Skenario baru
        </h1>
        <p className="text-sm text-slate">
          Isi asumsi pembiayaan dalam empat langkah.
        </p>
      </div>
      <ScenarioForm mode="create" />
    </div>
  );
}
