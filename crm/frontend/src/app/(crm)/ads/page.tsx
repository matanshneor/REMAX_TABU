import { AdsView } from "@/components/ads/ads-view";

// Content depends on the signed-in user (agents see their own ads, the manager sees all), so it renders on the client.
export const instant = false;

export default function Page() {
  return <AdsView />;
}
