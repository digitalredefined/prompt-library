import type { DefaultSession } from "next-auth";

/**
 * Module augmentation so `session.user.id` is available and typed everywhere.
 *
 * We run the Prisma adapter with the "database" session strategy; the `session`
 * callback in `auth.ts` copies the user id onto `session.user`. Keeping the rest
 * of `DefaultSession["user"]` (name / email / image) preserves the standard shape.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
