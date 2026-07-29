import { Scale, Calculator, Activity, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const FEATURES = [
  {
    icon: Scale,
    title: "Perbandingan adil antar-skema",
    body: "Margin murabahah, ujrah ijarah, bunga anuitas, dan bagi hasil dinormalisasi ke satu Effective Annual Rate dari jadwal pembayaran aktual.",
  },
  {
    icon: Calculator,
    title: "Valuasi transparan",
    body: "NPV dan IRR dihitung atas arus kas inkremental. Setiap angka membuka rumus dan nilai masukannya untuk diaudit, bukan dipercaya begitu saja.",
  },
  {
    icon: Activity,
    title: "Simulasi risiko",
    body: "Analisis sensitivitas, simulasi Monte Carlo, dan deteksi anomali memetakan rentang hasil ketika asumsi berubah.",
  },
  {
    icon: ShieldCheck,
    title: "Kepatuhan syariah",
    body: "Pemeriksaan kesesuaian akad dan basis, deteksi riba, serta checklist konfirmasi Dewan Pengawas Syariah (DPS).",
  },
];

export function FeaturesSection() {
  return (
    <section id="fitur" className="border-b border-border bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            Satu kerangka kerja, analisis menyeluruh
          </h2>
          <p className="mt-3 max-w-2xl text-base text-slate">
            Dari perhitungan dasar hingga alat bantu cerdas - semua dalam satu
            tempat, dengan basis perhitungan yang konsisten.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <div className="shadow-premium h-full rounded-xl border border-border bg-card p-6 transition-transform duration-200 hover:-translate-y-1">
                <div className="flex size-11 items-center justify-center rounded-lg bg-deepteal/10 text-deepteal">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-medium text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
