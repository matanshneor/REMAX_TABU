"use client";

import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useEffect, useState } from "react";
import { PROFILE_COLUMNS } from "@/lib/data";
import { browserSessionEnded } from "@/lib/remember-me";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** The signed-in profile, retried a few times so a brief network drop doesn't sign the user out. */
async function fetchProfile(id: string) {
  const supabase = createClient();
  for (let attempt = 1; ; attempt++) {
    const result = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle();
    if (!result.error || attempt === 4) return result;
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [state, setState] = useState<Pick<AuthState, "user" | "profile" | "loading">>({
    user: null,
    profile: null,
    loading: true,
  });

  const load = useCallback(
    async (user: User | null) => {
      const supabase = createClient();
      const result = user ? await fetchProfile(user.id) : null;
      // A dropped connection is not a deleted account: keep the session (the app keeps loading).
      if (result?.error) return;
      const profile = result?.data ?? null;
      // "Remember me" was unchecked and the browser has been closed since: sign out.
      if (!user || !profile || browserSessionEnded()) {
        // A deleted account can leave a still-valid session cookie behind: the proxy would
        // send it back from /login to the app forever. Clear it before going to /login.
        const { data } = await supabase.auth.getSession();
        if (data.session) await supabase.auth.signOut({ scope: "local" });
        setState({ user: null, profile: null, loading: false });
        router.replace("/login");
        return;
      }
      setState({ user, profile, loading: false });
    },
    [router],
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") load(null);
      else if (event === "USER_UPDATED") load(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  async function signOut() {
    await createClient().auth.signOut();
    qc.clear();
  }

  const refreshProfile = useCallback(() => load(state.user), [load, state.user]);

  return <AuthContext value={{ ...state, signOut, refreshProfile }}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
