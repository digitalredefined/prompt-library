import Link from "next/link";

import { signOut } from "@/auth";
import { CommandMenu } from "@/components/command-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";

/**
 * App header. Server component: reads the session via the shared (request-cached)
 * `getCurrentUser` helper and renders sign-in / sign-out. Sign-out is a server
 * action. Uses shared shadcn primitives + a theme toggle (DIG-34/35).
 */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur sm:px-6">
      <Link href="/" className="font-semibold tracking-tight">
        Prompt Library
      </Link>

      <div className="flex items-center gap-1 text-sm sm:gap-2">
        {user ? (
          <>
            <CommandMenu />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/library">Library</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/account" className="max-w-[40vw] truncate">
                {user.name ?? user.email}
              </Link>
            </Button>
            <ThemeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </>
        ) : (
          <>
            <ThemeToggle />
            <Button size="sm" asChild>
              <Link href="/signin">Sign in</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
