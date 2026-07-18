import Link from "next/link";

import { signOut } from "@/auth";
import { getCurrentUser } from "@/lib/session";

/**
 * App header. Server component: reads the session via the shared (request-cached)
 * `getCurrentUser` helper and renders sign-in / sign-out. Sign-out is a server
 * action.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-foreground/10 flex items-center justify-between border-b px-6 py-3">
      <Link href="/" className="font-semibold tracking-tight">
        Prompt Library
      </Link>

      <div className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <Link
              href="/library"
              className="text-foreground/70 hover:text-foreground font-medium transition-colors"
            >
              Library
            </Link>
            <Link
              href="/account"
              className="text-foreground/70 hover:text-foreground font-medium transition-colors"
            >
              {user.name ?? user.email}
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="border-foreground/15 hover:bg-foreground/5 rounded-md border px-3 py-1.5 font-medium transition-colors"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/signin"
            className="bg-foreground text-background rounded-md px-3 py-1.5 font-medium transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
