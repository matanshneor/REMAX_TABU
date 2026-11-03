"use client";

import { MailCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 8;

/** Self sign-up. The new account waits for the manager's approval before it sees any data. */
export function SignUpForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (fullName.trim().split(/\s+/).length < 2) return setError("נא למלא שם פרטי ושם משפחה");
    if (phone.replace(/\D/g, "").length < 9) return setError("מספר הטלפון אינו תקין");
    if (password.length < MIN_PASSWORD) return setError(`הסיסמה צריכה להכיל לפחות ${MIN_PASSWORD} תווים`);
    if (password !== confirm) return setError("הסיסמאות אינן תואמות");

    setPending(true);
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim() },
        emailRedirectTo: `${window.location.origin}/buyers`,
      },
    });
    setPending(false);
    if (error) return setError(authErrorMessage(error));
    // An existing email comes back as a user with no identities (so emails can't be probed).
    if (data.user && !data.user.identities?.length) return setError("האימייל הזה כבר רשום במערכת. אפשר להתחבר.");
    if (!data.session) return setCheckEmail(true);
    router.replace("/buyers");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/40 p-6 text-center">
        <MailCheckIcon className="size-10 text-primary" />
        <p className="text-sm text-muted-foreground">
          שלחנו קישור לאישור הכתובת <span dir="ltr" className="font-medium text-foreground">{email}</span>.
          אחרי האישור, מנהל המשרד יאשר את החשבון שלך.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-name">שם מלא</Label>
          <Input id="su-name" className="h-10" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-phone">טלפון נייד</Label>
          <Input id="su-phone" type="tel" dir="ltr" className="h-10 text-end" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="su-email">אימייל</Label>
        <Input id="su-email" type="email" dir="ltr" className="h-10 text-end" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-password">סיסמה</Label>
          <Input id="su-password" type="password" dir="ltr" className="h-10 text-end" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-confirm">אימות סיסמה</Label>
          <Input id="su-confirm" type="password" dir="ltr" className="h-10 text-end" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">לפחות {MIN_PASSWORD} תווים</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? "נרשם…" : "הרשמה"}
      </Button>
    </form>
  );
}
