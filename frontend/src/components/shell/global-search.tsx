"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ENTITY_META, groupResults, resultHref, useGlobalSearch } from "./search";

/** Top search bar: typing shows a quick dropdown, Enter goes to the full results page. */
export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const deferred = useDeferredValue(q);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data = [], isFetching } = useGlobalSearch(deferred, 4);

  // "/" anywhere (outside a text field) jumps to the search box.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || target.closest("input, textarea, select, [contenteditable=true]")) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showDropdown = open && q.trim().length >= 2;
  const flat = groupResults(data).flatMap(([, items]) => items);

  function go(href: string) {
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && flat[active]) go(resultHref(flat[active]));
      else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  let index = -1;
  return (
    <div className="relative w-full max-w-xl">
      <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder="חיפוש קונה, מוכר, טלפון, רחוב…"
        className="h-10 w-full rounded-xl border border-input bg-muted/60 ps-9 pe-3 text-base outline-none md:pe-10 md:text-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/30"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="global-search-results"
        aria-keyshortcuts="/"
      />
      <kbd className="pointer-events-none absolute end-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border md:block bg-background px-1.5 font-mono text-[11px] text-muted-foreground">
        /
      </kbd>
      {showDropdown && (
        <div
          id="global-search-results"
          role="listbox"
          // Keep focus in the input so the dropdown doesn't close before a click registers.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border bg-popover shadow-lg"
        >
          {flat.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">{isFetching ? "מחפש…" : "לא נמצאו תוצאות"}</p>
          ) : (
            groupResults(data).map(([entity, items]) => {
              const meta = ENTITY_META[entity];
              return (
                <div key={entity} className="py-1">
                  <p className="px-4 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">{meta?.label}</p>
                  {items.map((r) => {
                    index += 1;
                    const i = index;
                    const Icon = meta?.icon;
                    return (
                      <button
                        key={r.id}
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(resultHref(r))}
                        className={cn("flex w-full items-center gap-3 px-4 py-2 text-start", i === active && "bg-muted")}
                      >
                        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                        <span className="truncate text-sm font-medium">{r.title || "—"}</span>
                        <span className="truncate text-xs text-muted-foreground">{r.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
          <button
            onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}
            className="w-full border-t bg-muted/40 px-4 py-2 text-start text-xs text-muted-foreground hover:text-foreground"
          >
            הצג את כל התוצאות עבור &quot;{q.trim()}&quot; · Enter
          </button>
        </div>
      )}
    </div>
  );
}
