import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { Container } from "@/components/ui";
import { ACCESSIBILITY_UPDATED, OFFICE } from "@/content/site";
import { telHref } from "@/lib/contact";
import { getAgent } from "@/lib/data";

export const metadata: Metadata = {
  title: "הצהרת נגישות",
  description: "הצהרת הנגישות של אתר הנכסים של משה שניאור, RE/MAX טאבו נכסים.",
  alternates: { canonical: "/accessibility" },
};

export default async function AccessibilityPage() {
  const agent = await getAgent();
  const h2 = "type-subtitle mt-12";
  const p = "mt-4 text-lg leading-relaxed text-ink-2";
  return (
    <PageTransition>
    <Container className="max-w-3xl py-16 sm:py-24">
      <h1 className="accent-line type-display">הצהרת נגישות</h1>
      <p className={p}>
        אנחנו רואים חשיבות בכך שכל אחד ואחת יוכלו להשתמש באתר בקלות, כולל אנשים עם מוגבלות. האתר נבנה לפי תקנות שוויון זכויות לאנשים עם מוגבלות
        (התאמות נגישות לשירות), התשע״ג-2013, ולפי התקן הישראלי ת״י 5568, שמבוסס על הנחיות WCAG 2.1 ברמה AA.
      </p>

      <h2 className={h2}>מה עשינו באתר</h2>
      <ul className={`${p} list-disc space-y-2 ps-6`}>
        <li>האתר כתוב בעברית מימין לשמאל, עם מבנה כותרות ברור ותיאור לכל אזור בעמוד.</li>
        <li>אפשר לנווט בכל האתר במקלדת בלבד. מסגרת לבנה מסמנת איפה נמצאים, וקישור ״דילוג לתוכן״ מופיע בלחיצה הראשונה על Tab.</li>
        <li>ניגודיות הטקסט מול הרקע עומדת בדרישות רמה AA.</li>
        <li>לכל שדה בטפסים יש תווית, והודעות השגיאה אומרות מה צריך לתקן.</li>
        <li>לתמונות הנכסים יש תיאור טקסט. בגלריה אפשר לעבור בין התמונות בחצים במקלדת ולסגור עם Esc.</li>
        <li>כפתורים וקישורים בגודל 44 פיקסלים לפחות, ונוחים ללחיצה בטלפון.</li>
        <li>האתר מכבד את הגדרת ״הפחתת תנועה״ של המכשיר: בלי אנימציות ובלי החלפה אוטומטית של נכסים. להחלפה האוטומטית בפתיחת דף הבית יש כפתור עצירה.</li>
        <li>אפשר להגדיל את הטקסט עד 200% בלי לאבד תוכן.</li>
      </ul>

      <h2 className={h2}>מה עוד לא מושלם</h2>
      <p className={p}>
        תיאורי הנכסים ותמונותיהם מוזנים על ידי המשרד. ייתכן שבחלק מהתמונות התיאור כללי. אם משהו באתר לא נגיש לכם, נשמח לשמוע ולתקן, ובינתיים נמסור
        לכם כל מידע בטלפון או בוואטסאפ.
      </p>

      <h2 className={h2}>פנייה בנושא נגישות</h2>
      <p className={p}>
        רכז הנגישות: {agent.full_name}, {OFFICE.name}.
      </p>
      <ul className={`${p} space-y-1`}>
        {agent.phone && (
          <li>
            טלפון:{" "}
            <a href={telHref(agent.phone)} className="underline underline-offset-4" dir="ltr">
              {agent.phone}
            </a>
          </li>
        )}
        {agent.email && (
          <li>
            מייל:{" "}
            <a href={`mailto:${agent.email}`} className="underline underline-offset-4" dir="ltr">
              {agent.email}
            </a>
          </li>
        )}
      </ul>
      <p className={p}>כדאי לציין בפנייה באיזה עמוד הייתה הבעיה ומה ניסיתם לעשות. נחזור אליכם תוך כמה ימי עבודה.</p>

      <p className="mt-12 text-sm text-ink-3">ההצהרה עודכנה ב-{ACCESSIBILITY_UPDATED}.</p>
    </Container>
    </PageTransition>
  );
}
