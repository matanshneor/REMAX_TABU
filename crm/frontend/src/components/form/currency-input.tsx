"use client";

import { useLayoutEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const withCommas = (digits: string) => (digits ? Number(digits).toLocaleString("en-US") : "");

/**
 * Shekel amount input that shows thousands separators while typing (4,000,000)
 * but reports plain digits ("4000000") through onChange.
 */
export function CurrencyInput({
  value,
  onChange,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (digits: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // How many digits sit left of the caret, so it can be restored after reformatting.
  const digitsBeforeCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const target = digitsBeforeCaret.current;
    if (!el || target == null || document.activeElement !== el) return;
    let pos = 0;
    for (let seen = 0; pos < el.value.length && seen < target; pos++) {
      if (/\d/.test(el.value[pos])) seen++;
    }
    el.setSelectionRange(pos, pos);
    digitsBeforeCaret.current = null;
  }, [value]);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        dir="ltr"
        value={withCommas(value)}
        onChange={(e) => {
          const raw = e.target.value;
          const caret = e.target.selectionStart ?? raw.length;
          digitsBeforeCaret.current = raw.slice(0, caret).replace(/\D/g, "").length;
          onChange(raw.replace(/\D/g, "").replace(/^0+(?=\d)/, ""));
        }}
        className={cn("ps-7 text-right tabular-nums", className)}
        {...props}
      />
      {/* The wrapper is RTL, so "end" is the left side — matching the LTR input's start padding. */}
      <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₪</span>
    </div>
  );
}
