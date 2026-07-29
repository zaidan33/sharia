import { AppShell } from "@/components/app-shell";

export default function CopilotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
