"use client";

import { useRef, useState, useTransition } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/scenario/metric-card";
import { CashflowChart } from "@/components/scenario/cashflow-chart";
import { DscrChart } from "@/components/scenario/dscr-chart";
import { CashflowTable } from "@/components/scenario/cashflow-table";
import { TerminalValueCard } from "@/components/scenario/terminal-value-card";
import { recomputeScenario } from "@/lib/actions/scenario-actions";
import type { ScenarioComputation, ScenarioInput, Variant } from "@/lib/engine";
import { formatPersen, formatRasio, formatRupiah, formatRupiahCompact } from "@/lib/format";

type Tone = "default" | "feasible" | "watch" | "risky";

function dscrTone(v: number | null): Tone {
  if (v === null) return "default";
  if (v >= 1.25) return "feasible";
  if (v >= 1.0) return "watch";
  return "risky";
}
function derTone(v: number | null): Tone {
  if (v === null) return "default";
  if (v <= 2) return "feasible";
  if (v <= 3) return "watch";
  return "risky";
}

export function ScenarioResults({
  scenarioId,
  input,
  computation,
}: {
  scenarioId: number;
  input: ScenarioInput;
  computation: ScenarioComputation;
}) {
  const [variant, setVariant] = useState<Variant>("base");
  const [discountRate, setDiscountRate] = useState(input.discountRateTahunan);
  const [liveNpv, setLiveNpv] = useState(computation.varian.base.npv);
  const [liveIrr, setLiveIrr] = useState(computation.varian.base.irr);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSlider = (val: number[]) => {
    const rate = val[0];
    setDiscountRate(rate);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await recomputeScenario(scenarioId, rate);
        if (res.ok) {
          setLiveNpv(res.data.varian.base.npv);
          setLiveIrr(res.data.varian.base.irr);
        }
      });
    }, 250);
  };

  const v = computation.varian[variant];
  const ear = computation.schedule.earPersen;
  const dscrAvg = computation.varian.base.dscrRataRata;
  const dscrMin = computation.varian.base.dscrMinimum;
  const der = computation.der;

  return (
    <div className="space-y-8">
      {/* Kartu metrik */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Biaya efektif (EAR)"
          value={formatPersen(ear)}
          sub={`Kuotasi ${formatPersen(input.tingkatBiayaTahunan, 1)} ${input.basisTingkatBiaya}`}
          formula="EAR = IRR jadwal pembayaran aktual, ditahunkan"
          inputs={`Pokok ${formatRupiah(input.kebutuhanDana)}, ${input.tenorBulan} angsuran, total ${formatRupiah(computation.schedule.totalPembayaran)}. Satu-satunya angka yang boleh dipakai membandingkan antar-skema.`}
        />
        <MetricCard
          label="DSCR rata-rata"
          value={formatRasio(dscrAvg)}
          tone={dscrTone(dscrAvg)}
          formula="DSCR_t = CFADS_t / Debt service_t ; rata-rata seluruh periode (varian base)"
          inputs={`Ambang: aman >= 1,25 ; perlu perhatian 1,00 - 1,24 ; tidak aman < 1,00.`}
        />
        <MetricCard
          label="DSCR minimum"
          value={formatRasio(dscrMin)}
          tone={dscrTone(dscrMin)}
          formula="DSCR terendah sepanjang tenor (varian base)"
          inputs={`Periode dengan rasio paling ketat. ${dscrMin !== null && dscrMin < 1 ? "Ada bulan di mana arus kas usaha tidak menutup angsuran." : ""}`}
        />
        <MetricCard
          label="NPV"
          value={formatRupiah(liveNpv)}
          tone={liveNpv > 0 ? "feasible" : "risky"}
          formula={`NPV = -pokok + Σ ΔCF_t / (1 + r_m)^t , r_m dari discount rate ${formatPersen(discountRate)}`}
          inputs={`Arus kas inkremental varian base, tenor ${input.tenorBulan} bulan. > 0 berarti menambah nilai.`}
        />
        <MetricCard
          label="IRR"
          value={liveIrr.irrTahunanPersen === null ? "—" : formatPersen(liveIrr.irrTahunanPersen)}
          sub={liveIrr.irrTahunanPersen === null ? "Tak terdefinisi" : !liveIrr.unik ? "Tidak unik - pakai NPV" : undefined}
          tone={!liveIrr.unik ? "watch" : "default"}
          formula="IRR bulanan dari [-pokok, ΔCF_1 ... ΔCF_n], lalu ditahunkan"
          inputs={`Dibandingkan dengan discount rate ${formatPersen(discountRate)}.`}
        />
        <MetricCard
          label="DER"
          value={der === null ? "—" : formatRasio(der)}
          tone={derTone(der)}
          formula="DER = (kebutuhanDana + kewajibanLain) / ekuitasAwal"
          inputs={`${formatRupiah(input.kebutuhanDana + input.kewajibanLain)} / ${formatRupiah(input.ekuitasAwal)}. Aman <= 2,0.`}
        />
        <MetricCard
          label="ROI per tahun"
          value={formatPersen(computation.roiTahunanPersen)}
          formula="ROI = (Σ arus kas inkremental - total imbalan) / pokok / (tenor/12)"
          inputs={`Total imbalan ${formatRupiah(computation.schedule.totalImbalan)}, pokok ${formatRupiah(input.kebutuhanDana)}, tenor ${input.tenorBulan} bulan.`}
        />
        <MetricCard
          label="BEP omzet / bulan"
          value={formatRupiahCompact(computation.breakEven.bepRupiah)}
          sub={`${formatPersen(computation.breakEven.persenDariOmzet, 0)} omzet saat ini${computation.breakEven.biayaTetapNegatif ? " (biaya tetap negatif - margin kontribusi mungkin lebih rendah)" : ""}`}
          formula="BEP = (biayaTetap + debt service bulan 1) / margin kontribusi"
          inputs={`Margin kontribusi ${formatPersen(input.marginKontribusiPersen, 0)}, opex ${formatRupiah(input.opexBulananAwal)}.`}
        />
      </div>

      {/* Tab varian */}
      <div className="space-y-4">
        <Tabs value={variant} onValueChange={(val) => setVariant(val as Variant)}>
          <TabsList>
            <TabsTrigger value="base">Base</TabsTrigger>
            <TabsTrigger value="best">Best</TabsTrigger>
            <TabsTrigger value="worst">Worst</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="space-y-2 p-4">
          <h3 className="text-sm font-medium text-ink">Arus kas - varian {variant}</h3>
          <CashflowChart cashflow={v.cashflow} />
        </Card>

        <Card className="space-y-2 p-4">
          <h3 className="text-sm font-medium text-ink">DSCR per periode - varian {variant}</h3>
          <DscrChart cashflow={v.cashflow} dscr={v.dscr} />
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 text-sm font-medium text-ink">
            Tabel arus kas - varian {variant}
          </h3>
          <CashflowTable cashflow={v.cashflow} dscr={v.dscr} />
        </Card>
      </div>

      <TerminalValueCard input={input} computation={computation} />

      {/* Slider discount rate */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-ink">Discount rate</h3>
            <p className="text-xs text-slate">
              Ubah untuk menghitung ulang NPV dan IRR tanpa menyimpan.
            </p>
          </div>
          <span className="num text-lg font-semibold text-deepteal">
            {formatPersen(discountRate, 1)}
            {pending && <span className="ml-2 text-xs text-slate">menghitung...</span>}
          </span>
        </div>
        <Slider
          value={[discountRate]}
          onValueChange={onSlider}
          min={0}
          max={40}
          step={0.5}
        />
      </Card>
    </div>
  );
}
