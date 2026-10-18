import { BRAND, BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          <BrandLogo priority className="mb-10 w-56" />
          <h1 className="text-2xl font-bold tracking-tight">כניסה למערכת</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">התחבר עם האימייל והסיסמה שקיבלת מהמנהל.</p>
          <LoginForm />
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
