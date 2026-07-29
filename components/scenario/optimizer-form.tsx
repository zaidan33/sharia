"use client";

import { useState, useTransition } from "react";
import { Loader2, Trophy } from "lucide-react";
import { optimizeStructure } from "@/lib/actions/optimizer-actions";
import type { CandidateStructure } from "@/lib/engine/optimizer";
import {
  PROFIL_RISIKO,
  PROFIL_RISIKO_LABEL,
  JENIS_AKAD_LABEL,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/scenario/status-badge";
import { formatPersen, formatRasio, formatRupiahCompact } from "@/lib/format";

type Values = Record<string, string>;

const DEFAULTS: Values = {
  kebutuhanDana: "75000000",
  pendapatanBulananAwal: "40000000",
  opexBulananAwal: "32000000",
  pertumbuhanPendapatanTahunan: "5",
  inflasiBiayaTahunan: "4",
  marginKontribusiPersen: "22",
  ekuitasAwal: "25000000",
  kewajibanLain: "0",
  deltaPendapatanBulanan: "7000000",
  deltaOpexBulanan: "2000000",
  discountRateTahunan: "12",
  profilRisiko: "sedang",
  tenorMin: "12",
  tenorMax: "48",
  tenorStep: "6",
  tingkatBiayaSyariah: "7",
  tingkatBiayaKonvensional: "11",
};

function toInt(s: string): number {
  const m = String(s).replace(/[^\d-]/g, "");
  return m === "" || m === "-" ? NaN : parseInt(m, 10);
}
function toDec(s: string): number {
  const m = String(s).trim().replace(/\s/g, "").replace(",", ".");
  return m === "" ? NaN : Number(m);
}

function buildPayload(v: Values) {
  return {
    pendapatanBulananAwal: toInt(v.pendapatanBulananAwal),
    opexBulananAwal: toInt(v.opexBulananAwal),
    pertumbuhanPendapatanTahunan: toDec(v.pertumbuhanPendapatanTahunan),
    inflasiBiayaTahunan: toDec(v.inflasiBiayaTahunan),
    marginKontribusiPersen: toDec(v.marginKontribusiPersen),
    ekuitasAwal: toInt(v.ekuitasAwal),
    kewajibanLain: toInt(v.kewajibanLain),
    deltaPendapatanBulanan: toInt(v.deltaPendapatanBulanan),
    deltaOpexBulanan: toInt(v.deltaOpexBulanan),
    discountRateTahunan: toDec(v.discountRateTahunan),
    kebutuhanDana: toInt(v.kebutuhanDana),
    profilRisiko: v.profilRisiko as "rendah" | "sedang" | "tinggi",
    tenorMin: toInt(v.tenorMin),
    tenorMax: toInt(v.tenorMax),
    tenorStep: toInt(v.tenorStep),
    tingkatBiayaSyariah: toDec(v.tingkatBiayaSyariah),
    tingkatBiayaKonvensional: toDec(v.tingkatBiayaKonvensional),
  };
}

export function OptimizerForm() {
  const [values, setValues] = useState<Values>(DEFAULTS);
  const [result, setResult] = useState<CandidateStructure[] | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (name: string, val: string) => {
    setValues((v) => ({ ...v, [name]: val }));
    setFieldErrors((e) => {
      if (!e[name]) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
  };

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await optimizeStructure(buildPayload(values));
      if (res.ok) {
        setResult(res.data);
        setFieldErrors({});
      } else {
        setResult(null);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setError(res.error === "UNAUTHORIZED" ? "Sesi berakhir. Masuk kembali." : "Periksa kembali isian Anda.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-4">
        <div>
          <h2 className="text-sm font-medium text-ink">Kondisi usaha &amp; kebutuhan dana</h2>
          <p className="text-xs text-slate">
            Struktur (skema, akad, tenor) dijelajahi otomatis. Metrik dinilai
            dengan skor tertimbang (DSCR 0,4 / NPV 0,3 / EAR rendah 0,2 / IRR 0,1),
            dinormalisasi ke [0,1].
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumField name="kebutuhanDana" label="Kebutuhan dana" values={values} set={set} errors={fieldErrors} inputMode="numeric" />
          <NumField name="pendapatanBulananAwal" label="Pendapatan bulanan awal" values={values} set={set} errors={fieldErrors} inputMode="numeric" />
          <NumField name="opexBulananAwal" label="Opex bulanan awal" values={values} set={set} errors={fieldErrors} inputMode="numeric" />
          <NumField name="pertumbuhanPendapatanTahunan" label="Pertumbuhan pendapatan/thn (%)" values={values} set={set} errors={fieldErrors} inputMode="decimal" />
          <NumField name="inflasiBiayaTahunan" label="Inflasi biaya/thn (%)" values={values} set={set} errors={fieldErrors} inputMode="decimal" />
          <NumField name="marginKontribusiPersen" label="Margin kontribusi (%)" values={values} set={set} errors={fieldErrors} inputMode="decimal" />
          <NumField name="ekuitasAwal" label="Ekuitas awal" values={values} set={set} errors={fieldErrors} inputMode="numeric" />
          <NumField name="kewajibanLain" label="Kewajiban lain" values={values} set={set} errors={fieldErrors} inputMode="numeric" />
          <NumField name="deltaPendapatanBulanan" label="Tambahan pendapatan/bulan" values={values} set={set} errors={fieldErrors} inputMode="numeric" />
          <NumField name="deltaOpexBulanan" label="Tambahan opex/bulan" values={values} set={set} errors={fieldErrors} inputMode="numeric" />
          <NumField name="discountRateTahunan" label="Discount rate/thn (%)" values={values} set={set} errors={fieldErrors} inputMode="decimal" />
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-ink">Profil risiko</Label>
            <Select value={values.profilRisiko} onValueChange={(v) => set("profilRisiko", v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROFIL_RISIKO.map((r) => (
                  <SelectItem key={r} value={r}>{PROFIL_RISIKO_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-ink">Ruang eksplorasi</h3>
          <p className="mb-2 text-xs text-slate">Rentang tenor &amp; asumsi kuotasi tingkat biaya per skema.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <NumField name="tenorMin" label="Tenor min (bulan)" values={values} set={set} errors={fieldErrors} inputMode="numeric" />
            <NumField name="tenorMax" label="Tenor max (bulan)" values={values} set={set} errors={fieldErrors} inputMode="numeric" />
            <NumField name="tenorStep" label="Step (bulan)" values={values} set={set} errors={fieldErrors} inputMode="numeric" />
            <NumField name="tingkatBiayaSyariah" label="Biaya syariah (%)" values={values} set={set} errors={fieldErrors} inputMode="decimal" />
            <NumField name="tingkatBiayaKonvensional" label="Biaya konvensional (%)" values={values} set={set} errors={fieldErrors} inputMode="decimal" />
          </div>
        </div>

        {error && <p className="text-xs text-risky">{error}</p>}

        <Button onClick={onSubmit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trophy className="size-4" />}
          Cari struktur optimal
        </Button>
      </Card>

      {result && result.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-medium text-ink">5 struktur terbaik</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Skema / akad</TableHead>
                  <TableHead className="text-right">Tenor</TableHead>
                  <TableHead className="text-right">Biaya</TableHead>
                  <TableHead className="text-right">EAR</TableHead>
                  <TableHead className="text-right">NPV</TableHead>
                  <TableHead className="text-right">IRR</TableHead>
                  <TableHead className="text-right">DSCR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Skor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.map((c) => (
                  <TableRow key={`${c.jenisSkema}-${c.jenisAkad}-${c.tenorBulan}`}>
                    <TableCell className="font-medium text-deepteal">{c.peringkat}</TableCell>
                    <TableCell>
                      {c.jenisSkema === "syariah" ? "Syariah" : "Konvensional"}
                      {c.jenisAkad && (
                        <span className="block text-xs text-slate">{JENIS_AKAD_LABEL[c.jenisAkad]}</span>
                      )}
                    </TableCell>
                    <TableCell className="num text-right">{c.tenorBulan} bln</TableCell>
                    <TableCell className="num text-right">{formatPersen(c.tingkatBiayaTahunan, 1)}</TableCell>
                    <TableCell className="num text-right">{c.earPersen === null ? "—" : formatPersen(c.earPersen, 1)}</TableCell>
                    <TableCell className="num text-right">{formatRupiahCompact(c.npv)}</TableCell>
                    <TableCell className="num text-right">{c.irrTahunanPersen === null ? "—" : formatPersen(c.irrTahunanPersen, 1)}</TableCell>
                    <TableCell className="num text-right">{c.dscrRataRata === null ? "—" : formatRasio(c.dscrRataRata)}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="num text-right font-medium">{formatPersen(c.score * 100, 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-slate">
            Skor adalah peringkat relatif pada pool kandidat - bukan absolut.
            EAR = biaya efektif tahunan (satu-satunya angka apples-to-apple antar-skema).
          </p>
        </Card>
      )}
    </div>
  );
}

function NumField({
  name,
  label,
  values,
  set,
  errors,
  ...props
}: {
  name: string;
  label: string;
  values: Values;
  set: (n: string, v: string) => void;
  errors: Record<string, string[]>;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-sm font-medium text-ink">{label}</Label>
      <Input
        id={name}
        value={values[name] ?? ""}
        onChange={(e) => set(name, e.target.value)}
        aria-invalid={errors[name] ? true : undefined}
        {...props}
      />
      {errors[name]?.[0] && <p className="text-xs text-risky">{errors[name][0]}</p>}
    </div>
  );
}
