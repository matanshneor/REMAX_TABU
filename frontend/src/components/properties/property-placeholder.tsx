import Image from "next/image";
import { cn } from "@/lib/utils";

/** Shown where a property has no photos yet: a soft brand surface with the RE/MAX balloon. */
export function PropertyPlaceholder({ className, label = "אין תמונה עדיין" }: { className?: string; label?: string }) {
  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-secondary to-secondary/40 text-secondary-foreground/70",
        className,
      )}
    >
      <Image src="/brand/balloon.png" alt="" width={96} height={96} className="size-10 opacity-40 mix-blend-multiply grayscale-[35%]" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
