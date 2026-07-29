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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computeSensitivity } from "@/lib/actions/sensitivity-actions";
import type {
  SensitivityResult,
  SensitivityTarget,
} from "@/lib/engine/sensitivity";
import { formatPersen, formatRasio, formatRupiahCompact } from "@/lib/format";

const TARGETS: { v: SensitivityTarget; l: string }[] = [
  { v: "npv", l: "NPV" },
  { v: "irr", l: "IRR" },
  { v: "dscr", l: "DSCR" },
];

export function SensitivityPanel({ scenarioId }: { scenarioId: number }) {
  const [target, setTarget] = useState<SensitivityTarget>("npv");
  const [result, setResult] = useState<SensitivityResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fmt = (v: number) =>
    target === "npv"
      ? formatRupiahCompact(v)
      : target === "irr"
        ? formatPersen(v)
        : formatRasio(v);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await computeSensitivity(scenarioId, target);
      if (res.ok) setResult(res.data);
      else setError(res.error);
    });
  };

  const data = (result?.swings ?? []).map((s) => ({
    label: s.label,
    offset: s.low,
    range: Math.max(0, s.high - s.low),
  }));

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-ink">Analisis sensitivitas</h3>
          <p className="text-xs text-slate">
            Dampak perubahan tiap parameter ±10% / ±20% terhadap metrik. Bar
            yang lebih panjang = metrik lebih sensitif terhadap parameter itu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={target}
            onValueChange={(v) => {
              setTarget(v as SensitivityTarget);
              setResult(null);
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGETS.map((t) => (
                <SelectItem key={t.v} value={t.v}>
                  {t.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={run} disabled={pending}>
            {pending ? "Menghitung..." : "Jalankan"}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-risky">Gagal: {error}</p>}

      {result && data.length > 0 && (
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={fmt}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11 }}
                width={150}
              />
              <Tooltip
                formatter={(v: number) => [fmt(v), "rentang"]}
                contentStyle={{ fontSize: 12 }}
              />
              {/* offset transparan memosisikan bar di `low`; range = batang low->high */}
              <Bar dataKey="offset" stackId="a" fill="transparent" />
              <Bar
                dataKey="range"
                stackId="a"
                fill="var(--color-deepteal)"
                radius={[0, 2, 2, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
