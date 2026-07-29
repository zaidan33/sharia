"use client";

import { Card } from "@/components/ui/card";
import type { ScenarioComputation, ScenarioInput } from "@/lib/engine";
import { formatPersen, formatRupiah } from "@/lib/format";

/**
 * Kartu terminal value (V2.3) - ditampilkan sebagai komponen terpisah di
 * halaman detail saat pertumbuhan terminal (g) aktif dan g < discount rate.
 */
export function TerminalValueCard({
  input,
  computation,
}: {
  input: ScenarioInput;
  computation: ScenarioComputation;
}) {
  const tv = computation.terminalValue;

  // g tidak diisi -> terminal value nonaktif, sembunyikan kartu.
  if (tv.pertumbuhanTerminal === null) return null;
  // g >= r -> Gordon tak terdefinisi, tampilkan catatan peringatan.
  if (tv.pvTerminal === null) {
    return (
      <Card className="space-y-1 p-4">
        <h3 className="text-sm font-medium text-ink">Nilai residu (terminal value)</h3>
        <p className="text-xs text-slate">
          Pertumbuhan terminal {formatPersen(tv.pertumbuhanTerminal * 100, 1)}{" "}
          tidak boleh lebih besar atau sama dengan discount rate{" "}
          {formatPersen(input.discountRateTahunan, 1)}. Nilai residu tidak
          dihitung - turunkan g atau naikkan discount rate.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h3 className="text-sm font-medium text-ink">Nilai residu (terminal value)</h3>
        <p className="text-xs text-slate">
          Gordon growth: CF tahun terakhir &times; (1 + g) / (r - g), lalu
          didiskontokan ke nilai kini. g = {formatPersen(tv.pertumbuhanTerminal * 100, 1)},
          r = {formatPersen(input.discountRateTahunan, 1)}.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Nilai residu di akhir horizon" value={formatRupiah(tv.terminalValue)} />
        <Stat label="PV nilai residu" value={formatRupiah(tv.pvTerminal)} />
        <Stat
          label="NPV total (inkremental + residu)"
          value={formatRupiah(computation.npvWithTerminal)}
          tone={computation.npvWithTerminal > 0 ? "feasible" : "risky"}
          sub={`NPV inkremental ${formatRupiah(computation.varian.base.npv)}`}
        />
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "feasible" | "risky";
}) {
  const color =
    tone === "feasible"
      ? "text-feasible"
      : tone === "risky"
        ? "text-risky"
        : "text-ink";
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-slate">{label}</p>
      <p className={"num text-base font-semibold " + color}>{value}</p>
      {sub && <p className="text-[11px] text-slate">{sub}</p>}
    </div>
  );
}
