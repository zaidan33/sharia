import { Card } from "@/components/ui/card";

/**
 * Elemen signature hero - perbandingan sisi-berdampingan biaya efektif
 * syariah vs konvensional, memakai angka nyata dari PRD §2 / §7.1 (Rp100 jt, 24 bln).
 */
export function ComparisonVisual() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-amber/40 bg-amber/[0.06] p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-deep">
            Murabahah
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Kuotasi" value="8% flat" />
            <Row label="Total dibayar" value="Rp116.000.000" />
          </div>
          <div className="mt-4 border-t border-amber/30 pt-3">
            <p className="text-xs text-slate">Biaya efektif (EAR)</p>
            <p className="num text-3xl font-bold text-amber-deep">15,71%</p>
          </div>
        </Card>

        <Card className="border-feasible/40 bg-feasible/[0.06] p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-feasible">
            Anuitas konvensional
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Kuotasi" value="12% efektif" />
            <Row label="Total dibayar" value="Rp112.976.333" />
          </div>
          <div className="mt-4 border-t border-feasible/30 pt-3">
            <p className="text-xs text-slate">Biaya efektif (EAR)</p>
            <p className="num text-3xl font-bold text-feasible">12,68%</p>
          </div>
        </Card>
      </div>
      <p className="text-center text-sm font-medium text-ink">
        Yang terlihat lebih murah belum tentu lebih murah.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate">{label}</span>
      <span className="num font-medium text-ink">{value}</span>
    </div>
  );
}
