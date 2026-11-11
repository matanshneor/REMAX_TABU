import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { Container } from "@/components/ui";
import { OFFICE, PRIVACY_UPDATED } from "@/content/site";
import { telHref } from "@/lib/contact";
import { getAgent } from "@/lib/data";

export const metadata: Metadata = {
  title: "מדיניות פרטיות",
  description: "אילו פרטים נשמרים כשפונים דרך אתר הנכסים של משה שניאור, RE/MAX טאבו נכסים, ולמה הם משמשים.",
  alternates: { canonical: "/privacy" },
};

/** What the site really does with a visitor's details: only the contact form saves anything. */
export default async function PrivacyPage() {
  const agent = await getAgent();
  const h2 = "type-subtitle mt-12";
  const p = "mt-4 text-lg leading-relaxed text-ink-2";
  return (
    <PageTransition>
    <Container className="max-w-3xl py-16 sm:py-24">
      <h1 className="accent-line type-display">מדיניות פרטיות</h1>
      <p className={p}>
        האתר מציג נכסים למכירה של {agent.full_name}, {OFFICE.name}. אפשר לגלוש בו בלי להירשם ובלי למסור שום פרט. הפרטים היחידים שנשמרים הם אלה
        שאתם בוחרים להשאיר בטופס הפנייה.
      </p>

      <h2 className={h2}>אילו פרטים נשמרים</h2>
      <ul className={`${p} list-disc space-y-2 ps-6`}>
        <li>השם, הטלפון וההודעה שכתבתם בטופס הפנייה.</li>
        <li>אם פניתם מתוך עמוד של נכס, נשמר גם באיזה נכס התעניינתם.</li>
      </ul>
      <p className={p}>
        האתר לא משתמש בעוגיות מעקב, בכלי פרסום או בכלי סטטיסטיקה. כתובת ה-IP משמשת רק להפעלת האתר ולהגנה מפני פניות ספאם, ואינה נשמרת יחד עם
        הפנייה.
      </p>

      <h2 className={h2}>למה הפרטים משמשים</h2>
      <p className={p}>
        רק כדי לחזור אליכם בנוגע לפנייה: לענות על שאלה, לתאם סיור או להציע נכסים שמתאימים למה שחיפשתם. הפרטים לא נמכרים ולא מועברים לגורם אחר לצורכי
        פרסום.
      </p>

      <h2 className={h2}>מי רואה את הפרטים ואיפה הם נשמרים</h2>
      <p className={p}>
        הפנייה מגיעה אל {agent.full_name} ואל צוות המשרד, ונשמרת במערכת ניהול הלקוחות של המשרד, שמאוחסנת בשירותי ענן מאובטחים.
      </p>

      <h2 className={h2}>וואטסאפ וטלפון</h2>
      <p className={p}>
        לחיצה על כפתור הוואטסאפ פותחת שיחה באפליקציית וואטסאפ, והשיחה מתנהלת שם לפי התנאים של וואטסאפ. האתר עצמו לא שומר אותה.
      </p>

      <h2 className={h2}>עיון, תיקון ומחיקה</h2>
      <p className={p}>אפשר לבקש בכל עת לראות את הפרטים שנשמרו עליכם, לתקן אותם או למחוק אותם:</p>
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

      <p className="mt-12 text-sm text-ink-3">המדיניות עודכנה ב-{PRIVACY_UPDATED}.</p>
    </Container>
    </PageTransition>
  );
}
