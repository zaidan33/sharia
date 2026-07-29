const STEPS = [
  {
    n: "1",
    title: "Isi asumsi",
    body: "Kebutuhan dana, tenor, skema, kondisi usaha, dan dampak yang diharapkan dari pembiayaan.",
  },
  {
    n: "2",
    title: "Engine menghitung",
    body: "Jadwal pembiayaan, biaya efektif, arus kas, DSCR, DER, ROI, BEP, NPV, dan IRR.",
  },
  {
    n: "3",
    title: "Lihat hasil transparan",
    body: "Setiap angka membuka rumus dan nilai masukannya. Anda memeriksa, bukan sekadar mempercayai.",
  },
];

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="border-b border-border bg-ivory">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Cara kerja
        </h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-lg border border-border bg-card p-5">
              <span className="num flex size-9 items-center justify-center rounded-full bg-deepteal text-sm font-semibold text-ivory">
                {s.n}
              </span>
              <h3 className="mt-4 font-medium text-ink">{s.title}</h3>
              <p className="mt-1 text-sm text-slate">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
