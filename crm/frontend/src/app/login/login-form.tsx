"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "@/lib/auth-errors";
import { rememberedEmail, saveLoginChoice } from "@/lib/remember-me";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  // Until the user types, show the email saved by the last "remember me" login. It lives in
  // browser storage, so the server renders an empty field and the browser fills it in.
  const savedEmail = useSyncExternalStore(noSubscription, rememberedEmail, () => "");
  const [typedEmail, setEmail] = useState<string | null>(null);
  const email = typedEmail ?? savedEmail;
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [remember, setRemember] = useState(true);

  // Invites sent from the Supabase dashboard land on the site root (→ /login) with the
  // session in the URL hash. Hand them to the "choose a password" screen.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("access_token")) {
      window.location.replace(`/auth/callback?type=${hash.get("type") ?? "invite"}${window.location.hash}`);
    }
  }, []);


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }
    saveLoginChoice(remember, email.trim());
    router.replace("/buyers");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">אימייל</Label>
        <Input id="email" type="email" dir="ltr" className="h-10 text-end" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">סיסמה</Label>
          <Link href="/forgot-password" className="text-xs text-primary hover:underline">
            שכחת סיסמה?
          </Link>
        </div>
        <Input id="password" type="password" dir="ltr" className="h-10 text-end" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={remember} onCheckedChange={(c) => setRemember(Boolean(c))} />
        זכור אותי
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? "מתחבר…" : "כניסה"}
      </Button>
    </form>
  );
}

const noSubscription = () => () => {};
