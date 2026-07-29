"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Kartu metrik dengan panel "Bagaimana ini dihitung" yang menampilkan rumus
 * dan nilai masukannya (PRD §3 transparansi, US#7).
 */
export function MetricCard({
  label,
  value,
  sub,
  tone = "default",
  formula,
  inputs,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "feasible" | "watch" | "risky";
  formula?: string;
  inputs?: string;
}) {
  const [open, setOpen] = useState(false);
  const toneClass = {
    default: "text-ink",
    feasible: "text-feasible",
    watch: "text-watch",
    risky: "text-risky",
  }[tone];

  return (
    <Card className="flex flex-col p-4">
      <p className="text-xs text-slate">{label}</p>
      <p className={cn("num mt-1 text-2xl font-semibold", toneClass)}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate">{sub}</p>}
      {formula && (
        <div className="mt-auto pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-deepteal"
            onClick={() => setOpen((o) => !o)}
          >
            Bagaimana dihitung
            {open ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </Button>
          {open && (
            <div className="mt-1 space-y-1 rounded-md border border-border bg-muted/50 p-3 text-xs">
              <p className="font-mono leading-relaxed text-ink">{formula}</p>
              {inputs && <p className="text-slate">{inputs}</p>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
