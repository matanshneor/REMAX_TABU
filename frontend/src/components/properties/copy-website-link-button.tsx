"use client";

import { LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Property } from "@/lib/types";
import { websiteLink } from "@/lib/website";

/**
 * Copies the link that opens the public site with this listing first. Shown only for properties
 * that are on the site (the manager's active listings); for any other property there is no button.
 */
export function CopyWebsiteLinkButton({ property }: { property: Property }) {
  const link = websiteLink(property);
  if (!link) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        navigator.clipboard.writeText(link).then(
          () => toast.success("הקישור לאתר הועתק"),
          () => toast.error("לא הצלחנו להעתיק. אפשר לסמן ולהעתיק את הקישור ידנית: " + link),
        )
      }
    >
      <LinkIcon />
      העתקת קישור לאתר
    </Button>
  );
}
