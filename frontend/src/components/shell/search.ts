"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2Icon, UserIcon, UserPlusIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type SearchResult = { entity: string; id: string; title: string; subtitle: string };

export const ENTITY_META: Record<string, { label: string; href: string; icon: typeof UserIcon }> = {
  buyer: { label: "קונים", href: "/buyers", icon: UserIcon },
  property: { label: "מוכרים", href: "/properties", icon: Building2Icon },
  candidate: { label: "מועמדים", href: "/agents", icon: UserPlusIcon },
};

export const resultHref = (r: SearchResult) => `${ENTITY_META[r.entity]?.href ?? "/"}?open=${r.id}`;

export function useGlobalSearch(q: string, maxResults: number) {
  const term = q.trim();
  return useQuery({
    queryKey: ["search", term, maxResults],
    enabled: term.length >= 2,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await createClient().rpc("global_search", { q: term, max_results: maxResults });
      if (error) throw error;
      return data;
    },
  });
}

export function groupResults(results: SearchResult[]) {
  const groups = new Map<string, SearchResult[]>();
  for (const r of results) groups.set(r.entity, [...(groups.get(r.entity) ?? []), r]);
  return [...groups.entries()];
}
