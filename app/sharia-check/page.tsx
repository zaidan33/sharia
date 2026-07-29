import { redirect } from "next/navigation";
import { getSessionUserId, listScenariosForUser } from "@/lib/queries";
import { JENIS_AKAD_LABEL } from "@/lib/constants";
import { ShariaCheckPanel } from "@/components/scenario/sharia-check-panel";

export default async function ShariaCheckPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const scenarios = (await listScenariosForUser(userId)).map((s) => ({
    id: s.id,
    nama: s.nama,
    skemaLabel:
      s.jenisSkema === "konvensional"
        ? "Konvensional"
        : s.jenisAkad
          ? JENIS_AKAD_LABEL[s.jenisAkad]
          : "Syariah",
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Cek kepatuhan syariah
        </h1>
        <p className="text-sm text-slate">
          Pemeriksaan rule-based atas struktur pembiayaan: kesesuaian akad &amp;
          basis, deteksi riba (EAR &gt; 20%), dan checklist konfirmasi Dewan
          Pengawas Syariah. Simulasi - bukan fatwa resmi.
        </p>
      </div>
      <ShariaCheckPanel scenarios={scenarios} />
    </div>
  );
}
