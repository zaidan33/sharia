"use client";

import { Lightbulb } from "lucide-react";
import { calibrate, type CalibratedKey } from "@/lib/engine/calibrator";
import { formatPersen } from "@/lib/format";

/**
 * Saran kalibrasi asumsi (V4.3). Berdasarkan pola sektor + skala dana/tenor
 * dari seed cases. Tombol "Terapkan" mengisi field - pengguna bisa menimpa.
 */
export function CalibrationHints({
  sector,
  amount,
  tenor,
  onApply,
}: {
  sector: string;
  amount: number;
  tenor: number;
  onApply: (key: CalibratedKey, value: number) => void;
}) {
  if (!sector) return null;
  const hints = calibrate(sector, amount, tenor);

  return (
    <div className="rounded-lg border border-deepteal/20 bg-muted/40 p-3 sm:col-span-2">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="size-4 text-amber" />
        <p className="text-xs font-medium text-ink">
          Saran asumsi ({hints[0].reference})
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {hints.map((h) => (
          <div
            key={h.key}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
          >
            <div>
              <p className="text-xs text-slate">{h.label}</p>
              <p className="num text-xs font-medium text-ink">
                {formatPersen(h.low, 0)} - {formatPersen(h.high, 0)}
                <span className="text-slate"> · median {formatPersen(h.suggested, 0)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onApply(h.key, h.suggested)}
              className="shrink-0 rounded-md border border-deepteal/40 px-2 py-1 text-[11px] font-medium text-deepteal hover:bg-deepteal/5"
            >
              Terapkan {formatPersen(h.suggested, 0)}
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate">
        Rentang kuartil dari kasus acuan. Hanya saran - sesuaikan dengan kondisi Anda.
      </p>
    </div>
  );
}
