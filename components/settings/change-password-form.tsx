"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { changePassword } from "@/lib/auth-client";
import { Check, Loader2 } from "lucide-react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (newPassword.length < 8) {
      setError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setLoading(true);
    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (res.error) {
        setError("Kata sandi saat ini salah atau permintaan ditolak.");
      } else {
        setDone(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirm("");
      }
    } catch {
      setError("Terjadi kesalahan. Coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {done && (
        <p className="flex items-center gap-2 text-sm text-feasible">
          <Check className="size-4" /> Kata sandi berhasil diubah.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="current">Kata sandi saat ini</Label>
        <Input
          id="current"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          disabled={loading}
          autoComplete="current-password"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new">Kata sandi baru</Label>
          <Input
            id="new"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Konfirmasi kata sandi baru</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
          />
        </div>
      </div>
      <p className="text-xs text-slate">Minimal 8 karakter.</p>
      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Ubah kata sandi
      </Button>
    </form>
  );
}
