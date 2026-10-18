"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      setError(error.code === "invalid_credentials" ? "אימייל או סיסמה שגויים" : error.message);
      setPending(false);
      return;
    }
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? "מתחבר…" : "כניסה"}
      </Button>
    </form>
  );
}
