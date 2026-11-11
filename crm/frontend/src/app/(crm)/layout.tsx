import { AppShell } from "@/components/shell/app-shell";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
