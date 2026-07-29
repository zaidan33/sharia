"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScenarioCard } from "@/components/scenario/scenario-card";
import { ScenarioEmptyState } from "@/components/scenario/scenario-empty-state";
import type { ScenarioSummary } from "@/lib/queries";

type Filter = "all" | "LAYAK" | "WASPADA" | "TIDAK_LAYAK";

const FILTERS: { v: Filter; l: string }[] = [
  { v: "all", l: "Semua status" },
  { v: "LAYAK", l: "Layak" },
  { v: "WASPADA", l: "Waspada" },
  { v: "TIDAK_LAYAK", l: "Tidak layak" },
];

export function ScenarioList({ items }: { items: ScenarioSummary[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (!needle) return true;
      return (
        s.nama.toLowerCase().includes(needle) ||
        s.jenisUsaha.toLowerCase().includes(needle)
      );
    });
  }, [items, q, filter]);

  if (items.length === 0) return <ScenarioEmptyState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama atau sektor skenario..."
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.v} value={f.v}>
                {f.l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-slate">
          Tidak ada skenario yang cocok dengan pencarian ini.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <ScenarioCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
