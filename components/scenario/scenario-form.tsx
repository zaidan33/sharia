"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ZodError } from "zod";
import { useForm, type UseFormRegister } from "react-hook-form";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  scenarioInputSchema,
  type ScenarioInput,
} from "@/lib/validation/scenario-schema";
import { createScenario, updateScenario } from "@/lib/actions/scenario-actions";
import {
  SEKTOR_USAHA,
  PROFIL_RISIKO,
  PROFIL_RISIKO_LABEL,
  JENIS_AKAD,
  JENIS_AKAD_LABEL,
  BASIS_TINGKAT,
  BASIS_TINGKAT_LABEL,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

type FormValues = Record<string, string>;

const STEPS = [
  "Identitas",
  "Struktur pembiayaan",
  "Kondisi usaha",
  "Dampak & valuasi",
];

const STEP_FIELDS: (keyof ScenarioInput)[][] = [
  ["nama", "jenisUsaha", "tujuanPembiayaan", "profilRisiko"],
  [
    "kebutuhanDana",
    "tenorBulan",
    "jenisSkema",
    "jenisAkad",
    "tingkatBiayaTahunan",
    "basisTingkatBiaya",
  ],
  [
    "pendapatanBulananAwal",
    "opexBulananAwal",
    "pertumbuhanPendapatanTahunan",
    "inflasiBiayaTahunan",
    "marginKontribusiPersen",
    "ekuitasAwal",
    "kewajibanLain",
  ],
  ["deltaPendapatanBulanan", "deltaOpexBulanan", "discountRateTahunan", "pertumbuhanTerminalTahunan"],
];

function toInt(s: string | undefined): number {
  if (!s) return NaN;
  const m = String(s).replace(/[^\d-]/g, "");
  return m === "" || m === "-" ? NaN : parseInt(m, 10);
}
function toDec(s: string | undefined): number {
  if (!s) return NaN;
  const m = String(s).trim().replace(/\s/g, "").replace(",", ".");
  return m === "" ? NaN : Number(m);
}

function buildPayload(v: FormValues): ScenarioInput {
  const jenisSkema = v.jenisSkema as ScenarioInput["jenisSkema"];
  return {
    nama: v.nama ?? "",
    jenisUsaha: v.jenisUsaha ?? "",
    tujuanPembiayaan: v.tujuanPembiayaan ?? "",
    profilRisiko: v.profilRisiko as ScenarioInput["profilRisiko"],
    kebutuhanDana: toInt(v.kebutuhanDana),
    tenorBulan: toInt(v.tenorBulan),
    jenisSkema,
    jenisAkad:
      jenisSkema === "konvensional" || !v.jenisAkad
        ? null
        : (v.jenisAkad as ScenarioInput["jenisAkad"]),
    tingkatBiayaTahunan: toDec(v.tingkatBiayaTahunan),
    basisTingkatBiaya: v.basisTingkatBiaya as ScenarioInput["basisTingkatBiaya"],
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
    // V2.3: kosong = nonaktif (null). Dipakai untuk terminal value Gordon.
    pertumbuhanTerminalTahunan: String(v.pertumbuhanTerminalTahunan ?? "").trim()
      ? toDec(v.pertumbuhanTerminalTahunan)
      : null,
  };
}

function flatten(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

function createDefaults(): FormValues {
  return {
    nama: "",
    jenisUsaha: "",
    tujuanPembiayaan: "",
    profilRisiko: "sedang",
    kebutuhanDana: "",
    tenorBulan: "",
    jenisSkema: "syariah",
    jenisAkad: "murabahah",
    tingkatBiayaTahunan: "",
    basisTingkatBiaya: "flat",
    pendapatanBulananAwal: "",
    opexBulananAwal: "",
    pertumbuhanPendapatanTahunan: "5",
    inflasiBiayaTahunan: "4",
    marginKontribusiPersen: "30",
    ekuitasAwal: "",
    kewajibanLain: "0",
    deltaPendapatanBulanan: "",
    deltaOpexBulanan: "",
    discountRateTahunan: "12",
    pertumbuhanTerminalTahunan: "",
  };
}

function initialToDefaults(initial: ScenarioInput): FormValues {
  return {
    nama: initial.nama,
    jenisUsaha: initial.jenisUsaha,
    tujuanPembiayaan: initial.tujuanPembiayaan,
    profilRisiko: initial.profilRisiko,
    kebutuhanDana: String(initial.kebutuhanDana),
    tenorBulan: String(initial.tenorBulan),
    jenisSkema: initial.jenisSkema,
    jenisAkad: initial.jenisAkad ?? "",
    tingkatBiayaTahunan: String(initial.tingkatBiayaTahunan),
    basisTingkatBiaya: initial.basisTingkatBiaya,
    pendapatanBulananAwal: String(initial.pendapatanBulananAwal),
    opexBulananAwal: String(initial.opexBulananAwal),
    pertumbuhanPendapatanTahunan: String(initial.pertumbuhanPendapatanTahunan),
    inflasiBiayaTahunan: String(initial.inflasiBiayaTahunan),
    marginKontribusiPersen: String(initial.marginKontribusiPersen),
    ekuitasAwal: String(initial.ekuitasAwal),
    kewajibanLain: String(initial.kewajibanLain),
    deltaPendapatanBulanan: String(initial.deltaPendapatanBulanan),
    deltaOpexBulanan: String(initial.deltaOpexBulanan),
    discountRateTahunan: String(initial.discountRateTahunan),
    pertumbuhanTerminalTahunan:
      initial.pertumbuhanTerminalTahunan == null
        ? ""
        : String(initial.pertumbuhanTerminalTahunan),
  };
}

export function ScenarioForm({
  mode,
  scenarioId,
  initial,
}: {
  mode: "create" | "edit";
  scenarioId?: number;
  initial?: ScenarioInput;
}) {
  const router = useRouter();
  const form = useForm<FormValues>({
    defaultValues: initial ? initialToDefaults(initial) : createDefaults(),
  });
  const register = form.register;
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const jenisSkema = form.watch("jenisSkema");
  const jenisAkad = form.watch("jenisAkad");
  const err = (name: string) => fieldErrors[name]?.[0];

  const onAkadChange = (value: string) => {
    form.setValue("jenisAkad", value);
    if (value === "murabahah" || value === "ijarah")
      form.setValue("basisTingkatBiaya", "flat");
    else if (value === "musyarakah_mutanaqishah")
      form.setValue("basisTingkatBiaya", "efektif");
  };
  const onSkemaChange = (value: string) => {
    form.setValue("jenisSkema", value);
    if (value === "konvensional") {
      form.setValue("basisTingkatBiaya", "efektif");
    } else if (value === "syariah" && !form.getValues("jenisAkad")) {
      form.setValue("jenisAkad", "murabahah");
      form.setValue("basisTingkatBiaya", "flat");
    }
  };

  const validateAll = () => {
    const payload = buildPayload(form.getValues());
    const parsed = scenarioInputSchema.safeParse(payload);
    return { payload, errors: parsed.success ? {} : flatten(parsed.error) };
  };

  const next = () => {
    const { errors } = validateAll();
    setFieldErrors(errors);
    if (!STEP_FIELDS[step].some((f) => errors[f as string]))
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async () => {
    setSubmitError(null);
    const { payload, errors } = validateAll();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstStep = STEP_FIELDS.findIndex((fs) =>
        fs.some((f) => errors[f as string]),
      );
      if (firstStep >= 0) setStep(firstStep);
      return;
    }
    setSubmitting(true);
    const res =
      mode === "edit" && scenarioId
        ? await updateScenario(scenarioId, payload)
        : await createScenario(payload);
    setSubmitting(false);
    if (!res.ok) {
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      setSubmitError(humanizeError(res.error));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-2 text-xs">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={
                "flex size-6 items-center justify-center rounded-full border text-[11px] font-medium " +
                (i === step
                  ? "border-deepteal bg-deepteal text-ivory"
                  : i < step
                    ? "border-deepteal/40 text-deepteal"
                    : "border-border text-slate")
              }
            >
              {i + 1}
            </span>
            <span className={i === step ? "font-medium text-ink" : "text-slate"}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 h-px w-6 bg-border sm:w-10" aria-hidden />
            )}
          </li>
        ))}
      </ol>

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {step === 0 && (
          <>
            <TextField name="nama" label="Nama skenario" hint="3 - 120 karakter" error={err("nama")} register={register} placeholder="Mis. Warung Kelontong Modern" />
            <SelectField name="jenisUsaha" label="Jenis usaha / sektor" placeholder="Pilih sektor" error={err("jenisUsaha")} value={form.watch("jenisUsaha")} onChange={(v) => form.setValue("jenisUsaha", v)} options={SEKTOR_USAHA.map((s) => ({ value: s, label: s }))} />
            <TextAreaField name="tujuanPembiayaan" label="Tujuan pembiayaan" hint="3 - 200 karakter" error={err("tujuanPembiayaan")} register={register} placeholder="Mis. Modal kerja stok" rows={2} />
            <SelectField name="profilRisiko" label="Profil risiko" error={err("profilRisiko")} value={form.watch("profilRisiko")} onChange={(v) => form.setValue("profilRisiko", v)} options={PROFIL_RISIKO.map((r) => ({ value: r, label: PROFIL_RISIKO_LABEL[r] }))} />
          </>
        )}

        {step === 1 && (
          <>
            <TextField name="kebutuhanDana" label="Kebutuhan dana" hint="Rp1 jt - Rp500 M" error={err("kebutuhanDana")} register={register} inputMode="numeric" placeholder="75000000" />
            <TextField name="tenorBulan" label="Tenor" hint="3 - 240 bulan" error={err("tenorBulan")} register={register} inputMode="numeric" placeholder="18" />
            <SelectField name="jenisSkema" label="Jenis skema" error={err("jenisSkema")} value={jenisSkema} onChange={onSkemaChange} options={[{ value: "syariah", label: "Syariah" }, { value: "konvensional", label: "Konvensional" }]} />
            {jenisSkema === "syariah" && (
              <SelectField name="jenisAkad" label="Jenis akad" error={err("jenisAkad")} value={jenisAkad} onChange={onAkadChange} options={JENIS_AKAD.map((a) => ({ value: a, label: JENIS_AKAD_LABEL[a] }))} />
            )}
            <TextField name="tingkatBiayaTahunan" label="Tingkat biaya tahunan" hint="Kuotasi pemberi dana, 0 - 60%" error={err("tingkatBiayaTahunan")} register={register} inputMode="decimal" placeholder="7" />
            <SelectField name="basisTingkatBiaya" label="Basis kuotasi" hint="Flat = atas pokok awal; efektif = atas saldo menurun. Menentukan normalisasi EAR." error={err("basisTingkatBiaya")} value={form.watch("basisTingkatBiaya")} onChange={(v) => form.setValue("basisTingkatBiaya", v)} options={BASIS_TINGKAT.map((b) => ({ value: b, label: BASIS_TINGKAT_LABEL[b] }))} />
          </>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="pendapatanBulananAwal" label="Pendapatan bulanan awal" error={err("pendapatanBulananAwal")} register={register} inputMode="numeric" placeholder="40000000" />
            <TextField name="opexBulananAwal" label="Opex bulanan awal" error={err("opexBulananAwal")} register={register} inputMode="numeric" placeholder="32000000" />
            <TextField name="pertumbuhanPendapatanTahunan" label="Pertumbuhan pendapatan / tahun" hint="-50% s.d. 100%" error={err("pertumbuhanPendapatanTahunan")} register={register} inputMode="decimal" placeholder="5" />
            <TextField name="inflasiBiayaTahunan" label="Inflasi biaya / tahun" hint="-20% s.d. 50%" error={err("inflasiBiayaTahunan")} register={register} inputMode="decimal" placeholder="4" />
            <TextField name="marginKontribusiPersen" label="Margin kontribusi" hint="1 - 100%" error={err("marginKontribusiPersen")} register={register} inputMode="decimal" placeholder="22" />
            <TextField name="ekuitasAwal" label="Ekuitas awal" error={err("ekuitasAwal")} register={register} inputMode="numeric" placeholder="25000000" />
            <TextField name="kewajibanLain" label="Kewajiban lain (di luar pembiayaan ini)" hint="Boleh 0" error={err("kewajibanLain")} register={register} inputMode="numeric" placeholder="0" />
          </div>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-slate">
              Apa yang berubah <strong>karena</strong> pembiayaan ini? Dua nilai
              ini menjadi dasar NPV/IRR atas arus kas inkremental.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="deltaPendapatanBulanan" label="Tambahan pendapatan bulanan" error={err("deltaPendapatanBulanan")} register={register} inputMode="numeric" placeholder="7000000" />
              <TextField name="deltaOpexBulanan" label="Tambahan opex bulanan" hint="Harus lebih kecil dari tambahan pendapatan" error={err("deltaOpexBulanan")} register={register} inputMode="numeric" placeholder="2000000" />
              <TextField name="discountRateTahunan" label="Discount rate / tahun" hint="0 - 40%, bawaan 12%" error={err("discountRateTahunan")} register={register} inputMode="decimal" placeholder="12" />
              <TextField name="pertumbuhanTerminalTahunan" label="Pertumbuhan terminal / tahun (opsional)" hint="Kosongkan untuk menonaktifkan. Nilai residu Gordon: g < discount rate" error={err("pertumbuhanTerminalTahunan")} register={register} inputMode="decimal" placeholder="3" />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={back} disabled={step === 0}>
          <ChevronLeft className="size-4" /> Kembali
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Lanjut <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button type="button" onClick={onSubmit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {mode === "edit" ? "Simpan perubahan" : "Hitung kelayakan"}
          </Button>
        )}
      </div>
    </div>
  );
}

