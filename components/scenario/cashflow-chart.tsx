"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashflowPeriod } from "@/lib/engine";
import { formatRupiahCompact } from "@/lib/format";

type Row = {
  bulan: number;
  cfads: number;
  debtService: number;
  arusKasBersih: number;
};

/** Grafik arus kas: area CFADS, garis debt service, bar arus kas bersih (US#2). */
export function CashflowChart({ cashflow }: { cashflow: CashflowPeriod[] }) {
  const data: Row[] = cashflow.map((p) => ({
    bulan: p.bulan,
    cfads: p.cfads,
    debtService: p.debtService,
    arusKasBersih: p.arusKasBersih,
  }));
  const interval = Math.max(0, Math.floor(data.length / 12));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="bulan"
            interval={interval}
            tick={{ fontSize: 11 }}
            tickFormatter={(b) => `${b}`}
            label={{ value: "Bulan", position: "insideBottom", offset: -2, fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatRupiahCompact(v)}
            width={64}
          />
          <Tooltip
            formatter={(v: number, name) => [formatRupiahCompact(v), name]}
            labelFormatter={(b) => `Bulan ${b}`}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="cfads"
            name="CFADS"
            data-attr="cfads"
            fill="var(--color-deepteal)"
            fillOpacity={0.12}
            stroke="var(--color-deepteal)"
            strokeWidth={1.5}
          />
          <Bar dataKey="arusKasBersih" name="Arus kas bersih" fill="var(--color-amber)" fillOpacity={0.6} />
          <Line
            type="monotone"
            dataKey="debtService"
            name="Debt service"
            stroke="var(--color-risky)"
            strokeWidth={1.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
