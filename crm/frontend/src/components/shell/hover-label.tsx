/**
 * A small dark label under an icon button while the mouse is over it (or it has keyboard focus),
 * so icon-only buttons say what they do. Hidden while the button's own popover is open.
 */
export function HoverLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group/hover relative inline-flex">
      {children}
      <span
        role="presentation"
        className="pointer-events-none absolute top-full left-1/2 z-30 mt-1.5 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-md transition-opacity delay-150 group-hover/hover:opacity-100 group-has-[:focus-visible]/hover:opacity-100 group-has-[[aria-expanded=true]]/hover:hidden"
      >
        {label}
      </span>
    </span>
  );
}
