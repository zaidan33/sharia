"use client";

import { AlertTriangle, Info, TriangleAlert } from "lucide-react";
import type { AnomalyWarning, AnomalyLevel } from "@/lib/engine/anomaly";

const STYLE: Record<
  AnomalyLevel,
  { wrap: string; icon: typeof Info; iconClass: string }
> = {
  risk: { wrap: "border-risky/30 bg-risky/5 text-ink", icon: TriangleAlert, iconClass: "text-risky" },
  watch: { wrap: "border-amber/40 bg-amber/5 text-ink", icon: AlertTriangle, iconClass: "text-amber" },
  info: { wrap: "border-deepteal/25 bg-muted/40 text-ink", icon: Info, iconClass: "text-deepteal" },
};

/**
 * Daftar peringatan anomali (V3.2). Ditampilkan saat membuat/mengubah skenario
 * untuk menandai input yang menyimpang dari pola sektor. Info, bukan blokir.
 */
export function AnomalyWarnings({ warnings }: { warnings: AnomalyWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate">
        Catatan anomali (dibandingkan {warnings.length > 1 ? "pola" : "pola"} sektor):
      </p>
      {warnings.map((w, i) => {
        const s = STYLE[w.level];
        const Icon = s.icon;
        return (
          <div
            key={i}
            className={"flex items-start gap-2 rounded-lg border px-3 py-2 text-xs " + s.wrap}
          >
            <Icon className={"mt-0.5 size-3.5 shrink-0 " + s.iconClass} />
            <span className="leading-relaxed">{w.message}</span>
          </div>
        );
      })}
    </div>
  );
}
