import { BrandLogo } from "@/components/brand-logo";

/** Centered card layout shared by the public auth pages (forgot password, set password). */
export function AuthCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/60 p-6">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="h-1.5 bg-gradient-to-l from-primary from-60% to-brand-red to-60%" />
        <div className="p-8">
          <BrandLogo priority className="mb-8 w-48" />
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1 mb-6 text-sm text-muted-foreground">{description}</p>}
          {children}
        </div>
      </div>
    </main>
  );
}
