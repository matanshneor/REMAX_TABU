import { AccountView } from "@/components/account/account-view";

// Content depends on the signed-in user and the URL, so it renders on the client.
export const instant = false;

export default function AccountPage() {
  return <AccountView />;
}
