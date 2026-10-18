"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 8;

/**
 * New password + confirmation. With `currentPasswordFor`, the current password is
 * verified first (a signed-in change); without it, the recovery/invite session is trusted.
 */
export function SetPasswordForm({
  currentPasswordFor,
  submitLabel = "שמור סיסמה",
  onDone,
}: {
  currentPasswordFor?: string;
  submitLabel?: string;
  onDone: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) return setError(`הסיסמה צריכה להכיל לפחות ${MIN_LENGTH} תווים`);
    if (password !== confirm) return setError("הסיסמאות אינן תואמות");
    if (currentPasswordFor && password === current) return setError("הסיסמה החדשה זהה לנוכחית");

    setPending(true);
    const supabase = createClient();
    if (currentPasswordFor) {
      const { error } = await supabase.auth.signInWithPassword({ email: currentPasswordFor, password: current });
      if (error) {
        setPending(false);
        return setError("הסיסמה הנוכחית שגויה");
      }
    }
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) {
      return setError(
        error.code === "weak_password" ? "הסיסמה חלשה מדי — נסה סיסמה ארוכה יותר עם אותיות ומספרים" : error.message,
      );
    }
    setCurrent("");
    setPassword("");
    setConfirm("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {currentPasswordFor && (
        <PasswordInput id="current-password" label="סיסמה נוכחית" value={current} onChange={setCurrent} autoComplete="current-password" />
      )}
      <PasswordInput id="new-password" label="סיסמה חדשה" value={password} onChange={setPassword} autoComplete="new-password" hint={`לפחות ${MIN_LENGTH} תווים`} />
      <PasswordInput id="confirm-password" label="אימות סיסמה חדשה" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? "שומר…" : submitLabel}
      </Button>
    </form>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="password" dir="ltr" className="h-10 text-end" required autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
