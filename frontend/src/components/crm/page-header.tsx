/** The RE/MAX slash: a red and a blue diagonal bar. The site's one signature mark. */
export function BrandSlash({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-flex h-[0.8em] shrink-0 gap-[0.12em] ${className}`}>
      <span className="w-[0.16em] -skew-x-[22deg] rounded-[1px] bg-brand-red" />
      <span className="w-[0.16em] -skew-x-[22deg] rounded-[1px] bg-primary" />
    </span>
  );
}

export function PageHeader({
  title,
  count,
  description,
  actions,
}: {
  title: string;
  count?: number;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
      <div>
        <h1 className="flex items-center gap-2.5 font-display text-[1.75rem] leading-tight">
          <BrandSlash />
          {title}
          {count != null && (
            <span className="rounded-full bg-secondary px-2 py-0.5 font-sans text-sm font-semibold text-secondary-foreground tabular-nums">
              {count}
            </span>
          )}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A titled block inside a page that holds more than one list. */
export function SectionHeader({
  icon,
  title,
  count,
  description,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold [&_svg]:size-5 [&_svg]:text-muted-foreground">
          {icon}
          {title}
          {count != null && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground tabular-nums">{count}</span>
          )}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground [&_svg]:size-5">
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      שגיאה בטעינת הנתונים: {(error as Error)?.message ?? "לא ידוע"}
    </div>
  );
}
