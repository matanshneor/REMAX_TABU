import Image from "next/image";
import { photoUrl } from "@/lib/listings";
import { FadeImage } from "./motion/fade-image";
import { cn, Logo } from "./ui";

/**
 * A listing photo, or the branded stand-in when the listing has none yet. Fills its parent.
 * `eager` is for photos on the first screen (loaded at once, shown at once); the rest load as
 * they come near and fade in.
 */
export function ListingPhoto({
  path,
  alt,
  sizes,
  eager,
  className,
}: {
  path: string | undefined;
  alt: string;
  sizes: string;
  eager?: boolean;
  className?: string;
}) {
  if (!path) return <PhotoPlaceholder />;
  const src = photoUrl(path);
  const cls = cn("object-cover", className);
  return eager ? (
    <Image src={src} alt={alt} fill sizes={sizes} loading="eager" className={cls} />
  ) : (
    <FadeImage src={src} alt={alt} fill sizes={sizes} className={cls} />
  );
}

export function PhotoPlaceholder({ label = "תמונות בקרוב" }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-panel to-night">
      <div className="absolute inset-4 border border-line" aria-hidden="true" />
      <Logo className="h-auto w-2/5 max-w-56 opacity-60" />
      {label && <span className="label-caps">{label}</span>}
    </div>
  );
}
