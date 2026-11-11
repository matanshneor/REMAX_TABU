import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimization files and the app manifest (phones fetch it signed out).
    // The calendar feed is fetched by phone calendars, which never sign in (a token guards it).
    // The ad tool is open without signing in (it is its own site, reached through a rewrite).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|api/calendar/|ad-tool|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
