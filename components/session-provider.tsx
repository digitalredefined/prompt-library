"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Wraps the app so client components can read the session via `useSession`.
 * Server components should call `auth()` from `@/auth` instead.
 */
export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
