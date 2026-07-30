export function ProblemSection() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Membandingkan syariah dan konvensional itu rumit, dan kerap tidak adil
        </h2>
        <p className="mt-4 text-base leading-relaxed text-slate">
          Margin murabahah dan ujrah ijarah biasanya dikutip flat atas pokok
          awal. Bunga anuitas dan bagi hasil musyarakah bekerja atas saldo yang
          terus menurun. Tanpa satu ukuran yang sama, angka di brosur bisa
          menyesatkan arah keputusan.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm font-medium text-ink">Kuotasi flat</p>
            <p className="mt-1 text-sm text-slate">
              Dihitung atas pokok awal dan tetap sepanjang tenor. Tampak lebih
              kecil, padahal biaya sebenarnya bisa lebih besar dari kesan awal.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm font-medium text-ink">Kuotasi saldo menurun</p>
            <p className="mt-1 text-sm text-slate">
              Dihitung atas sisa utang yang terus mengecil. Angka tahunan yang
              lebih jujur untuk dipakai membandingkan.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
