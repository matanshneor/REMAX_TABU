"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

/** The open side-panel record lives in `?open=<id>` so links (search, notifications) can open it. */
export function usePanelParam(): [string | null, (id: string | null) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const openId = params.get("open");

  const setOpenId = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (id) next.set("open", id);
      else next.delete("open");
      // Opening a record (e.g. the one just created) ends "new" mode too.
      next.delete("new");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, router, pathname],
  );

  return [openId, setOpenId];
}

/**
 * `?new=1` (e.g. from a link) opens the page's "add" form.
 * Returns [isOpen, setOpen]; closing also clears the parameter.
 */
export function useNewParam(): [boolean, (open: boolean) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fromUrl = params.get("new") === "1";
  const [local, setLocal] = useState(false);

  const setOpen = useCallback(
    (open: boolean) => {
      setLocal(open);
      if (!open && params.has("new")) {
        const next = new URLSearchParams(params.toString());
        next.delete("new");
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }
    },
    [params, router, pathname],
  );

  return [local || fromUrl, setOpen];
}
