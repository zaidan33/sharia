export function ProblemSection() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Perbandingan syariah vs konvensional jarang apple-to-apple
        </h2>
        <p className="mt-4 text-base leading-relaxed text-slate">
          Margin murabahah dan ujrah ijarah umumnya dikutip flat atas pokok awal,
          sementara bunga anuitas dan bagi hasil musyarakah bekerja atas saldo
          menurun. Tanpa satu ukuran yang sama, angka kuotasi bisa menyesatkan
          arah keputusan.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm font-medium text-ink">Kuotasi flat</p>
            <p className="mt-1 text-sm text-slate">
              Atas pokok awal, tetap sepanjang tenor. Terlihat lebih rendah,
              tetapi biaya sebenarnya bisa lebih tinggi.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm font-medium text-ink">Kuotasi saldo menurun</p>
            <p className="mt-1 text-sm text-slate">
              Atas sisa utang yang mengecil. Angka tahunan yang lebih jujur untuk
              dibandingkan.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
