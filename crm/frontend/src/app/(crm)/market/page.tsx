import { Suspense } from "react";
import { MarketView } from "@/components/market/market-view";

// Content depends on the signed-in user and the URL, so it renders on the client.
export const instant = false;

export default function MarketPage() {
  return (
    <Suspense>
      <MarketView />
    </Suspense>
  );
}
