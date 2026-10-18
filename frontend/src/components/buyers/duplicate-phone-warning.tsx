"use client";

import { useQuery } from "@tanstack/react-query";
import { TriangleAlertIcon } from "lucide-react";
import { useDeferredValue } from "react";
import { useAuth } from "@/components/auth-provider";
import { useAgentName } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

const digitCount = (s: string) => s.replace(/\D/g, "").length;

/** Warns while typing when another buyer already has this phone number. */
export function DuplicatePhoneWarning({
  phone,
  excludeId,
  onOpen,
}: {
  phone: string;
  excludeId?: string;
  onOpen: (id: string) => void;
}) {
  const { profile } = useAuth();
  const agentName = useAgentName();
  const deferred = useDeferredValue(phone);

  const { data: matches = [] } = useQuery({
    queryKey: ["buyers", "by-phone", deferred, excludeId],
    enabled: digitCount(deferred) >= 9,
    queryFn: async () => {
      const { data, error } = await createClient().rpc("find_buyers_by_phone", {
        p_phone: deferred,
        ...(excludeId ? { p_exclude: excludeId } : {}),
      });
      if (error) throw error;
      // Generated types can't express it, but id/full_name are null for other agents' buyers.
      return data as { id: string | null; full_name: string | null; owner_agent_id: string | null }[];
    },
  });

  if (digitCount(phone) < 9 || matches.length === 0) return null;

  return (
    <div role="alert" className="flex gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">קונה עם מספר הטלפון הזה כבר קיים במערכת</p>
        <ul className="flex flex-col gap-0.5">
          {matches.map((m, i) => (
            <li key={m.id ?? i}>
              {/* id/name are only returned for buyers the user may see (own buyers, or admin) */}
              {m.id ? (
                <button type="button" onClick={() => onOpen(m.id!)} className="font-medium underline underline-offset-2 hover:no-underline">
                  {m.full_name}
                </button>
              ) : (
                <span className="font-medium">קונה של סוכן אחר</span>
              )}
              {" · "}
              {!m.owner_agent_id
                ? "לא משויך לסוכן"
                : m.owner_agent_id === profile?.id
                  ? "מטופל על ידך"
                  : `מטופל ע״י ${agentName(m.owner_agent_id)}`}
            </li>
          ))}
        </ul>
        <p className="text-xs text-amber-800">אם זה אדם אחר עם אותו מספר, אפשר לשמור בכל זאת.</p>
      </div>
    </div>
  );
}
