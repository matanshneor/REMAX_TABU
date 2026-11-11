type DbError = { code?: string; message: string };

export const NO_PERMISSION = "אין לך הרשאה לבצע פעולה זו";

/** Turns Supabase/Postgres errors into a Hebrew message. */
export function errorMessage(error: unknown): string {
  const e = error as DbError;
  if (e?.code === "42501") {
    // Our triggers raise Hebrew messages; RLS violations come back in English.
    return /[֐-׿]/.test(e.message) ? e.message : NO_PERMISSION;
  }
  if (e?.code === "PGRST116") return NO_PERMISSION;
  if (e?.code === "23505") return "הרשומה כבר קיימת";
  if (e?.code === "23514") return "אחד הערכים אינו תקין (למשל קומה גבוהה ממספר הקומות, או תאריך סיום לפני תאריך ההתחלה)";
  if (e?.code === "23502") return "חסר שדה חובה";
  if (e?.code === "23503") return "הרשומה קשורה לפריט שכבר לא קיים";
  if (e?.code === "PGRST301" || e?.code === "PGRST303") return "החיבור פג — יש להתחבר מחדש";
  if (/failed to fetch|network|load failed|fetch failed/i.test(e?.message ?? "")) return "אין חיבור לאינטרנט — אפשר לנסות שוב";
  // Our own triggers raise Hebrew messages; anything else from the server stays generic.
  return e?.message && /[֐-׿]/.test(e.message) ? e.message : "אירעה שגיאה, אפשר לנסות שוב";
}
