import { CaveatList } from "@/lib/caveats";

/**
 * Batasan model yang diakui terbuka (PRD §11). Pakai <details> native sehingga
 * bisa dilipat tanpa JavaScript.
 */
export function ModelCaveats() {
  return (
    <details className="group rounded-lg border border-border bg-card p-4">
      <summary className="cursor-pointer list-none text-sm font-medium text-ink marker:hidden">
        Batasan model yang kami akui
        <span className="ml-2 text-xs text-slate">(klik untuk melihat)</span>
      </summary>
      <ul className="mt-3 space-y-2 text-sm text-slate">
        {CaveatList.map((c) => (
          <li key={c.title} className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-deep" />
            <span>
              <strong className="text-ink">{c.title}.</strong> {c.body}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
