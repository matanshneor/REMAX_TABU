import Link from "next/link";
import { ViewTransition } from "react";
import { applyFilters, describeFilters, filtersHref, isFiltered, PAGE_SIZE, parseFilters } from "@/lib/filters";
import { firstName, whatsappToAgent } from "@/lib/contact";
import { getAgent, getListings } from "@/lib/data";
import { FilterForm } from "./filter-form";
import { LeadForm } from "./lead-form";
import { ListingCard } from "./listing-card";
import { Reveal } from "./motion/reveal";
import { buttonClass } from "./ui";

/** The list under the opening photo: search, results, "הצגת עוד", and the "not found" form. */
export async function ListingsSection({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, all, agent] = await Promise.all([searchParams, getListings(), getAgent()]);
  const f = parseFilters(params);
  const results = applyFilters(all, f);
  const shown = results.slice(0, f.n);
  const sorted = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "he"));
  const options = {
    hoods: sorted(all.map((l) => l.neighborhood)),
    cities: sorted(all.map((l) => l.city)),
    types: sorted(all.map((l) => l.property_type)),
  };
  const filtered = isFiltered(f);
  const first = firstName(agent.full_name);

  return (
    <>
      {/* The form and the results below are siblings: their keys must differ, or React keeps a stale copy of one. */}
      <FilterForm key={`form ${filtersHref(f)}`} filters={f} options={options} />

      {/* Results cross-fade when the search changes. "More" keeps the same block, so only the new cards arrive. */}
      <ViewTransition key={`results ${filtersHref({ ...f, n: PAGE_SIZE })}`} name="results" share="results-fade" default="none">
        <div>
          <div id="results" className="mt-12 flex scroll-mt-28 flex-wrap items-baseline justify-between gap-4">
            <p className="text-ink-2" role="status">
              {results.length === 0 ? "אין נכסים שמתאימים לחיפוש" : results.length === 1 ? "נכס אחד" : `${results.length} נכסים`}
              {filtered && results.length > 0 && <span className="text-ink-3"> · {describeFilters(f)}</span>}
            </p>
            {filtered && (
              <Link
                href="/#listings"
                transitionTypes={["filter"]}
                className="inline-flex min-h-11 items-center text-ink-2 underline decoration-line-strong underline-offset-8 transition-colors duration-(--dur-ui) hover:text-ink"
              >
                ניקוי החיפוש
              </Link>
            )}
          </div>

          {shown.length > 0 ? (
            <ul className="mt-8 grid gap-x-10 gap-y-16 sm:grid-cols-2">
              {shown.map((l, i) => (
                <Reveal as="li" key={l.id} index={i % 2}>
                  <ListingCard listing={l} eager={i < 2} />
                </Reveal>
              ))}
            </ul>
          ) : (
            <div className="mt-8 grid gap-10 border border-line p-6 sm:p-10 lg:grid-cols-2">
              <h3 className="accent-line type-title">לא מצאתם? צרו קשר</h3>
              <LeadForm
                defaultMessage={filtered ? `מחפשים: ${describeFilters(f)}` : ""}
                messageLabel="מה אתם מחפשים?"
                agentFirstName={first}
                whatsappHref={agent.phone ? whatsappToAgent(agent.phone, undefined, first) : null}
              />
            </div>
          )}

          {results.length > shown.length && (
            <div className="mt-16 flex justify-center">
              <Link
                href={filtersHref({ ...f, n: f.n + PAGE_SIZE })}
                scroll={false}
                transitionTypes={["filter"]}
                className={buttonClass("outline", "min-w-56")}
              >
                הצגת עוד נכסים ({results.length - shown.length})
              </Link>
            </div>
          )}
        </div>
      </ViewTransition>
    </>
  );
}

export function ListingsFallback() {
  return (
    <div aria-busy="true" aria-label="טוען נכסים">
      <div className="h-12 border border-line bg-panel/50 sm:h-64 lg:h-46" />
      <div className="mt-20 grid gap-x-10 gap-y-16 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="aspect-[4/3] animate-pulse bg-panel" />
            <div className="mt-6 h-8 w-2/3 animate-pulse bg-panel" />
          </div>
        ))}
      </div>
    </div>
  );
}
