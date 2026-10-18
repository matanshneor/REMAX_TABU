import { MyDealsView } from "@/components/deals/my-deals-view";

// Content depends on the signed-in user, so it renders on the client.
export const instant = false;

export default function DealsPage() {
  return <MyDealsView />;
}
