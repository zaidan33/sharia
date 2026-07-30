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
          Kami memeriksa struktur pembiayaan dari sisi syariah: kesesuaian akad
          dan basis perhitungan, penandaan indikasi riba saat EAR di atas 20%,
          serta checklist untuk konfirmasi Dewan Pengawas Syariah. Ini bantuan
          analisis, bukan fatwa resmi.
        </p>
      </div>
      <ShariaCheckPanel scenarios={scenarios} />
    </div>
  );
}
