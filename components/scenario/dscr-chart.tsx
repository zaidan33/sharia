"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashflowPeriod } from "@/lib/engine";
import { formatRasio } from "@/lib/format";

type Row = { bulan: number; dscr: number | null };

/** Grafik DSCR per periode dengan garis ambang 1,25 dan 1,00 (US#3). */
export function DscrChart({
  cashflow,
  dscr,
}: {
  cashflow: CashflowPeriod[];
  dscr: (number | null)[];
}) {
  const data: Row[] = cashflow.map((p, i) => ({
    bulan: p.bulan,
    dscr: dscr[i] ?? null,
  }));
  const interval = Math.max(0, Math.floor(data.length / 12));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="bulan"
            interval={interval}
            tick={{ fontSize: 11 }}
            label={{ value: "Bulan", position: "insideBottom", offset: -2, fontSize: 11 }}
          />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            formatter={(v: number) => [formatRasio(v), "DSCR"]}
            labelFormatter={(b) => `Bulan ${b}`}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine y={1.25} stroke="var(--color-feasible)" strokeDasharray="4 4" label={{ value: "1,25", fontSize: 10, fill: "var(--color-feasible)", position: "right" }} />
          <ReferenceLine y={1.0} stroke="var(--color-risky)" strokeDasharray="4 4" label={{ value: "1,00", fontSize: 10, fill: "var(--color-risky)", position: "right" }} />
          <Line
            type="monotone"
            dataKey="dscr"
            stroke="var(--color-deepteal)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
