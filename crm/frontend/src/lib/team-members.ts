import { useMemo } from "react";
import { useAllProfiles, useTeam } from "@/lib/data";
import type { OfficeAgent, Profile } from "@/lib/types";

/** One person on the team: a row from the office list, an account, or both once linked. */
export type Member = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isManager: boolean;
  account: Profile | null;
  listRow: OfficeAgent | null;
  /** Has an approved account, i.e. can use the system. */
  active: boolean;
};

/**
 * The one team list: the office list merged with the accounts, manager first, then active people, then by name.
 * `withBlocked` also keeps blocked accounts that aren't on the list (the admin screen needs
 * them to let people back in); the read-only team page leaves them out.
 */
export function useTeamMembers({ withBlocked = false } = {}) {
  const list = useTeam();
  const accounts = useAllProfiles();

  const members = useMemo(() => {
    const byId = new Map((accounts.data ?? []).map((p) => [p.id, p]));
    const linked = new Set<string>();
    const out: Member[] = (list.data ?? []).map((row) => {
      const account = row.profile_id ? (byId.get(row.profile_id) ?? null) : null;
      if (account) linked.add(account.id);
      return {
        id: row.id,
        name: row.full_name,
        phone: row.phone ?? account?.phone ?? null,
        email: row.email ?? account?.email ?? null,
        isManager: account?.role === "admin",
        account,
        listRow: row,
        active: account?.status === "active",
      };
    });
    // Accounts that aren't on the list yet still belong on the team.
    for (const p of accounts.data ?? []) {
      if (linked.has(p.id) || p.status === "pending") continue;
      if (p.status !== "active" && !withBlocked) continue;
      out.push({
        id: p.id,
        name: p.full_name,
        phone: p.phone,
        email: p.email,
        isManager: p.role === "admin",
        account: p,
        listRow: null,
        active: p.status === "active",
      });
    }
    return out.sort((a, b) => Number(b.isManager) - Number(a.isManager) || Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "he"));
  }, [list.data, accounts.data, withBlocked]);

  return {
    members,
    error: list.error ?? accounts.error,
    isLoading: list.isLoading || accounts.isLoading,
  };
}

/** Why someone isn't active, shown next to the status. */
export function inactiveReason(m: Member): string {
  if (!m.account) return "עוד לא נרשם";
  if (m.account.status === "pending") return "ממתין לאישור";
  return "חסום";
}
