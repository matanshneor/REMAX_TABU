/** Supabase Auth errors (sign-in, sign-up, password change) in Hebrew. */
export function authErrorMessage(error: { code?: string; status?: number; message: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "אימייל או סיסמה שגויים";
    case "email_not_confirmed":
      return "האימייל עדיין לא אומת. בדוק את תיבת הדואר שלך.";
    case "user_already_exists":
    case "email_exists":
      return "האימייל הזה כבר רשום במערכת. אפשר להתחבר.";
    case "signup_disabled":
      return "ההרשמה סגורה כרגע. פנה למנהל המשרד.";
    case "weak_password":
      return "הסיסמה חלשה מדי — כדאי לבחור סיסמה ארוכה יותר עם אותיות ומספרים";
    case "same_password":
      return "הסיסמה החדשה צריכה להיות שונה מהסיסמה הקודמת";
    case "email_address_invalid":
      return "כתובת האימייל אינה תקינה";
    case "user_banned":
      return "החשבון חסום. פנה למנהל המשרד.";
    case "session_expired":
    case "session_not_found":
      return "החיבור פג. צריך להתחבר מחדש ולנסות שוב.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "נשלחו יותר מדי בקשות. אפשר לנסות שוב בעוד כמה דקות.";
  }
  if (error.status === 429) return "נשלחו יותר מדי בקשות. אפשר לנסות שוב בעוד כמה דקות.";
  if (/failed to fetch|network|load failed/i.test(error.message)) return "אין חיבור לאינטרנט — אפשר לנסות שוב";
  return "אירעה שגיאה, אפשר לנסות שוב";
}
