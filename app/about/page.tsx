import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scale, Calculator, Activity, ShieldCheck, FileText, Bot } from "lucide-react";

const METODOLOGI = [
  {
    icon: Scale,
    title: "Normalisasi ke Effective Annual Rate",
    body: "Margin murabahah, ujrah ijarah, bunga anuitas, dan bagi hasil punya cara hitung yang berbeda. Kami menormalisasinya ke satu Effective Annual Rate dari jadwal pembayaran yang sebenarnya, agar bisa dibandingkan apa adanya.",
  },
  {
    icon: Calculator,
    title: "Valuasi atas arus kas tambahan",
    body: "Yang dihitung adalah tambahan arus kas akibat pembiayaan, bukan seluruh arus kas usaha. Memakai seluruh arus kas usaha bisa menghasilkan IRR di atas 100% yang menyesatkan, jadi kami menghindarinya.",
  },
  {
    icon: Activity,
    title: "Indikator lengkap, kasus batas tertangani",
    body: "EAR, DSCR, DER, ROI, break-even point, NPV, dan IRR - semuanya ada. Kasus seperti DSCR negatif atau IRR tak terdefinisi ditampilkan apa adanya, tanpa angka aneh.",
  },
];

const ALAT_BANTU = [
  { icon: FileText, title: "Ekstraksi dokumen", body: "Tempel teks pengajuan atau ringkasan usaha; alat ini menyarikan fieldnya dan mengisi form untuk Anda." },
  { icon: Calculator, title: "Narasi otomatis", body: "Hasil hitung diterjemahkan jadi ringkasan kelayakan dalam bahasa Indonesia yang enak dibaca dan bisa dibagikan." },
  { icon: Bot, title: "Copilot", body: "Tanyakan apa saja soal skenario - mana lebih murah, mana lebih berisiko, mana yang layak - dan dapatkan jawaban dari datanya." },
  { icon: ShieldCheck, title: "Kepatuhan syariah", body: "Memeriksa kesesuaian akad dan basis perhitungan, menandai indikasi riba, serta menyusun checklist konfirmasi Dewan Pengawas Syariah." },
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
            Tentang alat ini
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Membandingkan pembiayaan secara jujur, bukan menjual skor
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate">
            Pembiayaan syariah dan konvensional sering ditawarkan dengan angka
            yang susunannya berbeda - margin flat di satu sisi, bunga anuitas di
            sisi lain. Alat ini meletakkan keduanya di atas meja yang sama,
            menghitungnya dengan cara yang konsisten, lalu memperlihatkan dari
            mana setiap angka berasal. Bukan untuk menggantikan pertimbangan
            Anda, melainkan agar pertimbangan itu berpijak pada angka yang adil.
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
            Empat alat bantu yang menyingkat pekerjaan yang biasanya menyita
            waktu - membaca dokumen pengajuan, menyusun ringkasan, menjawab
            pertanyaan, hingga memeriksa kepatuhan syariah.
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
            Yang perlu diingat
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate">
            <li>- Hasilnya estimasi berbasis model, bukan saran keuangan. Tetap pegang pertimbangan sendiri.</li>
            <li>- Pemeriksaan syariah di sini bantuan analisis, bukan fatwa resmi Dewan Pengawas Syariah.</li>
            <li>- Asumsi seperti pertumbuhan, inflasi, dan margin sangat menentukan hasil. Pakai data nyata usaha Anda.</li>
            <li>- Pakai EAR untuk membandingkan antar-skema, dan NPV sebagai acuan utama kelayakan.</li>
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
