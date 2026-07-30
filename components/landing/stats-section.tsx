import { Reveal } from "@/components/landing/reveal";

const STATS = [
  { value: "8", label: "Indikator kelayakan: EAR, DSCR, NPV, IRR, DER, ROI, BEP, dan status" },
  { value: "20", label: "Kasus acuan lintas sektor untuk kalibrasi dan deteksi anomali" },
  { value: "5", label: "Alat bantu: ekstraksi, narasi, copilot, optimasi, cek kepatuhan syariah" },
  { value: "100%", label: "Rumus bisa ditelusuri balik ke asumsi masukannya" },
];

export function StatsSection() {
  return (
    <section className="bg-deepteal">
      <div className="mx-auto max-w-5xl px-4 py-14">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 70}>
              <div>
                <p className="num font-display text-4xl font-bold text-amber">
                  {s.value}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ivory/80">
                  {s.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
