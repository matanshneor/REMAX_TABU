"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

const KEY = ["notifications"];

export function NotificationsBell() {
  const { profile } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const uid = profile?.id;

  const { data = [] } = useQuery({
    queryKey: KEY,
    enabled: !!uid,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await createClient()
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  // Realtime: new notifications show up immediately.
  useEffect(() => {
    if (!uid) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${uid}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: KEY });
          toast((payload.new as Notification).title);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, qc]);

  const unread = data.filter((n) => !n.is_read).length;

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    await createClient().from("notifications").update({ is_read: true }).in("id", ids);
    qc.invalidateQueries({ queryKey: KEY });
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label="התראות" />}>
        <BellIcon className="size-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] leading-4.5 font-bold text-white tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="font-semibold">התראות</p>
          {unread > 0 && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => markRead(data.filter((n) => !n.is_read).map((n) => n.id))}
            >
              סמן הכל כנקרא
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {data.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">אין התראות</p>
          ) : (
            data.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markRead(n.is_read ? [] : [n.id]);
                  if (n.link) router.push(n.link);
                }}
                className={cn("flex w-full gap-3 border-b px-4 py-3 text-start last:border-0 hover:bg-muted/60", !n.is_read && "bg-primary/[0.04]")}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.is_read ? "bg-transparent" : "bg-primary")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{n.title}</span>
                  {n.body && <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>}
                  <span className="mt-1 block text-[11px] text-muted-foreground/80">{formatRelative(n.created_at)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
