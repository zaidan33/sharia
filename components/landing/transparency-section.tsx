export function TransparencySection() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Bukan skor kotak hitam
        </h2>
        <p className="mt-4 text-base leading-relaxed text-slate">
          Setiap hasil menampilkan formula dan asumsi di baliknya, termasuk
          batasan model yang kami akui sendiri. Anda bisa memeriksa, bukan sekadar
          mempercayai.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-slate">
          <li className="flex gap-3">
            <Dot /> Normalisasi ke Effective Annual Rate dari jadwal pembayaran aktual.
          </li>
          <li className="flex gap-3">
            <Dot /> Valuasi atas arus kas inkremental, bukan arus kas seluruh usaha.
          </li>
          <li className="flex gap-3">
            <Dot /> Kasus batas ditangani: DSCR negatif, IRR tak terdefinisi, BEP di atas omzet.
          </li>
        </ul>
      </div>
    </section>
  );
}

function Dot() {
  return <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber" />;
}
