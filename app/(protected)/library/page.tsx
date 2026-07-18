import Link from "next/link";

import { requireUser } from "@/lib/session";

export const metadata = {
  title: "Library · Prompt Library",
};

export default async function LibraryPage() {
  // The (protected) layout already guards this route; re-reading here gives us
  // the signed-in user (and keeps the page safe if it's ever rendered outside
  // the group). `getCurrentUser` is request-cached, so this is not a second
  // round-trip.
  const user = await requireUser("/library");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <span className="text-foreground/50 text-sm font-medium tracking-wide uppercase">
          Library
        </span>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-foreground/70">
          This is your private prompt library. Prompt management arrives in the
          next milestone (M3).
        </p>
      </div>

      <div className="border-foreground/10 bg-foreground/[0.03] text-foreground/60 rounded-lg border p-4 text-sm">
        🚧 No prompts yet. Creating, organizing, and optimizing prompts lands in
        upcoming issues (DIG-14 onward).
      </div>

      <Link
        href="/account"
        className="text-foreground/70 hover:text-foreground w-fit text-sm underline underline-offset-4 transition-colors"
      >
        Account settings →
      </Link>
    </main>
  );
}
