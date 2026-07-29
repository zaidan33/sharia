"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ExtractedScenario } from "@/lib/extract";

/**
 * Panel impor dokumen (V4.2). Tempel teks pengajuan/usaha, ekstrak field via
 * /api/extract (regex), hasil men-prefill form. Hanya menimpa field yang
 * berhasil diekstrak.
 */
export function ImportPanel({
  onExtracted,
}: {
  onExtracted: (e: ExtractedScenario) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<number | null>(null);

  const run = () => {
    setError(null);
    setFound(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (res.status === 401) {
          setError("Sesi berakhir. Muat ulang halaman dan masuk kembali.");
          return;
        }
        if (!res.ok) {
          setError("Gagal mengekstrak teks.");
          return;
        }
        const data = (await res.json()) as { fields: ExtractedScenario };
        const count = Object.keys(data.fields ?? {}).length;
        if (count === 0) {
          setError("Tidak ada field yang dikenali. Perjelas kata kunci (plafon, tenor, dll).");
          return;
        }
        onExtracted(data.fields);
        setFound(count);
      } catch {
        setError("Gagal menghubungi server.");
      }
    });
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <FileText className="size-4 text-deepteal" />
          Impor dari teks dokumen
        </span>
        {open ? <ChevronUp className="size-4 text-slate" /> : <ChevronDown className="size-4 text-slate" />}
      </button>
      {open && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          <p className="text-xs text-slate">
            Tempel ringkasan pengajuan/usaha (mis.{' '}
            <span className="font-mono">Plafon 75 juta, tenor 18 bulan, murabahah, marja 7%</span>
            ). Field yang dikenali akan mengisi form - Anda tetap bisa
            mengubahnya.
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Tempel teks di sini..."
          />
          <div className="flex items-center gap-3">
            <Button type="button" size="sm" onClick={run} disabled={pending || !text.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              Ekstrak &amp; isi form
            </Button>
            {found !== null && (
              <span className="text-xs text-feasible">{found} field terdeteksi &amp; diisi.</span>
            )}
            {error && <span className="text-xs text-risky">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
