import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Runs before every non-static request: refreshes the Supabase session cookie,
 * gates the signed-in surfaces, and funnels half-onboarded users back into the
 * wizard. (Next 16 renamed the `middleware` convention to `proxy`.)
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — those never need a
     * session refresh and skipping them keeps navigation fast.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
