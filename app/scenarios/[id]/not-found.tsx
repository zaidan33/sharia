import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 p-12 text-center">
      <h2 className="font-display text-xl font-semibold text-ink">
        Skenario tidak ditemukan
      </h2>
      <p className="max-w-md text-sm text-slate">
        Skenario ini tidak ada atau bukan milik Anda.
      </p>
      <Button asChild>
        <Link href="/dashboard">Kembali ke dashboard</Link>
      </Button>
    </div>
  );
}
