export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium uppercase tracking-wide text-foreground/50">
          Prompt Library
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Save, organize &amp; optimize your AI prompts.
        </h1>
        <p className="text-lg text-foreground/70">
          A searchable library for your prompts — organize them into folders,
          categorize and tag them, and improve them with Claude.
        </p>
      </div>

      <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-foreground/60">
        🚧 Under construction. This scaffold boots the Next.js + Tailwind
        foundation (M1). Auth, the prompt library, organization, search, and AI
        optimization arrive in the milestones that follow.
      </div>
    </main>
  );
}
