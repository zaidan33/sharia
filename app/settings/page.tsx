import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Pengaturan
        </h1>
        <p className="text-sm text-slate">
          Kelola akun dan keamanan Anda.
        </p>
      </div>

      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Akun</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate">Nama</p>
            <p className="text-sm text-ink">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate">Email</p>
            <p className="text-sm text-ink">{user.email}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-medium text-ink">Ubah kata sandi</h2>
          <p className="text-xs text-slate">
            Gunakan kata sandi yang kuat dan unik.
          </p>
        </div>
        <ChangePasswordForm />
      </Card>

      <Card className="space-y-2 p-5">
        <h2 className="text-sm font-medium text-ink">Preferensi tampilan</h2>
        <p className="text-xs leading-relaxed text-slate">
          Antarmuka menggunakan tema terang (ivory) sesuai pedoman desain. Token
          warna mengikuti palet merek: deep teal, amber, dan ivory.
        </p>
      </Card>
    </div>
  );
}
