import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export type TypedClient = ReturnType<typeof createBrowserClient<Database>>;

let client: TypedClient | undefined;

export function createClient(): TypedClient {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return client;
}
