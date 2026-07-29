import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; className: string }> = {
  LAYAK: {
    label: "Layak",
    className: "border-feasible/30 bg-feasible/10 text-feasible",
  },
  WASPADA: {
    label: "Waspada",
    className: "border-watch/30 bg-watch/10 text-watch",
  },
  TIDAK_LAYAK: {
    label: "Tidak layak",
    className: "border-risky/30 bg-risky/10 text-risky",
  },
};

/** Badge status kelayakan - warna semantik DAN teks (bukan warna saja, PRD §12.3). */
export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const s = STATUS[status] ?? STATUS.WASPADA;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
