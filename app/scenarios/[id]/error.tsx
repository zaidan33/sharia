"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 p-12 text-center">
      <h2 className="font-display text-xl font-semibold text-ink">
        Gagal memuat skenario
      </h2>
      <p className="max-w-md text-sm text-slate">
        Terjadi kesalahan saat memuat detail skenario. Coba lagi.
      </p>
      <Button onClick={reset}>Coba lagi</Button>
    </div>
  );
}
