"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";

/** Small counters for the sidebar. All are RLS-scoped to what the user can see. */
export function useNavCounts() {
  const { profile } = useAuth();
  const supabase = createClient();

  const buyers = useQuery({
    queryKey: ["buyers", "count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("buyers").select("id", { count: "exact", head: true });
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

  return {
    "/buyers": buyers.data,
    "/properties": properties.data,
    "/tasks": tasks.data,
  } as Record<string, number | undefined>;
}
