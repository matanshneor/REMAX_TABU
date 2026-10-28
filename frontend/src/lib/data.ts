"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "./supabase/client";
import { errorMessage, NO_PERMISSION } from "./errors";
import type { OfficeAgent, Profile, TableName } from "./types";

export { errorMessage };

/** Every profile column except commission_split, which only agent_commission_rates() returns. */
export const PROFILE_COLUMNS = "id, full_name, phone, email, role, join_date, created_at, updated_at, status";

/** Saving a team row can hand buyers and sellers to the linked agent: refresh those lists too. */
const ALSO_REFRESH: Partial<Record<TableName, TableName[]>> = { office_agents: ["buyers", "properties"] };

function refreshTable(qc: ReturnType<typeof useQueryClient>, table: TableName) {
  for (const key of [table, ...(ALSO_REFRESH[table] ?? [])]) qc.invalidateQueries({ queryKey: [key] });
}

/** Columns the generic hooks read back (profiles can't select commission_split). */
function columnsOf(table: TableName) {
  return table === "profiles" ? PROFILE_COLUMNS : "*";
}

/** Approved agents only — the lists every screen picks from. */
export function useAgents() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await createClient().from("profiles").select(PROFILE_COLUMNS).eq("status", "active").order("full_name");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/** Every account, including sign-ups waiting for approval (admin screen). */
export function useAllProfiles() {
  return useQuery({
    queryKey: ["profiles", "all"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await createClient().from("profiles").select(PROFILE_COLUMNS).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Each agent's fixed commission % (the admin gets everyone, an agent only their own). */
export function useCommissionRates() {
  return useQuery({
    queryKey: ["profiles", "rates"],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await createClient().rpc("agent_commission_rates");
      if (error) throw error;
      return new Map(data.map((r) => [r.id, Number(r.commission_split)]));
    },
  });
}

export function useAgentName() {
  const { data } = useAgents();
  return useCallback(
    (id: string | null | undefined) => (id && data?.find((a) => a.id === id)?.full_name) || "—",
    [data],
  );
}

/** The office team list ("צוות המשרד"), including agents who haven't signed up. */
export function useTeam() {
  return useQuery({
    queryKey: ["office_agents"],
    queryFn: async (): Promise<OfficeAgent[]> => {
      const { data, error } = await createClient().from("office_agents").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/** Recruiter's name from the team list, falling back to the account (rows from before the list). */
export function useRecruiterName() {
  const { data: team } = useTeam();
  const agentName = useAgentName();
  return useCallback(
    (recruiterId: string | null | undefined, accountId?: string | null) =>
      (recruiterId && team?.find((t) => t.id === recruiterId)?.full_name) || (accountId ? agentName(accountId) : "—"),
    [team, agentName],
  );
}

type Values = Record<string, unknown>;

/**
 * Insert (no id) or update (with id) a row. Updates blocked by RLS return 0 rows,
 * which `.single()` turns into PGRST116 → "no permission".
 */
export function useSaveRecord<T extends Values = Values>(table: TableName, options?: { silent?: boolean }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Values }): Promise<T> => {
      // The generic helper can't carry per-table types through supabase-js.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const from = createClient().from(table) as any;
      const query = id ? from.update(values).eq("id", id) : from.insert(values);
      const { data, error } = await query.select(columnsOf(table)).single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: (_data, { id }) => {
      refreshTable(qc, table);
      if (!options?.silent) toast.success(id ? "השינויים נשמרו" : "נוצר בהצלחה");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteRecord(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const from = createClient().from(table) as any;
      const { data, error } = await from.delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw { code: "42501", message: NO_PERMISSION };
    },
    onSuccess: () => {
      refreshTable(qc, table);
      toast.success("נמחק");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRecord<T>(table: TableName, id: string | null) {
  return useQuery({
    queryKey: [table, "one", id],
    enabled: !!id,
    queryFn: async (): Promise<T | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const from = createClient().from(table) as any;
      const { data, error } = await from.select(columnsOf(table)).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as T | null;
    },
  });
}

/** Short-lived signed URLs for private storage objects. */
export function useSignedUrls(bucket: string, paths: string[]) {
  return useQuery({
    queryKey: ["signed", bucket, paths],
    enabled: paths.length > 0,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await createClient().storage.from(bucket).createSignedUrls(paths, 3600);
      if (error) throw error;
      return Object.fromEntries(data.map((d) => [d.path, d.signedUrl])) as Record<string, string>;
    },
  });
}

export async function uploadFile(bucket: string, folder: string, file: File): Promise<string> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient().storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export async function openSignedFile(bucket: string, path: string) {
  const { data, error } = await createClient().storage.from(bucket).createSignedUrl(path, 300);
  if (error) {
    toast.error(errorMessage(error));
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}
