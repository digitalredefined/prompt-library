import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";

type SessionUser = NonNullable<Session["user"]>;

/**
 * Server-side session helpers. Import these from server components, layouts,
 * server actions, and route handlers — never expose them to the client.
 *
 * `getCurrentUser` is wrapped in React `cache` so multiple calls within the same
 * request (e.g. the header and a page both reading the session) hit the session
 * store once.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  return session?.user ?? null;
});

/**
 * Authoritative guard for pages / layouts / server actions: returns the signed-in
 * user or redirects to sign-in. Pass the current path as `callbackUrl` so the user
 * lands back where they started after authenticating.
 */
export async function requireUser(callbackUrl?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      callbackUrl
        ? `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : "/signin",
    );
  }
  return user;
}

/**
 * Guard for JSON API route handlers: returns the signed-in user, or `null` so the
 * caller can respond with 401 instead of issuing a browser redirect. Example:
 *
 *   const user = await getSessionUserOrNull();
 *   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export const getSessionUserOrNull = getCurrentUser;
