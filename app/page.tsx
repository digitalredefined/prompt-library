import Link from "next/link";

import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-3">
        <span className="text-foreground/50 text-sm font-medium tracking-wide uppercase">
          Prompt Library
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Save, organize &amp; optimize your AI prompts.
        </h1>
        <p className="text-foreground/70 text-lg">
          A searchable library for your prompts — organize them into folders,
          categorize and tag them, and improve them with Claude.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <Link
            href="/library"
            className="bg-foreground text-background rounded-md px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Go to your library
          </Link>
        ) : (
          <Link
            href="/signin"
            className="bg-foreground text-background rounded-md px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Sign in to get started
          </Link>
        )}
      </div>

      <div className="border-foreground/10 bg-foreground/[0.03] text-foreground/60 rounded-lg border p-4 text-sm">
        🚧 Under construction. Auth is wired up (M2); the prompt library,
        organization, search, and AI optimization arrive in the milestones that
        follow.
      </div>
    </main>
  );
}
