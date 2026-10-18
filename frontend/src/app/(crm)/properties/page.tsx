import { Suspense } from "react";
import { PropertiesView } from "@/components/properties/properties-view";

// Content depends on the signed-in user and the URL, so it renders on the client.
export const instant = false;

export default function PropertiesPage() {
  return (
    <Suspense>
      <PropertiesView />
    </Suspense>
  );
}
