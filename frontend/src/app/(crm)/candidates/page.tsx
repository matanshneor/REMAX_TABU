import { Suspense } from "react";
import { CandidatesView } from "@/components/admin/candidates-view";
import { AdminOnly } from "@/components/shell/app-shell";

// Content depends on the signed-in user and the URL, so it renders on the client.
export const instant = false;

export default function Page() {
  return (
    <AdminOnly>
      <Suspense>
        <CandidatesView />
      </Suspense>
    </AdminOnly>
  );
}
