import { clsx } from "clsx";
import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";
import type { Text } from "@/content/site";

export const cn = clsx;

/** The office logo for the dark background (cream wordmark, the office's name in red, the new balloon). Size it with className (a height plus w-auto, or a width plus h-auto). */
export function Logo({ className, preload, sizes = "240px" }: { className?: string; preload?: boolean; sizes?: string }) {
  return (
    <Image
      src="/logo-light.png"
      alt="RE/MAX טאבו נכסים"
      width={1200}
      height={470}
      sizes={sizes}
      preload={preload}
      className={className}
    />
  );
}

const BUTTON = {
  red: "bg-red text-white hover:bg-red-dark",
  outline: "border border-line-strong text-ink hover:border-ink-2 hover:bg-panel",
  panel: "bg-panel text-ink hover:bg-line",
} as const;

/** Pressed state for anything pressable: it gives a little under the finger, and comes back. */
export const PRESS = "transition-[color,background-color,border-color,scale] duration-(--dur-press) ease-out active:scale-[0.97]";

/** Buttons and button-looking links: at least 44px tall, straight corners. */
export function buttonClass(variant: keyof typeof BUTTON = "red", className?: string) {
  return cn(
    "inline-flex min-h-12 items-center justify-center gap-2.5 px-6 text-[15px] font-medium tracking-wide",
    PRESS,
    BUTTON[variant],
    className,
  );
}

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-8", className)} {...props} />;
}

/** Section heading: small spaced label above a light title. */
export function SectionTitle({ label, title, id, as: Tag = "h2" }: { label?: string; title: ReactNode; id?: string; as?: "h1" | "h2" }) {
  return (
    <div>
      {label && <p className="label-caps mb-3">{label}</p>}
      <Tag id={id} className="type-title">
        {title}
      </Tag>
    </div>
  );
}

/** Text Matan still needs to write: a marked placeholder until it's filled in (content/site.ts). */
export function Fill({ text, className }: { text: Text; className?: string }) {
  if (typeof text === "string") return <>{text}</>;
  return (
    <span className={cn("inline-block border border-dashed border-ink-3 px-2 py-0.5 text-ink-3", className)}>
      [להשלמה: {text.todo}]
    </span>
  );
}

export function NewTag({ className }: { className?: string }) {
  return <span className={cn("inline-block bg-red px-3 py-1.5 text-xs font-medium tracking-wider text-white", className)}>חדש בשוק</span>;
}
