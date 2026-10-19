// "זכור אותי" on the login page. Supabase keeps the session in a long-lived cookie, so by
// default a user stays signed in. Unchecking the box marks the login as "this browser session
// only": a cookie without an expiry date lives until the browser closes, and when it's gone
// the app signs out. All storage access is best effort (private mode can block it).

const REMEMBER_KEY = "crm:remember-me";
const EMAIL_KEY = "crm:last-email";
const SESSION_COOKIE = "crm_browser_session";

export function saveLoginChoice(remember: boolean, email: string) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    if (remember) localStorage.setItem(EMAIL_KEY, email);
    else localStorage.removeItem(EMAIL_KEY);
  } catch {}
  document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax`;
}

export function rememberedEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

/** True when the user asked not to be remembered and the browser has been closed since. */
export function browserSessionEnded(): boolean {
  try {
    if (localStorage.getItem(REMEMBER_KEY) !== "0") return false;
  } catch {
    return false;
  }
  return !document.cookie.split("; ").includes(`${SESSION_COOKIE}=1`);
}
