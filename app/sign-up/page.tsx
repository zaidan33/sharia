import { redirect } from "next/navigation";

// Pendaftaran publik dimatikan (PRD §13) - alihkan ke halaman masuk.
export default function SignUpPage() {
  redirect("/sign-in");
}
