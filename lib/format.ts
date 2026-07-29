/**
 * Pemformatan tampilan - PRD §12.3: rupiah ringkas di kartu, lengkap di tabel;
 * persen & rasio memakai koma desimal. null/undefined -> "-" (bukan NaN).
 */

/** "Rp1,2 M" / "Rp450 jt" / "Rp75 rb" untuk kartu ringkasan. */
export function formatRupiahCompact(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000)
    return `${sign}Rp${(abs / 1e12).toFixed(1).replace(".", ",")} T`;
  if (abs >= 1_000_000_000)
    return `${sign}Rp${(abs / 1e9).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1e6).toFixed(0)} jt`;
  if (abs >= 1_000) return `${sign}Rp${(abs / 1e3).toFixed(0)} rb`;
  return `${sign}Rp${abs}`;
}

/** "Rp450.000.000" untuk tabel (ribuan dipisah titik, lokal id-ID). */
export function formatRupiah(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return `${v < 0 ? "-" : ""}Rp${Math.abs(v).toLocaleString("id-ID")}`;
}

/** "13,66%" - persen dengan koma desimal. */
export function formatPersen(
  v: number | string | null | undefined,
  digits = 2,
): string {
  if (v === null || v === undefined || v === "") return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "-";
  return `${n.toFixed(digits).replace(".", ",")}%`;
}

/** "1,85" - rasio dengan koma desimal. */
export function formatRasio(
  v: number | string | null | undefined,
  digits = 2,
): string {
  if (v === null || v === undefined || v === "") return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "-";
  return n.toFixed(digits).replace(".", ",");
}
