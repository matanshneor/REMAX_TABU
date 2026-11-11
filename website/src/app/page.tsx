import type { Metadata } from "next";
import { HomeContent } from "@/components/home-content";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage({ searchParams }: PageProps<"/">) {
  return <HomeContent searchParams={searchParams} />;
}
