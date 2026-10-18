// Mirrors the RLS policies so the UI can show locks up front.
// The database is the source of truth; these only drive what the UI offers.
import type { Buyer, Profile, Property, Task, Viewing } from "./types";

export const isAdmin = (me: Profile | null) => me?.role === "admin";

/** Buyers are private per agent: the owner and the admin (who also assigns owners). */
export function canEditBuyer(me: Profile | null, buyer: Pick<Buyer, "owner_agent_id">) {
  return isAdmin(me) || buyer.owner_agent_id === me?.id;
}

export function canEditProperty(me: Profile | null, p: Pick<Property, "is_exclusive" | "recruiting_agent_id">) {
  return isAdmin(me) || !p.is_exclusive || p.recruiting_agent_id === me?.id;
}

/** Owner details, exclusivity and the recruiting agent are reserved for the recruiter + admin. */
export function canManageProperty(me: Profile | null, p: Pick<Property, "recruiting_agent_id">) {
  return isAdmin(me) || p.recruiting_agent_id === me?.id;
}

/** Tasks are private: only their owner (admin included) can see or change them. */
export function canEditTask(me: Profile | null, t: Pick<Task, "assigned_to">) {
  return t.assigned_to === me?.id;
}

export function canEditViewing(me: Profile | null, v: Pick<Viewing, "agent_id">) {
  return isAdmin(me) || v.agent_id === me?.id;
}
