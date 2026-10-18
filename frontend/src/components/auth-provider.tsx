"use client";

import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useEffect, useState } from "react";
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
      if (!user) {
        setState({ user: null, profile: null, loading: false });
        router.replace("/login");
        return;
      }
      const { data: profile } = await createClient().from("profiles").select("*").eq("id", user.id).maybeSingle();
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
