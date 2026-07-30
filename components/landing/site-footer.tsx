import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-ivory">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <span className="font-display text-base font-semibold text-deepteal">
            Kelayakan Pembiayaan
          </span>
          <p className="max-w-xs text-xs leading-relaxed text-slate">
            Tempat menghitung dan membandingkan kelayakan pembiayaan syariah dan
            konvensional secara transparan.
          </p>
        </div>

        <FooterCol
          title="Produk"
          links={[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/compare", label: "Bandingkan skenario" },
            { href: "/optimize", label: "Optimizer struktur" },
          ]}
        />
        <FooterCol
          title="Alat Bantu"
          links={[
            { href: "/copilot", label: "Copilot" },
            { href: "/sharia-check", label: "Cek kepatuhan syariah" },
          ]}
        />
        <FooterCol
          title="Lainnya"
          links={[
            { href: "/about", label: "Tentang alat" },
            { href: "/dashboard", label: "Masuk" },
          ]}
        />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <p className="text-xs text-slate">
            Hasilnya estimasi berbasis model, bukan saran keuangan atau fatwa
            resmi. Periksa asumsinya sebelum memutuskan.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink">
        {title}
      </p>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              className="text-sm text-slate transition-colors hover:text-deepteal"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
