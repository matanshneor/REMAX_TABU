import { MyDealsView } from "@/components/deals/my-deals-view";
import { AdminOnly } from "@/components/shell/app-shell";

// Deals are the manager's screen; agents don't see it in the menu either.
// Content depends on the signed-in user, so it renders on the client.
export const instant = false;

export default function DealsPage() {
  return (
    <AdminOnly>
      <MyDealsView />
    </AdminOnly>
  );
}
