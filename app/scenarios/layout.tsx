import { AppShell } from "@/components/app-shell";

export default function ScenariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
