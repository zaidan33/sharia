"use client";

import { useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computeMonteCarlo } from "@/lib/actions/monte-carlo-actions";
import type { MonteCarloResult } from "@/lib/engine/monte-carlo";
import { formatPersen, formatRupiah, formatRupiahCompact } from "@/lib/format";

const ITERATIONS = [
  { v: 500, l: "500" },
  { v: 1000, l: "1.000" },
  { v: 2000, l: "2.000" },
];

export function MonteCarloPanel({ scenarioId }: { scenarioId: number }) {
  const [iterations, setIterations] = useState(1000);
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await computeMonteCarlo(scenarioId, iterations);
      if (res.ok) setResult(res.data);
      else setError(res.error);
    });
  };

  const bins = (result?.npv.histogram ?? []).map((b, i) => ({
    label: formatRupiahCompact((b.start + b.end) / 2),
    count: b.count,
    idx: i,
  }));

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-ink">Simulasi Monte Carlo</h3>
          <p className="text-xs text-slate">
            Mengganggu pertumbuhan pendapatan &amp; inflasi (Normal) sebanyak{" "}
            {iterations.toLocaleString("id-ID")} kali untuk memetakan distribusi
            hasil. Bukan jaminan - gambaran rentang risiko.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(iterations)}
            onValueChange={(v) => {
              setIterations(Number(v));
              setResult(null);
            }}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITERATIONS.map((o) => (
                <SelectItem key={o.v} value={String(o.v)}>
                  {o.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={run} disabled={pending}>
            {pending ? "Menyimulasikan..." : "Jalankan"}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-risky">Gagal: {error}</p>}

      {result && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="NPV median (p50)" value={formatRupiah(result.npv.percentiles.p50)} />
            <Stat label="NPV rata-rata" value={formatRupiah(result.npv.mean)} />
            <Stat
              label="P(NPV negatif)"
              value={formatPersen(result.probNpvNegatif * 100, 1)}
              tone={result.probNpvNegatif > 0.3 ? "risky" : result.probNpvNegatif > 0.1 ? "watch" : "feasible"}
            />
            <Stat
              label="P(DSCR < 1)"
              value={formatPersen(result.probDscrKurangDari1 * 100, 1)}
              tone={result.probDscrKurangDari1 > 0.3 ? "risky" : result.probDscrKurangDari1 > 0.1 ? "watch" : "feasible"}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-5">
            <RangeStat label="p5" value={formatRupiahCompact(result.npv.percentiles.p5)} />
            <RangeStat label="p25" value={formatRupiahCompact(result.npv.percentiles.p25)} />
            <RangeStat label="p50" value={formatRupiahCompact(result.npv.percentiles.p50)} />
            <RangeStat label="p75" value={formatRupiahCompact(result.npv.percentiles.p75)} />
            <RangeStat label="p95" value={formatRupiahCompact(result.npv.percentiles.p95)} />
          </div>

          {bins.length > 0 && (
            <div className="h-[260px]">
              <p className="mb-1 text-xs text-slate">Distribusi NPV</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bins}
                  margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={{ fontSize: 10 }} width={28} />
                  <Tooltip
                    formatter={(v: number) => [`${v} iterasi`, "frekuensi"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="var(--color-deepteal)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "feasible" | "watch" | "risky";
}) {
  const color =
    tone === "feasible"
      ? "text-feasible"
      : tone === "risky"
        ? "text-risky"
        : tone === "watch"
          ? "text-watch"
          : "text-ink";
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-slate">{label}</p>
      <p className={"num text-sm font-semibold " + color}>{value}</p>
    </div>
  );
}

function RangeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
      <p className="text-[11px] text-slate">{label}</p>
      <p className="num text-xs font-medium text-ink">{value}</p>
    </div>
  );
}
