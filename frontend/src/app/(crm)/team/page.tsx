import { TeamView } from "@/components/team/team-view";

// Content depends on the signed-in user (admins can edit the list), so it renders on the client.
export const instant = false;

export default function Page() {
  return <TeamView />;
}
