import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scale, Calculator, Activity, ShieldCheck, FileText, Bot } from "lucide-react";

const METODOLOGI = [
  {
    icon: Scale,
    title: "Normalisasi ke Effective Annual Rate",
    body: "Setiap kuotasi (flat, efektif, anuitas) dinormalisasi ke EAR dari jadwal pembayaran aktual, sehingga perbandingan antar-skema menjadi apple-to-apple.",
  },
  {
    icon: Calculator,
    title: "Valuasi atas arus kas inkremental",
    body: "NPV dan IRR dihitung atas arus kas tambahan akibat pembiayaan, bukan arus kas seluruh usaha. Memakai arus kas seluruh usaha menghasilkan IRR di atas 100% yang menyesatkan.",
  },
  {
    icon: Activity,
    title: "Indikator lengkap & kasus batas",
    body: "EAR, DSCR, DER, ROI, break-even point, NPV, IRR. Kasus batas ditangani tanpa NaN: DSCR negatif, IRR tak terdefinisi, BEP di atas omzet.",
  },
];

const ALAT_BANTU = [
  { icon: FileText, title: "Ekstraksi dokumen", body: "Mengurai teks pengajuan dan ringkasan usaha menjadi field skenario yang siap dihitung." },
  { icon: Calculator, title: "Narasi otomatis", body: "Menerjemahkan hasil hitung menjadi ringkasan kelayakan dalam bahasa Indonesia." },
  { icon: Bot, title: "Copilot", body: "Tanya jawab soal perbandingan, risiko, dan rekomendasi skenario." },
  { icon: ShieldCheck, title: "Kepatuhan syariah", body: "Memeriksa akad, mendeteksi indikasi riba, dan menyusun checklist DPS." },
];

export default function AboutPage() {
  return (
    <main className="bg-brand-gradient min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-lg font-semibold text-deepteal"
          >
            Kelayakan Pembiayaan
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Masuk</Link>
          </Button>
        </nav>
      </div>

      <div className="mx-auto max-w-4xl space-y-12 px-4 pb-20 pt-8">
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-deep">
            Tentang alat
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Kerangka kerja transparan untuk keputusan pembiayaan
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate">
            Alat ini membandingkan kelayakan pembiayaan syariah dan konvensional
            dalam satu kerangka perhitungan yang konsisten. Tujuannya bukan
            memberi skor akhir, melainkan membuat setiap angka dapat ditelusuri
            balik ke rumus dan asumsinya.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-ink">
            Metodologi inti
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {METODOLOGI.map((m) => (
              <Card key={m.title} className="h-full p-5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-deepteal/10 text-deepteal">
                  <m.icon className="size-5" />
                </div>
                <h3 className="mt-3 text-sm font-medium text-ink">{m.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate">
                  {m.body}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-ink">
            Alat bantu analisis
          </h2>
          <p className="text-sm text-slate">
            Empat alat bantu untuk mempercepat analisis - mengurai dokumen
            pengajuan, menyajikan ringkasan naratif, menjawab pertanyaan, dan
            memeriksa kepatuhan syariah.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ALAT_BANTU.map((a) => (
              <Card key={a.title} className="h-full p-4">
                <a.icon className="size-5 text-deepteal" />
                <h3 className="mt-2 text-sm font-medium text-ink">{a.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate">{a.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-base font-semibold text-ink">
            Batasan & disclaimer
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate">
            <li>- Hasil adalah estimasi berbasis model, bukan saran keuangan.</li>
            <li>- Pemeriksaan syariah adalah simulasi, bukan fatwa resmi Dewan Pengawas Syariah.</li>
            <li>- Asumsi (pertumbuhan, inflasi, margin) sangat menentukan hasil; verifikasi dengan data nyata.</li>
            <li>- EAR sebagai pembanding utama; NPV sebagai acuan kelayakan utama.</li>
          </ul>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/dashboard">Buka Dashboard</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
