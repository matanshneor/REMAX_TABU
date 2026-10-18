import { Suspense } from "react";
import { BuyersView } from "@/components/buyers/buyers-view";

// Content depends on the signed-in user and the URL, so it renders on the client.
export const instant = false;

export default function BuyersPage() {
  return (
    <Suspense>
      <BuyersView />
    </Suspense>
  );
}
