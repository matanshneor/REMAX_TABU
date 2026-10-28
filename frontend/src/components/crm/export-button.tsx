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
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: `${entity}.csv` });
      a.click();
      // Safari and Firefox start the download a moment later: keep the file until then.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("הייצוא נכשל. נסו שוב בעוד דקה.");
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
