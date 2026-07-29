import { AppShell } from "@/components/app-shell";

export default function ShariaCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
