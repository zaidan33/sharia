"use client";

/**
 * Pembungkus klien untuk penampil PDF (V6.5). Memuat komponen react-pdf secara
 * dinamis dengan ssr:false agar Next tidak mencoba merendernya di server.
 */
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { ReportData } from "@/lib/report/build-report-data";

const PdfView = dynamic(() => import("./pdf-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[78vh] items-center justify-center rounded-lg border border-border text-sm text-slate">
      <Loader2 className="mr-2 size-4 animate-spin" /> Menyiapkan penampil dokumen...
    </div>
  ),
});

export function ReportClient({ data }: { data: ReportData }) {
  return <PdfView data={data} />;
}
