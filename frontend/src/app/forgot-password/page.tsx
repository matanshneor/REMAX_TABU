"use client";

import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setPending(false);
    // Rate limiting is the only error worth showing; otherwise we never reveal whether the email exists.
    if (error?.status === 429) return setError("נשלחו יותר מדי בקשות. נסה שוב בעוד כמה דקות.");
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="בדוק את תיבת המייל">
        <div className="mt-4 flex flex-col items-center gap-3 text-center">
          <MailCheckIcon className="size-10 text-primary" />
          <p className="text-sm text-muted-foreground">
            אם הכתובת <span dir="ltr" className="font-medium text-foreground">{email}</span> רשומה במערכת, נשלח אליה קישור לבחירת סיסמה חדשה.
            הקישור תקף לשעה.
          </p>
          <Link href="/login" className="text-sm text-primary hover:underline">
            חזרה לדף הכניסה
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="שכחת סיסמה?" description="הזן את האימייל שלך ונשלח לך קישור לבחירת סיסמה חדשה.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">אימייל</Label>
          <Input id="email" type="email" dir="ltr" className="h-10 text-end" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-10" disabled={pending}>
          {pending ? "שולח…" : "שלח קישור"}
        </Button>
        <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
          חזרה לדף הכניסה
        </Link>
      </form>
    </AuthCard>
  );
}
