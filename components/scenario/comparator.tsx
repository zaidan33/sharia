"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/scenario/status-badge";
import { JENIS_AKAD_LABEL } from "@/lib/constants";
import {
  formatPersen,
  formatRasio,
  formatRupiah,
  formatRupiahCompact,
} from "@/lib/format";
import type { ScenarioForCompare } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Dir = "low" | "high";

interface Metric {
  key: string;
  label: string;
  dir: Dir;
  num: (s: ScenarioForCompare) => number | null;
  fmt: (s: ScenarioForCompare) => string;
}

const METRICS: Metric[] = [
  { key: "ear", label: "Biaya efektif (EAR)", dir: "low", num: (s) => (s.earPersen ? Number(s.earPersen) : null), fmt: (s) => formatPersen(s.earPersen) },
  { key: "angsuran", label: "Angsuran pertama", dir: "low", num: (s) => s.angsuranPertama, fmt: (s) => formatRupiah(s.angsuranPertama) },
  { key: "total", label: "Total pembayaran", dir: "low", num: (s) => s.totalPembayaran, fmt: (s) => formatRupiah(s.totalPembayaran) },
  { key: "dscr", label: "DSCR rata-rata", dir: "high", num: (s) => (s.dscrRataRata ? Number(s.dscrRataRata) : null), fmt: (s) => formatRasio(s.dscrRataRata) },
  { key: "npv", label: "NPV", dir: "high", num: (s) => s.npv, fmt: (s) => formatRupiahCompact(s.npv) },
  { key: "irr", label: "IRR", dir: "high", num: (s) => (s.irrPersen ? Number(s.irrPersen) : null), fmt: (s) => formatPersen(s.irrPersen) },
  { key: "der", label: "DER", dir: "low", num: (s) => (s.der ? Number(s.der) : null), fmt: (s) => formatRasio(s.der) },
];

const MAX = 5;

export function Comparator({ scenarios }: { scenarios: ScenarioForCompare[] }) {
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = (id: number) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX ? s : [...s, id],
    );

  const picked = scenarios.filter((s) => selected.includes(s.id));

  const bestId = (m: Metric): number | null => {
    const vals = picked
      .map((s) => ({ id: s.id, v: m.num(s) }))
      .filter((x): x is { id: number; v: number } => x.v !== null);
    if (!vals.length) return null;
    return (m.dir === "low"
      ? vals.reduce((a, b) => (a.v < b.v ? a : b))
      : vals.reduce((a, b) => (a.v > b.v ? a : b))
    ).id;
  };

  const recommendation = (() => {
    const safe = picked.filter(
      (s) => (s.dscrRataRata ? Number(s.dscrRataRata) : 0) >= 1.25 && (s.npv ?? -Infinity) > 0,
    );
    if (!safe.length) return null;
    return [...safe].sort((a, b) => Number(a.earPersen) - Number(b.earPersen))[0];
  })();

  if (scenarios.length < 2) {
    return (
      <Card className="p-8 text-center text-sm text-slate">
        Butuh minimal 2 skenario untuk dibandingkan. Buat dulu di dashboard.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">
            Pilih 2 - {MAX} skenario
          </h2>
          <span className="text-xs text-slate">{selected.length} terpilih</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((s) => (
            <label
              key={s.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm",
                selected.includes(s.id)
                  ? "border-deepteal bg-deepteal/5"
                  : "border-border",
              )}
            >
              <Checkbox
                checked={selected.includes(s.id)}
                onCheckedChange={() => toggle(s.id)}
              />
              <span className="truncate text-ink">{s.nama}</span>
            </label>
          ))}
        </div>
      </Card>

      {picked.length >= 2 && (
        <>
          {recommendation ? (
            <Card className="border-feasible/40 bg-feasible/[0.06] p-4">
              <p className="text-xs uppercase tracking-wide text-feasible">
                Rekomendasi
              </p>
              <p className="mt-1 text-sm text-ink">
                <strong>{recommendation.nama}</strong> - EAR terendah di antara
                skenario yang aman (DSCR ≥ 1,25 dan NPV &gt; 0).
              </p>
            </Card>
          ) : (
            <Card className="border-watch/40 bg-watch/[0.06] p-4">
              <p className="text-sm text-ink">
                Tidak ada skenario terpilih yang memenuhi kriteria aman (DSCR ≥
                1,25 dan NPV &gt; 0). Pertimbangkan meninjau asumsi.
              </p>
            </Card>
          )}

          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-left text-xs text-slate">Metrik</th>
                  {picked.map((s) => (
                    <th key={s.id} className="p-3 text-left align-top">
                      <div className="font-medium text-ink">{s.nama}</div>
                      <div className="text-xs font-normal text-slate">
                        {s.jenisSkema === "syariah"
                          ? s.jenisAkad
                            ? JENIS_AKAD_LABEL[s.jenisAkad]
                            : "Syariah"
                          : "Konvensional"}
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={s.status} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => {
                  const best = bestId(m);
                  return (
                    <tr key={m.key} className="border-b border-border last:border-0">
                      <td className="p-3 text-xs text-slate">
                        {m.label}
                        <span className="ml-1 text-slate/70">
                          {m.dir === "low" ? "(↓ lbh murah)" : "(↑ lbh baik)"}
                        </span>
                      </td>
                      {picked.map((s) => (
                        <td
                          key={s.id}
                          className={cn(
                            "num p-3",
                            best === s.id &&
                              "bg-feasible/10 font-semibold text-feasible",
                          )}
                        >
                          {m.fmt(s)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
