import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic auth gate for protected routes.
 *
 * Next.js 16 renamed the `middleware` file convention to `proxy`; this runs on
 * the edge for every request matched by `config.matcher`.
 *
 * We run Auth.js with the "database" session strategy, so this proxy (edge
 * runtime, no DB access) can't validate the session — it only checks for the
 * presence of the session cookie for a fast redirect. The authoritative check
 * lives in the protected route-group layout, which calls `requireUser()`
 * (see app/(protected)/layout.tsx and lib/session.ts).
 *
 * Auth.js names the cookie `authjs.session-token`, prefixed with `__Secure-`
 * over HTTPS (production).
 */
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export default function proxy(request: NextRequest) {
  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) =>
    request.cookies.has(name),
  );

  if (hasSessionCookie) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  const signInUrl = new URL("/signin", request.url);
  signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  // Only run on the authenticated areas of the app. Public routes (home,
  // /signin, static assets, the Auth.js API) are excluded by omission.
  matcher: ["/library/:path*", "/account/:path*"],
};
