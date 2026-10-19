import { AgentsView } from "@/components/admin/agents-view";
import { AdminOnly } from "@/components/shell/app-shell";

// Content depends on the signed-in user, so it renders on the client.
export const instant = false;

export default function Page() {
  return (
    <AdminOnly>
      <AgentsView />
    </AdminOnly>
  );
}
