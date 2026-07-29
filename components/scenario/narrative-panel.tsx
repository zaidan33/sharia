"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { NarrativeResult } from "@/lib/ai/narrative";

/**
 * Panel narasi (V5.1) - menampilkan ringkasan template-based + tombol salin.
 */
export function NarrativePanel({ narrative }: { narrative: NarrativeResult }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(narrative.full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia (konteks tidak aman) - diam.
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Profil pembiayaan</h2>
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {copied ? <Check className="size-4 text-feasible" /> : <Copy className="size-4" />}
            {copied ? "Tersalin" : "Salin narasi"}
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-ink">{narrative.profil}</p>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-base font-semibold text-ink">Analisis per metrik</h2>
        <Metric title="Biaya efektif (EAR)" text={narrative.metrics.ear} />
        <Metric title="DSCR" text={narrative.metrics.dscr} />
        <Metric title="NPV" text={narrative.metrics.npv} />
        <Metric title="IRR" text={narrative.metrics.irr} />
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-base font-semibold text-ink">Analisis kelayakan</h2>
        <p className="text-sm leading-relaxed text-ink">{narrative.kelayakan}</p>
      </Card>

      <Card className="space-y-2 border-l-4 border-l-deepteal p-5">
        <h2 className="text-base font-semibold text-ink">Rekomendasi</h2>
        <p className="text-sm leading-relaxed text-ink">{narrative.rekomendasi}</p>
      </Card>

      <p className="text-xs text-slate">
        Narasi dibuat dari template berbasis hasil hitung, bukan dari model
        bahasa. Angka mengikuti asumsi skenario - bukan jaminan hasil.
      </p>
    </div>
  );
}

function Metric({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-deepteal">{title}</p>
      <p className="text-sm leading-relaxed text-ink">{text}</p>
    </div>
  );
}
