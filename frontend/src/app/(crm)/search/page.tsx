import { Suspense } from "react";
import { SearchResults } from "@/components/shell/search-results";

// Content depends on the signed-in user and the URL, so it renders on the client.
export const instant = false;

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
