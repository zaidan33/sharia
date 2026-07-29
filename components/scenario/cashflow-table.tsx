"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { CashflowPeriod } from "@/lib/engine";
import { formatRupiah, formatRasio } from "@/lib/format";

type Dscr = number | null;

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function CashflowTable({
  cashflow,
  dscr,
}: {
  cashflow: CashflowPeriod[];
  dscr: Dscr[];
}) {
  const n = cashflow.length;
  const [yearly, setYearly] = useState(n > 120);

  type Row = {
    label: string;
    pendapatan: number;
    opex: number;
    cfads: number;
    debtService: number;
    arusKasBersih: number;
    dscr: number | null;
  };

  let rows: Row[];
  if (yearly) {
    const groups: Row[] = [];
    for (let start = 0; start < n; start += 12) {
      const slice = cashflow.slice(start, start + 12);
      const dscrSlice = dscr.slice(start, start + 12).filter((x): x is number => x !== null);
      groups.push({
        label: `Tahun ${Math.floor(start / 12) + 1}`,
        pendapatan: slice.reduce((a, p) => a + p.pendapatan, 0),
        opex: slice.reduce((a, p) => a + p.opex, 0),
        cfads: slice.reduce((a, p) => a + p.cfads, 0),
        debtService: slice.reduce((a, p) => a + p.debtService, 0),
        arusKasBersih: slice.reduce((a, p) => a + p.arusKasBersih, 0),
        dscr: avg(dscrSlice),
      });
    }
    rows = groups;
  } else {
    rows = cashflow.map((p, i) => ({
      label: `Bulan ${p.bulan}`,
      pendapatan: p.pendapatan,
      opex: p.opex,
      cfads: p.cfads,
      debtService: p.debtService,
      arusKasBersih: p.arusKasBersih,
      dscr: dscr[i] ?? null,
    }));
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-deepteal"
          onClick={() => setYearly((y) => !y)}
        >
          {yearly ? "Tampilkan bulanan" : "Tampilkan per tahun"}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Periode</TableHead>
              <TableHead className="text-right">Pendapatan</TableHead>
              <TableHead className="text-right">Opex</TableHead>
              <TableHead className="text-right">CFADS</TableHead>
              <TableHead className="text-right">Debt service</TableHead>
              <TableHead className="text-right">DSCR</TableHead>
              <TableHead className="text-right">Arus kas bersih</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell className="font-medium text-ink">{r.label}</TableCell>
                <TableCell className="num text-right">{formatRupiah(r.pendapatan)}</TableCell>
                <TableCell className="num text-right">{formatRupiah(r.opex)}</TableCell>
                <TableCell className="num text-right">{formatRupiah(r.cfads)}</TableCell>
                <TableCell className="num text-right">{formatRupiah(r.debtService)}</TableCell>
                <TableCell className="num text-right">{formatRasio(r.dscr)}</TableCell>
                <TableCell className="num text-right">{formatRupiah(r.arusKasBersih)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
