"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarSyncIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

const KEY = ["calendar_feeds", "mine"];

/**
 * "Connect to my phone calendar": a personal subscription link. Added once, after that the
 * phone keeps the user's dated open tasks in sync by itself (one-way, refreshed about hourly).
 */
export function CalendarSyncButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CalendarSyncIcon />
        חיבור ליומן בטלפון
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">{open && <CalendarSync />}</DialogContent>
      </Dialog>
    </>
  );
}

function CalendarSync() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: token, isLoading, isError } = useQuery({
    queryKey: KEY,
    enabled: !!profile,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await createClient().from("calendar_feeds").select("token").eq("user_id", profile!.id).maybeSingle();
      if (error) throw error;
      return data?.token ?? null;
    },
  });

  async function makeLink(replacing: boolean) {
    setBusy(true);
    const { error } = await createClient().rpc("rotate_calendar_token");
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    await qc.invalidateQueries({ queryKey: KEY });
    if (replacing) toast.success("נוצר קישור חדש. הקישור הקודם הפסיק לעבוד, וצריך לחבר את היומן מחדש.");
  }

  const httpsUrl = token ? `${window.location.origin}/api/calendar/${token}.ics` : "";
  const webcalUrl = httpsUrl.replace(/^https?:/, "webcal:");

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-normal">חיבור המשימות ליומן בטלפון</DialogTitle>
        <DialogDescription>
          מחברים פעם אחת, ומאז כל משימה עם מועד מופיעה ביומן של הטלפון ומתעדכנת לבד, עם תזכורת רבע שעה לפני.
        </DialogDescription>
      </DialogHeader>

      {isLoading ? null : isError ? (
        // Don't offer "create link" here: it would replace a link a phone is already subscribed to.
        <p className="text-sm text-destructive">לא הצלחנו לטעון את הקישור שלך. אפשר לסגור את החלון ולנסות שוב.</p>
      ) : !token ? (
        <Button className="h-10" onClick={() => makeLink(false)} disabled={busy}>
          {busy ? "יוצר…" : "צור קישור אישי"}
        </Button>
      ) : (
        <div className="flex flex-col gap-5 text-sm">
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">אייפון</h3>
            <p className="text-muted-foreground">פותחים את החלון הזה בטלפון, לוחצים על הכפתור, ובמסך שנפתח לוחצים ״הירשם״ (Subscribe).</p>
            <p className="text-muted-foreground">
              כדי שמשימות חדשות יופיעו מהר יותר: באייפון נכנסים ל<b>הגדרות ← יומן ← חשבונות ← אחזור נתונים חדשים</b>, ובוחרים{" "}
              <b>כל 15 דקות</b>.
            </p>
            <Button className="h-10" render={<a href={webcalUrl} />} nativeButton={false}>
              <CalendarSyncIcon />
              הוסף ליומן באייפון
            </Button>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">אנדרואיד / Google Calendar</h3>
            <ol className="list-decimal space-y-1 ps-5 text-muted-foreground">
              <li>מעתיקים את הקישור:</li>
            </ol>
            <div className="flex gap-2">
              <Input readOnly value={httpsUrl} dir="ltr" className="h-10 text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button
                variant="outline"
                className="h-10 shrink-0"
                onClick={() => navigator.clipboard.writeText(httpsUrl).then(() => toast.success("הקישור הועתק"))}
              >
                <CopyIcon />
                העתק
              </Button>
            </div>
            <ol start={2} className="list-decimal space-y-1 ps-5 text-muted-foreground">
              <li>
                פותחים במחשב את{" "}
                <a href="https://calendar.google.com/calendar/r/settings/addbyurl" target="_blank" rel="noopener" className="text-primary underline">
                  הוספת יומן מכתובת URL ב-Google Calendar
                </a>
                .
              </li>
              <li>מדביקים את הקישור ולוחצים ״הוספת יומן״. היומן יופיע גם בטלפון, תחת ״משימות – רימקס טאבו״.</li>
            </ol>
          </section>

          <p className="rounded-lg bg-secondary/60 px-3 py-2">
            ⏱️ היומן מתעדכן לבד: באייפון כל 15 דקות עד שעה (לפי ההגדרה למעלה), בגוגל לפעמים רק אחרי כמה שעות. משימה שסומנה ״בוצעה״ יורדת מהיומן. שינוי
            נעשה רק באתר, לא ביומן.
          </p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            🔒 הקישור אישי: מי שמחזיק בו רואה את המשימות שלך. אל תשלח אותו לאחרים. אם הוא דלף, צור קישור חדש, והישן יפסיק לעבוד.
          </p>
          <Button variant="ghost" className="self-start text-muted-foreground" onClick={() => makeLink(true)} disabled={busy}>
            <RefreshCwIcon />
            צור קישור חדש (מבטל את הקודם)
          </Button>
        </div>
      )}
    </>
  );
}
