"use client";

/**
 * Penampil + tombol unduh PDF (V6.5). Dimuat dinamis ssr:false dari report-client
 * karena @react-pdf/renderer hanya berjalan di peramban.
 */
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import { ReportDocument } from "./report-document";
import type { ReportData } from "@/lib/report/build-report-data";

export default function PdfView({ data }: { data: ReportData }) {
  const fileName = `laporan-kelayakan-${data.nama.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  return (
    <div className="space-y-3">
      <div>
        <PDFDownloadLink
          document={<ReportDocument data={data} />}
          fileName={fileName}
          className="inline-flex items-center gap-2 rounded-md bg-deepteal px-4 py-2 text-sm font-medium text-ivory transition-opacity hover:opacity-90"
        >
          {({ loading }: { loading: boolean }) =>
            loading ? "Menyiapkan dokumen..." : (
              <>
                <Download className="size-4" /> Unduh PDF
              </>
            )
          }
        </PDFDownloadLink>
      </div>

      <PDFViewer
        showToolbar
        style={{ width: "100%", height: "78vh", border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem" }}
      >
        <ReportDocument data={data} />
      </PDFViewer>
      <p className="text-xs text-slate">
        Dokumen disusun di peramban Anda. Gunakan tombol unduh, atau ikon cetak
        dan simpan pada penampil di atas. Ringkasan naratifnya menyusun ulang
        hasil hitung ke dalam kalimat yang mudah dibaca.
      </p>
    </div>
  );
}
