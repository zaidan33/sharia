import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/scenario/status-badge";
import { JENIS_AKAD_LABEL, PROFIL_RISIKO_LABEL } from "@/lib/constants";
import { formatPersen, formatRasio, formatRupiahCompact } from "@/lib/format";
import type { ScenarioSummary } from "@/lib/queries";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate">{label}</p>
      <p className="num font-medium text-ink">{value}</p>
    </div>
  );
}

export function ScenarioCard({ s }: { s: ScenarioSummary }) {
  const akad = s.jenisAkad ? JENIS_AKAD_LABEL[s.jenisAkad] : "Konvensional";
  return (
    <Link href={`/scenarios/${s.id}`} className="group block">
      <Card className="shadow-premium h-full p-4 transition-all duration-200 hover:-translate-y-1 hover:border-deepteal/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-ink">{s.nama}</h3>
            <p className="text-xs text-slate">
              {s.jenisUsaha} - {akad}
            </p>
          </div>
          <StatusBadge status={s.status} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Metric label="Biaya efektif" value={formatPersen(s.earPersen)} />
          <Metric label="DSCR rata-rata" value={formatRasio(s.dscrRataRata)} />
          <Metric label="NPV" value={formatRupiahCompact(s.npv)} />
          <Metric
            label="Profil risiko"
            value={PROFIL_RISIKO_LABEL[s.profilRisiko]}
          />
        </div>
      </Card>
    </Link>
  );
}
