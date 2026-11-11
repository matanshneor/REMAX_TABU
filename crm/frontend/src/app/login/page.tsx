import Link from "next/link";
import { BRAND, BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { LoginForm } from "./login-form";
import { SignUpForm } from "./sign-up-form";

// The mode comes from the URL (?mode=signup), so the page renders per request.
export const instant = false;

const MODES = [
  { value: "login", label: "כניסה", href: "/login" },
  { value: "signup", label: "הרשמה", href: "/login?mode=signup" },
] as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const signUp = (await searchParams).mode === "signup";

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          <BrandLogo priority className="mb-10 w-56" />

          <nav aria-label="כניסה או הרשמה" className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm">
            {MODES.map((m) => {
              const active = (m.value === "signup") === signUp;
              return (
                <Link
                  key={m.value}
                  href={m.href}
                  replace
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-md font-medium transition-colors",
                    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m.label}
                </Link>
              );
            })}
          </nav>

          {signUp ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight">הרשמה למערכת</h1>
              <p className="mt-1 mb-6 text-sm text-muted-foreground">
                ממלאים פרטים, ומנהל המשרד מאשר את החשבון. אחרי האישור אפשר להתחיל לעבוד.
              </p>
              <SignUpForm />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">כניסה למערכת</h1>
              <p className="mt-1 mb-6 text-sm text-muted-foreground">התחבר עם האימייל והסיסמה שלך.</p>
              <LoginForm />
              <p className="mt-6 text-center text-sm text-muted-foreground">
                עוד אין לך חשבון?{" "}
                <Link href="/login?mode=signup" replace className="font-medium text-primary hover:underline">
                  להרשמה
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary to-sidebar lg:flex lg:flex-col lg:justify-end lg:p-12">
        {/* The RE/MAX slash, as a large decorative mark */}
        <div aria-hidden className="absolute -top-24 end-28 h-[140%] w-28 -rotate-[24deg] rounded-full bg-white/[0.06]" />
        <div aria-hidden className="absolute -top-24 end-8 h-[140%] w-10 -rotate-[24deg] rounded-full bg-brand-red/70" />
        <div className="relative">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-sm text-white/90">{BRAND.name}</p>
          <p className="max-w-md text-4xl leading-tight font-bold text-white">{BRAND.tagline}</p>
          <p className="mt-3 max-w-md text-white/70">כל הקונים, הנכסים והמשימות של המשרד — במקום אחד.</p>
        </div>
      </div>
    </main>
  );
}
