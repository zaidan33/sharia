/**
 * Dokumen PDF Laporan Kelayakan (V6.5) - react-pdf.
 *
 * Komponen pohon <Document> murni-presentasional. Hanya dirender di sisi klien
 * (via PDFViewer/PDFDownloadLink yang di-impor dinamis ssr:false). Semua data
 * sudah datar & siap tampil (ReportData). Grafik digambar manual dengan primitif
 * react-pdf (batang arus kas + tornado sensitivitas) agar bersih & vektor.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReportData, Tone } from "@/lib/report/build-report-data";
import { statusToneOf } from "@/lib/report/build-report-data";
import { formatRupiahCompact } from "@/lib/format";

// Palet PRD §12 (+ tone status).
const C = {
  deepteal: "#0B4F4A",
  amber: "#C1892E",
  ink: "#14201F",
  ivory: "#FAF7EF",
  slate: "#5B6B6A",
  line: "#D9DEDD",
  muted: "#EEF1F0",
  good: "#2E7D32",
  bad: "#B3261E",
};

const TONE: Record<Tone, string> = {
  good: C.good,
  watch: C.amber,
  bad: C.bad,
  neutral: C.slate,
};

const TRACK_W = 300; // lebar trek grafik (pt) - konsisten antar baris.

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.ink,
    backgroundColor: "#FFFFFF",
    lineHeight: 1.45,
  },
  // Header band (halaman 1).
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.deepteal,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 4,
    marginBottom: 18,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: C.amber,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  logoText: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.ivory },
  headerTitle: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.ivory },
  headerSub: { fontSize: 9, color: "#D8E6E4", marginTop: 2 },
  headerRight: { marginLeft: "auto", alignItems: "flex-end" },
  statusBadge: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.ivory,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  metaDate: { fontSize: 8.5, color: "#D8E6E4", marginTop: 4 },

  sectionTitle: {
    fontSize: 11.5,
    fontFamily: "Helvetica-Bold",
    color: C.deepteal,
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  paragraph: { fontSize: 10, marginBottom: 4, textAlign: "justify" },

  // Tabel 2 kolom (profil/struktur).
  kvRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    paddingVertical: 3.5,
  },
  kvLabel: { width: 175, color: C.slate, fontSize: 9.5 },
  kvValue: { flex: 1, fontSize: 9.5, fontFamily: "Helvetica-Bold" },

  // Tabel indikator.
  indHead: { flexDirection: "row", backgroundColor: C.muted, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 3 },
  indRow: { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.line },
  indMetric: { flex: 1.6, fontSize: 9.5 },
  indValue: { flex: 1.1, fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  indStatus: { flex: 1.3, fontSize: 9 },

  // Grafik.
  chartRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  chartLabel: { width: 64, fontSize: 8.5, color: C.slate },
  track: { width: TRACK_W, height: 11, backgroundColor: C.muted, borderRadius: 2, marginRight: 8 },
  barPos: { height: 11, backgroundColor: C.good, borderRadius: 2 },
  barNeg: { height: 11, backgroundColor: C.bad, borderRadius: 2 },
  chartVal: { width: 84, fontSize: 8.5, fontFamily: "Helvetica-Bold" },

  // Tornado.
  torRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  torLabel: { width: 104, fontSize: 8.5, color: C.slate, paddingRight: 6 },
  torTrack: { width: TRACK_W, height: 14, backgroundColor: C.muted, borderRadius: 2, position: "relative", marginRight: 8 },
  torBar: { position: "absolute", top: 0, height: 14, backgroundColor: C.deepteal, borderRadius: 2 },
  torBase: { position: "absolute", top: -1, width: 1.5, height: 16, backgroundColor: C.ink },
  torVal: { width: 84, fontSize: 8 },

  tableHead: { flexDirection: "row", backgroundColor: C.muted, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 3, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.slate },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.line, fontSize: 9 },

  callout: {
    borderLeftWidth: 3,
    borderLeftColor: C.deepteal,
    backgroundColor: C.muted,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 2,
    marginTop: 4,
  },
  caveat: { flexDirection: "row", marginBottom: 3, fontSize: 8.5 },
  caveatTitle: { fontFamily: "Helvetica-Bold", color: C.ink, width: 150 },
  caveatBody: { flex: 1, color: C.slate },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.line,
    paddingTop: 5,
    fontSize: 7.5,
    color: C.slate,
  },
});

function StatusText({ tone, status }: { tone: Tone; status: string }) {
  return <Text style={[styles.indStatus, { color: TONE[tone] }]}>{status}</Text>;
}

function toneWord(tone: Tone): string {
  return tone === "good" ? "Baik" : tone === "watch" ? "Perhatian" : tone === "bad" ? "Lemah" : "Netral";
}

/** Grafik batang horizontal arus kas tahunan (hijau + / merah -). */
function CashflowChart({ data }: { data: ReportData["arusKas"] }) {
  if (data.years.length === 0)
    return <Text style={styles.paragraph}>Tidak ada periode arus kas.</Text>;
  const maxAbs = Math.max(...data.years.map((y) => Math.abs(y.arusKasBersih)), 1);
  return (
    <View>
      {data.years.map((y) => {
        const pct = Math.min(Math.abs(y.arusKasBersih) / maxAbs, 1);
        const pos = y.arusKasBersih >= 0;
        return (
          <View key={y.tahun} style={styles.chartRow} wrap={false}>
            <Text style={styles.chartLabel}>Tahun {y.tahun}</Text>
            <View style={styles.track}>
              <View style={[pos ? styles.barPos : styles.barNeg, { width: pct * TRACK_W }]} />
            </View>
            <Text style={styles.chartVal}>{formatRupiahCompact(y.arusKasBersih)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Tornado chart sensitivitas (rentang low..high, penanda base). */
function TornadoChart({ data }: { data: ReportData["sensitivitas"] }) {
  const { rows, axisMin, axisMax, baseValue } = data;
  if (rows.length === 0)
    return <Text style={styles.paragraph}>Tidak ada data sensitivitas.</Text>;
  const range = Math.max(axisMax - axisMin, 1e-9);
  const x = (v: number) => ((v - axisMin) / range) * TRACK_W;
  return (
    <View>
      {rows.map((r, i) => (
        <View key={i} style={styles.torRow} wrap={false}>
          <Text style={styles.torLabel}>{r.label}</Text>
          <View style={styles.torTrack}>
            <View style={[styles.torBar, { left: x(r.low), width: Math.max(x(r.high) - x(r.low), 1) }]} />
            <View style={[styles.torBase, { left: x(baseValue) }]} />
          </View>
          <Text style={styles.torVal}>{formatRupiahCompact(r.low)} {"–"} {formatRupiahCompact(r.high)}</Text>
        </View>
      ))}
      <Text style={[styles.paragraph, { fontSize: 8, color: C.slate, marginTop: 4 }]}>
        Batang = rentang nilai {data.target} saat parameter diubah +/-10%/-20%; garis hitam = nilai base. Urutan: swing terbesar di atas.
      </Text>
    </View>
  );
}

export function ReportDocument({ data }: { data: ReportData }) {
  return (
    <Document title={`Laporan Kelayakan - ${data.nama}`} author="Lihtr UNAIR">
      <Page size="A4" style={styles.page}>
        {/* Header (halaman 1) */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>L</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Laporan Analisis Kelayakan Pembiayaan</Text>
            <Text style={styles.headerSub}>Lihtr UNAIR - Laboratorium Penilaian Pembiayaan Syariah</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.statusBadge, { backgroundColor: TONE[data.statusTone] }]}>
              {data.status}
            </Text>
            <Text style={styles.metaDate}>{data.tanggal}</Text>
          </View>
        </View>

        {/* 1. Ringkasan eksekutif */}
        <Text style={styles.sectionTitle}>Ringkasan Eksekutif</Text>
        <Text style={styles.paragraph}>{data.ringkasanEksekutif}</Text>

        {/* 2. Profil & 3. Struktur */}
        <Text style={styles.sectionTitle}>Profil Skenario</Text>
        {data.profil.map((r) => (
          <View key={r.label} style={styles.kvRow}>
            <Text style={styles.kvLabel}>{r.label}</Text>
            <Text style={styles.kvValue}>{r.value}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Struktur Pembiayaan</Text>
        {data.struktur.map((r) => (
          <View key={r.label} style={styles.kvRow}>
            <Text style={styles.kvLabel}>{r.label}</Text>
            <Text style={styles.kvValue}>{r.value}</Text>
          </View>
        ))}

        {/* 4. Indikator kelayakan */}
        <Text style={styles.sectionTitle}>Indikator Kelayakan</Text>
        <View style={styles.indHead}>
          <Text style={styles.indMetric}>Metrik</Text>
          <Text style={styles.indValue}>Nilai</Text>
          <Text style={styles.indStatus}>Status</Text>
        </View>
        {data.indikator.map((r) => (
          <View key={r.label} style={styles.indRow} wrap={false}>
            <Text style={styles.indMetric}>{r.label}</Text>
            <Text style={styles.indValue}>{r.value}</Text>
            <StatusText tone={r.tone} status={toneWord(r.tone)} />
          </View>
        ))}

        {/* 5. Arus kas */}
        <Text style={styles.sectionTitle}>Analisis Arus Kas (varian base)</Text>
        <CashflowChart data={data.arusKas} />
        <View style={[styles.kvRow, { marginTop: 6 }]}>
          <Text style={styles.kvLabel}>Total arus kas bersih</Text>
          <Text style={styles.kvValue}>{formatRupiahCompact(data.arusKas.total)}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Angsuran pertama</Text>
          <Text style={styles.kvValue}>{data.arusKas.angsuranPertama}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Total pembayaran ({data.arusKas.tenorBulan} bln)</Text>
          <Text style={styles.kvValue}>{data.arusKas.totalPembayaran}</Text>
        </View>

        {/* 6. Sensitivitas */}
        <Text style={styles.sectionTitle}>Analisis Sensitivitas ({data.sensitivitas.target})</Text>
        <TornadoChart data={data.sensitivitas} />

        {/* 7. Perbandingan */}
        {data.perbandingan && data.perbandingan.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Perbandingan Skenario</Text>
            <View style={styles.tableHead}>
              <Text style={{ flex: 1.6 }}>Skenario</Text>
              <Text style={{ flex: 1 }}>Skema</Text>
              <Text style={{ flex: 1 }}>Status</Text>
              <Text style={{ flex: 1 }}>EAR</Text>
              <Text style={{ flex: 1 }}>DSCR</Text>
              <Text style={{ flex: 1.1 }}>NPV</Text>
            </View>
            {data.perbandingan.map((r) => (
              <View key={r.nama} style={[styles.tableRow, r.current ? { backgroundColor: C.muted } : {}]} wrap={false}>
                <Text style={{ flex: 1.6, fontFamily: r.current ? "Helvetica-Bold" : "Helvetica" }}>{r.nama}{r.current ? " (ini)" : ""}</Text>
                <Text style={{ flex: 1 }}>{r.skema}</Text>
                <Text style={{ flex: 1, color: TONE[statusToneOf(r.status)] }}>{r.status}</Text>
                <Text style={{ flex: 1 }}>{r.ear}</Text>
                <Text style={{ flex: 1 }}>{r.dscr}</Text>
                <Text style={{ flex: 1.1 }}>{r.npv}</Text>
              </View>
            ))}
          </>
        )}

        {/* 8. Simpulan */}
        <Text style={styles.sectionTitle}>Simpulan &amp; Rekomendasi</Text>
        <View style={styles.callout}>
          <Text style={styles.paragraph}>{data.simpulan}</Text>
        </View>

        {/* 9. Disclaimer */}
        <Text style={styles.sectionTitle}>Disclaimer &amp; Batasan Model</Text>
        <Text style={[styles.paragraph, { fontSize: 8.5, color: C.slate, marginBottom: 4 }]}>
          Laporan ini adalah output otomatis dari model deterministik dengan penyederhanaan berikut. Bukan fatwa atau rekomendasi resmi.
        </Text>
        {data.caveats.map((c) => (
          <View key={c.title} style={styles.caveat}>
            <Text style={styles.caveatTitle}>{c.title}</Text>
            <Text style={styles.caveatBody}>{c.body}</Text>
          </View>
        ))}

        {/* Footer tiap halaman */}
        <View style={styles.footer} fixed>
          <Text>Lihtr UNAIR - Laporan Analisis Kelayakan Pembiayaan</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Halaman ${pageNumber} dari ${totalPages}`
            }
          />
          <Text>Simulasi otomatis - bukan fatwa/rekomendasi resmi</Text>
        </View>
      </Page>
    </Document>
  );
}
