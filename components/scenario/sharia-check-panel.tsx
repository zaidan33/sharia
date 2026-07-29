"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runShariaCheck, saveDpsChecklist } from "@/lib/actions/sharia-check-actions";
import type { ShariaCheckResult, ShariaStatus, DpsItem, FindingLevel } from "@/lib/ai/sharia-check";

const STATUS_STYLE: Record<ShariaStatus, { color: string; icon: typeof ShieldCheck; label: string }> = {
  SYARIAH: { color: "text-feasible", icon: ShieldCheck, label: "SYARIAH" },
  PERLU_KONFIRMASI_DPS: { color: "text-watch", icon: ShieldQuestion, label: "PERLU KONFIRMASI DPS" },
  TIDAK_SESUI: { color: "text-risky", icon: ShieldAlert, label: "TIDAK SESUAI" },
};

const FINDING_STYLE: Record<FindingLevel, string> = {
  ok: "border-feasible/30 bg-feasible/5 text-ink",
  warning: "border-amber/40 bg-amber/5 text-ink",
  violation: "border-risky/30 bg-risky/5 text-ink",
};

export interface ShariaScenarioOption {
  id: number;
  nama: string;
  skemaLabel: string;
}

export function ShariaCheckPanel({
  scenarios,
}: {
  scenarios: ShariaScenarioOption[];
}) {
  const [selectedId, setSelectedId] = useState<number | null>(
    scenarios[0]?.id ?? null,
  );
  const [result, setResult] = useState<ShariaCheckResult | null>(null);
  const [checklist, setChecklist] = useState<DpsItem[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (id: number) => {
    setSelectedId(id);
    setError(null);
    startTransition(async () => {
      const res = await runShariaCheck(id);
      if (res.ok) {
        setResult(res.data);
        setChecklist(res.data.dpsChecklist);
        setConfirmed(false);
      } else {
        setError(res.error === "UNAUTHORIZED" ? "Sesi berakhir." : "Gagal memeriksa.");
        setResult(null);
      }
    });
  };

  const toggle = (id: string) => {
    setChecklist((cs) => cs.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c)));
    setConfirmed(false);
  };

  const save = () => {
    if (!selectedId) return;
    startSave(async () => {
      const res = await saveDpsChecklist(selectedId, checklist);
      if (res.ok) setConfirmed(res.data.confirmed);
    });
  };

  if (scenarios.length === 0) {
    return (
      <Card className="p-6 text-sm text-slate">
        Belum ada skenario untuk diperiksa. Buat skenario dulu di Dashboard.
      </Card>
    );
  }

  const StatusIcon = result ? STATUS_STYLE[result.status].icon : ShieldQuestion;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">Pilih skenario</label>
            <Select
              value={selectedId ? String(selectedId) : undefined}
              onValueChange={(v) => run(Number(v))}
            >
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Pilih skenario" />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nama} - {s.skemaLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {result && (
            <div className={"flex items-center gap-2 " + STATUS_STYLE[result.status].color}>
              <StatusIcon className="size-5" />
              <span className="text-sm font-semibold">{STATUS_STYLE[result.status].label}</span>
            </div>
          )}
        </div>
        {pending && (
          <p className="flex items-center gap-2 text-xs text-slate">
            <Loader2 className="size-3.5 animate-spin" /> Memeriksa kepatuhan...
          </p>
        )}
        {error && <p className="text-xs text-risky">{error}</p>}
      </Card>

      {result && !pending && (
        <>
          <Card className="space-y-2 p-4">
            <p className="text-sm text-ink">{result.summary}</p>
          </Card>

          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-medium text-ink">Temuan pemeriksaan</h3>
            {result.findings.map((f, i) => (
              <div key={i} className={"rounded-lg border px-3 py-2 text-xs " + FINDING_STYLE[f.level]}>
                <span className="font-medium">{f.rule}: </span>
                {f.message}
              </div>
            ))}
          </Card>

          {result.dpsChecklist.length > 0 && (
            <Card className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-ink">Konfirmasi DPS (simulasi)</h3>
                {confirmed && (
                  <span className="flex items-center gap-1 text-xs text-feasible">
                    <Check className="size-3.5" /> Semua terkonfirmasi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate">
                Centang item yang sudah dikonfirmasi Dewan Pengawas Syariah.
                Simulasi - bukan pengganti fatwa resmi.
              </p>
              <div className="space-y-2">
                {checklist.map((c) => (
                  <label key={c.id} className="flex items-start gap-2 text-sm text-ink">
                    <Checkbox checked={c.checked} onCheckedChange={() => toggle(c.id)} />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
              <Button type="button" size="sm" onClick={save} disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Simpan konfirmasi DPS
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
