"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { ACTIVE_BUYER_STATUSES } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";

/** Small counters for the sidebar. All are RLS-scoped to what the user can see. */
export function useNavCounts() {
  const { profile } = useAuth();
  const supabase = createClient();

  const buyers = useQuery({
    queryKey: ["buyers", "count", "active"],
    queryFn: async () => {
      // Same "active" as the buyers page: still being worked on.
      const { count, error } = await supabase
        .from("buyers")
        .select("id", { count: "exact", head: true })
        .in("status", ACTIVE_BUYER_STATUSES);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const properties = useQuery({
    queryKey: ["properties", "count", "active"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const tasks = useQuery({
    queryKey: ["tasks", "count", "open"],
    enabled: !!profile,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", profile!.id)
        .eq("is_done", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Sign-ups waiting for the admin; only admins can see other people's pending profiles.
  const pending = useQuery({
    queryKey: ["profiles", "count", "pending"],
    enabled: profile?.role === "admin",
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });

  return {
    "/buyers": buyers.data,
    "/properties": properties.data,
    "/tasks": tasks.data,
    "/agents": pending.data,
  } as Record<string, number | undefined>;
}
