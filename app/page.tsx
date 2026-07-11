export default function Home() {
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

      <div className="border-foreground/10 bg-foreground/[0.03] text-foreground/60 rounded-lg border p-4 text-sm">
        🚧 Under construction. This scaffold boots the Next.js + Tailwind
        foundation (M1). Auth, the prompt library, organization, search, and AI
        optimization arrive in the milestones that follow.
      </div>
    </main>
  );
}
