"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { createClient } from "@/lib/supabase/client";

type State = "loading" | "set-password" | "error";

/**
 * Landing page for links in Supabase emails (password reset, agent invite).
 * Reset links arrive with `?code=` (PKCE); admin invites arrive with tokens in the URL hash.
 */
export function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<State>("loading");
  // "signup" is what Supabase reports for dashboard invites of brand-new users.
  const isInvite = params.get("type") === "invite" || params.get("type") === "signup";

  useEffect(() => {
    const supabase = createClient();
    const hash = new URLSearchParams(window.location.hash.slice(1));

    async function establish(): Promise<boolean> {
      if (params.get("error") || hash.get("error")) return false;

      // The client may already have consumed the URL during initialization.
      const { data } = await supabase.auth.getSession();
      if (data.session) return true;

      const code = params.get("code");
      if (code) return !(await supabase.auth.exchangeCodeForSession(code)).error;

      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      if (access_token && refresh_token) return !(await supabase.auth.setSession({ access_token, refresh_token })).error;

      return false;
    }

    establish().then((ok) => {
      window.history.replaceState(null, "", window.location.pathname + window.location.search.replace(/[?&]code=[^&]+/, ""));
      setState(ok ? "set-password" : "error");
    });
  }, [params]);

  if (state === "loading") {
    return (
      <AuthCard title="רק רגע…">
        <p className="mt-2 text-sm text-muted-foreground">מאמת את הקישור</p>
      </AuthCard>
    );
  }

  if (state === "error") {
    return (
      <AuthCard title="הקישור אינו תקף" description="ייתכן שפג תוקפו או שכבר השתמשו בו.">
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            שלח לי קישור חדש
          </Link>
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            חזרה לדף הכניסה
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={isInvite ? "ברוך הבא! בחר סיסמה" : "בחירת סיסמה חדשה"}
      description={isInvite ? "זו הסיסמה שתשמש אותך לכניסה למערכת." : "אחרי השמירה תועבר ישירות למערכת."}
    >
      <SetPasswordForm
        submitLabel={isInvite ? "שמור והיכנס למערכת" : "שמור סיסמה"}
        onDone={() => {
          router.replace("/buyers");
          router.refresh();
        }}
      />
    </AuthCard>
  );
}
