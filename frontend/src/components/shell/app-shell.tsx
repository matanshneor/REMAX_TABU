"use client";

import { AuthProvider, useAuth } from "@/components/auth-provider";
import { PendingApproval } from "@/components/auth/pending-approval";
import { SignupApprovalGate } from "@/components/admin/signup-approval-gate";
import { isAdmin } from "@/lib/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalSearch } from "./global-search";
import { NotificationsBell } from "./notifications-bell";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen">
        <div className="fixed inset-y-0 start-0 w-64 bg-sidebar" />
        <div className="ms-64 flex-1 p-8">
          <Skeleton className="mb-6 h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // RLS hides all data from unapproved accounts; this just explains why.
  if (profile.status !== "active") return <PendingApproval />;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ms-64 flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-card/90 px-8 backdrop-blur">
          <GlobalSearch />
          <div className="ms-auto flex items-center gap-3">
            <Greeting name={profile.full_name} />
            <span aria-hidden className="h-6 w-px bg-border" />
            <NotificationsBell />
          </div>
        </header>
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
      {isAdmin(profile) && <SignupApprovalGate />}
    </div>
  );
}

function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : hour < 21 ? "ערב טוב" : "לילה טוב";
  return (
    <p className="text-sm font-medium text-muted-foreground" suppressHydrationWarning>
      {hello}, <span className="font-semibold text-foreground">{name.split(" ")[0]}</span> 👋
    </p>
  );
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  if (profile?.role !== "admin") {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="font-semibold">אין לך הרשאה לצפות בעמוד זה</p>
        <p className="mt-1 text-sm text-muted-foreground">העמוד זמין למנהל המשרד בלבד.</p>
      </div>
    );
  }
  return children;
}
