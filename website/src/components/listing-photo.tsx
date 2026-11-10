import Image from "next/image";
import { photoUrl } from "@/lib/listings";
import { cn, Logo } from "./ui";

/** A listing photo, or the branded stand-in when the listing has none yet. Fills its parent. */
export function ListingPhoto({
  path,
  alt,
  sizes,
  priority,
  className,
}: {
  path: string | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!path) return <PhotoPlaceholder />;
  return <Image src={photoUrl(path)} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
}

export function PhotoPlaceholder({ label = "תמונות בקרוב" }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-panel to-night">
      <div className="absolute inset-4 border border-line" aria-hidden="true" />
      <Logo className="w-2/5 max-w-56 opacity-60" />
      <span className="label-caps">{label}</span>
    </div>
  );
}
