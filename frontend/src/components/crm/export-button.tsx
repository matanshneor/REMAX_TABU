"use client";

import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";

/** Admin-only CSV export through the backend (export can't be blocked in SQL). */
export function ExportButton({ entity }: { entity: string }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!isAdmin(profile)) return null;

  async function run() {
    setBusy(true);
    try {
      const { data } = await createClient().auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/export/${entity}`, {
        headers: { Authorization: `Bearer ${data.session?.access_token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? res.statusText);
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: `${entity}.csv` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(`הייצוא נכשל: ${(e as Error).message}. ודא ששרת ה-backend פועל.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={run} disabled={busy}>
      <DownloadIcon />
      ייצוא
    </Button>
  );
}
