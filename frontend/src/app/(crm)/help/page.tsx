import { HelpView } from "@/components/help/help-view";

// Content depends on the signed-in user (admins also see the manager's part), so it renders on the client.
export const instant = false;

export default function Page() {
  return <HelpView />;
}
