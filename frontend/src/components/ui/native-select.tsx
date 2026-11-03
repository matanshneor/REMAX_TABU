import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Native <select> styled like shadcn inputs — reliable keyboard + RTL behaviour. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        data-slot="native-select"
        className="h-8 w-full appearance-none pointer-coarse:h-11 rounded-lg border border-input bg-background ps-2.5 pe-8 text-base outline-none md:text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { NativeSelect };
