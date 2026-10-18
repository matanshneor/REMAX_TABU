"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/crm/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ENTITY_META, groupResults, resultHref, useGlobalSearch } from "./search";

export function SearchResults() {
  const q = useSearchParams().get("q") ?? "";
  const { data = [], isLoading } = useGlobalSearch(q, 50);
  const groups = groupResults(data);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`תוצאות חיפוש: "${q}"`} count={data.length} />
      {q.trim().length < 2 ? (
        <EmptyState icon={<SearchIcon />} title="הקלד לפחות 2 תווים בשורת החיפוש" />
      ) : isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : groups.length === 0 ? (
        <EmptyState icon={<SearchIcon />} title="לא נמצאו תוצאות" hint="אפשר לחפש לפי שם, טלפון, אימייל, עיר, שכונה או רחוב." />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([entity, items]) => {
            const meta = ENTITY_META[entity];
            const Icon = meta?.icon;
            return (
              <section key={entity}>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                  {meta?.label} · {items.length}
                </h2>
                <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                  {items.map((r) => (
                    <li key={r.id}>
                      <Link href={resultHref(r)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                        {Icon && <Icon className="size-4 text-muted-foreground" />}
                        <span className="font-medium">{r.title || "—"}</span>
                        <span className="text-sm text-muted-foreground">{r.subtitle}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
