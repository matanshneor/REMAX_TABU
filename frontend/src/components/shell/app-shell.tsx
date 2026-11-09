"use client";

import { AuthProvider, useAuth } from "@/components/auth-provider";
import { PendingApproval } from "@/components/auth/pending-approval";
import { SignupApprovalGate } from "@/components/admin/signup-approval-gate";
import { isAdmin } from "@/lib/permissions";
import { CircleHelpIcon, MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalSearch } from "./global-search";
import { HoverLabel } from "./hover-label";
import { NotificationsBell } from "./notifications-bell";
import { Sidebar, SidebarContent } from "./sidebar";

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
        <div className="fixed inset-y-0 start-0 hidden w-64 bg-sidebar lg:block" />
        <div className="flex-1 p-4 lg:ms-64 lg:p-8">
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
      <div className="flex min-h-screen flex-col lg:ms-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-card/90 px-3 backdrop-blur sm:gap-4 lg:px-8">
          <MobileNav />
          <GlobalSearch />
          <div className="ms-auto flex items-center gap-3">
            <Greeting name={profile.full_name} />
            <span aria-hidden className="hidden h-6 w-px bg-border md:block" />
            <HoverLabel label="מדריך">
              <Button variant="ghost" size="icon" aria-label="מדריך" render={<Link href="/help" />} nativeButton={false}>
                <CircleHelpIcon className="size-5" />
              </Button>
            </HoverLabel>
            <HoverLabel label="התראות">
              <NotificationsBell />
            </HoverLabel>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-6">{children}</main>
      </div>
      {isAdmin(profile) && <SignupApprovalGate />}
    </div>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label="תפריט" onClick={() => setOpen(true)}>
        <MenuIcon className="size-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="border-0 bg-sidebar p-0 text-sidebar-foreground data-[side=right]:w-72 data-[side=right]:max-w-[85vw]"
        >
          <SheetTitle className="sr-only">תפריט</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : hour < 21 ? "ערב טוב" : "לילה טוב";
  return (
    <p className="hidden text-sm font-medium text-muted-foreground md:block" suppressHydrationWarning>
      {hello}, <span className="font-semibold text-foreground">{name.split(" ")[0]}</span>
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
