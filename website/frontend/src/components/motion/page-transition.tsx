import { type ReactNode, ViewTransition } from "react";

/**
 * Wraps a page's content so that changing pages cross-fades (old page out quickly, new page rising
 * in) instead of swapping at once. It sits in every page, not in the layout: the layout stays
 * mounted between pages, so a wrapper there would never enter or leave.
 * The timings are in globals.css (.page-in / .page-out).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
