import { requireUser } from "@/lib/session";

/**
 * Authoritative guard for every route in the (protected) group. Middleware does
 * an optimistic cookie check on the edge; this layout validates the session
 * against the database and redirects to sign-in when there is no signed-in user.
 *
 * `force-dynamic` because auth depends on per-request cookies and must never be
 * prerendered as a static (unauthenticated) shell.
 */
export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return children;
}