function humanizeError(error: string): string {
  switch (error) {
    case "UNAUTHORIZED":
      return "Sesi berakhir. Silakan masuk kembali.";
    case "NOT_FOUND":
      return "Skenario tidak ditemukan.";
    default:
      return "Terjadi kesalahan. Periksa kembali isian Anda.";
  }
}

function LabelRow({ name, label }: { name: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
      </Label>
    </div>
  );
}

function ErrorHint({
  name,
  hint,
  error,
}: {
  name: string;
  hint?: string;
  error?: string;
}) {
  if (error)
    return (
      <p id={`${name}-error`} className="text-xs text-risky">
        {error}
      </p>
    );
  if (hint) return <p className="text-xs text-slate">{hint}</p>;
  return null;
}

function TextField({
  name,
  label,
  hint,
  error,
  register,
  ...props
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  register: UseFormRegister<FormValues>;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <LabelRow name={name} label={label} />
      <Input
        id={name}
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={error ? true : undefined}
        {...register(name)}
        {...props}
      />
      <ErrorHint name={name} hint={hint} error={error} />
    </div>
  );
}

function TextAreaField({
  name,
  label,
  hint,
  error,
  register,
  ...props
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  register: UseFormRegister<FormValues>;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-1.5">
      <LabelRow name={name} label={label} />
      <Textarea
        id={name}
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={error ? true : undefined}
        {...register(name)}
        {...props}
      />
      <ErrorHint name={name} hint={hint} error={error} />
    </div>
  );
}

function SelectField({
  name,
  label,
  hint,
  error,
  value,
  onChange,
  options,
  placeholder,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <LabelRow name={name} label={label} />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={name}
          className="w-full"
          aria-describedby={error ? `${name}-error` : undefined}
          aria-invalid={error ? true : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ErrorHint name={name} hint={hint} error={error} />
    </div>
  );
}
