import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

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
  providers: [Google],
  trustHost:
    process.env.AUTH_TRUST_HOST === "true" || Boolean(process.env.VERCEL),
  pages: {
    signIn: "/signin",
  },
});
