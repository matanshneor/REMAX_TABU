"use client";

import { HourglassIcon, UserXIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

const RECHECK_MS = 20_000;

/** Shown instead of the app to accounts the manager hasn't approved (or has rejected). */
export function PendingApproval() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const rejected = profile?.status === "rejected";

  // Approval happens on the manager's screen; pick it up without a manual refresh.
  useEffect(() => {
    if (rejected) return;
    const timer = setInterval(refreshProfile, RECHECK_MS);
    return () => clearInterval(timer);
  }, [rejected, refreshProfile]);

  async function check() {
    setChecking(true);
    await refreshProfile();
    setChecking(false);
  }

  return (
    <AuthCard title={rejected ? "הבקשה לא אושרה" : "החשבון ממתין לאישור"}>
      <div className="mt-4 flex flex-col items-center gap-3 text-center">
        {rejected ? <UserXIcon className="size-10 text-muted-foreground" /> : <HourglassIcon className="size-10 text-primary" />}
        <p className="text-sm text-muted-foreground">
          {rejected
            ? "מנהל המשרד לא אישר את החשבון. אם זו טעות, פנה אליו ישירות."
            : `שלום ${profile?.full_name.split(" ")[0] ?? ""}, ההרשמה התקבלה. מנהל המשרד קיבל הודעה, וברגע שיאשר את החשבון המערכת תיפתח כאן מעצמה.`}
        </p>
        <div className="mt-2 flex w-full flex-col gap-2">
          {!rejected && (
            <Button className="h-10" onClick={check} disabled={checking}>
              {checking ? "בודק…" : "בדוק שוב"}
            </Button>
          )}
          <Button variant="ghost" className="h-10" onClick={signOut}>
            התנתקות
          </Button>
        </div>
      </div>
    </AuthCard>
  );
}
