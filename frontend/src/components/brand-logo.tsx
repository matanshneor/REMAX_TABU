import Image from "next/image";
import { cn } from "@/lib/utils";

export const BRAND = {
  name: "רימקס טאבו נכסים",
  tagline: "עם הצלחה לא מתווכחים",
};

/** The office logo (RE/MAX balloon + wordmark). The artwork has a white background. */
export function BrandLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo.png"
      alt={`RE/MAX ${BRAND.name}`}
      width={1211}
      height={384}
      priority={priority}
      className={cn("h-auto w-full", className)}
    />
  );
}
