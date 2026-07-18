import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

const useSecureAuthCookies = process.env.NODE_ENV === "production";
const authCookiePrefix = useSecureAuthCookies ? "__Secure-" : "";
const authCheckCookieOptions = {
  httpOnly: true,
  sameSite: useSecureAuthCookies ? "none" : "lax",
  path: "/",
  secure: useSecureAuthCookies,
  maxAge: 60 * 15,
} as const;

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * - Prisma adapter persists users/accounts/sessions to Postgres (models defined
 *   in DIG-8). Session strategy is "database".
 * - Google is the sign-in provider; it reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
 *   from the environment. AUTH_SECRET must also be set (see .env.example).
 *
 * Import { auth } here for server-side session access; use the client hook
 * `useSession` (via the SessionProvider in the root layout) on the client.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      // Vercel callback requests have been losing/mangling the PKCE verifier
      // cookie, which causes Auth.js to reject otherwise valid Google OAuth
      // callbacks with InvalidCheck. Keep the CSRF state check while avoiding
      // the failing PKCE cookie round-trip for this confidential web client.
      checks: ["state"],
    }),
  ],
  cookies: {
    // OAuth check cookies must survive the cross-site Google -> app callback.
    // SameSite=None is only used for secure production deployments; local HTTP
    // development keeps Auth.js-compatible lax cookies.
    pkceCodeVerifier: {
      name: `${authCookiePrefix}authjs.pkce.code_verifier`,
      options: authCheckCookieOptions,
    },
    state: {
      name: `${authCookiePrefix}authjs.state`,
      options: authCheckCookieOptions,
    },
  },
  // Trust the host in local development (the dev server is local, so the Host
  // header is not attacker-controlled) and on Vercel; otherwise require an
  // explicit opt-in so a misconfigured proxy can't spoof the callback host.
  trustHost:
    process.env.NODE_ENV !== "production" ||
    process.env.AUTH_TRUST_HOST === "true" ||
    Boolean(process.env.VERCEL),
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    // Database sessions don't include the user id on `session.user` by default.
    // Surface it so server code can scope every query to the owner (DIG-13) and
    // so `session.user.id` is typed (see types/next-auth.d.ts).
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
