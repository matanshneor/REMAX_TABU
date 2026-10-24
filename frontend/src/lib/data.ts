"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "./supabase/client";
import type { OfficeAgent, Profile, TableName } from "./types";

type DbError = { code?: string; message: string };

const NO_PERMISSION = "אין לך הרשאה לבצע פעולה זו";

/** Turns Supabase/Postgres errors into a Hebrew message. */
export function errorMessage(error: unknown): string {
  const e = error as DbError;
  if (e?.code === "42501") {
    // Our triggers raise Hebrew messages; RLS violations come back in English.
    return /[֐-׿]/.test(e.message) ? e.message : NO_PERMISSION;
  }
  if (e?.code === "PGRST116") return NO_PERMISSION;
  if (e?.code === "23505") return "הרשומה כבר קיימת";
  if (e?.code === "23514") return "אחד הערכים אינו תקין";
  return e?.message || "אירעה שגיאה";
}

/** Approved agents only — the lists every screen picks from. */
export function useAgents() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await createClient().from("profiles").select("*").eq("status", "active").order("full_name");
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
      const { data, error } = await createClient().from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
      const { data, error } = await query.select().single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [table] });
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
      qc.invalidateQueries({ queryKey: [table] });
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
      const { data, error } = await from.select("*").eq("id", id).maybeSingle();
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
