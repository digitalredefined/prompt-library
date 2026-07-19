import Link from "next/link";
import { notFound } from "next/navigation";

import { OptimizePanel } from "@/components/optimize-panel";
import { isAnthropicConfigured } from "@/lib/anthropic";
import { getPrompt } from "@/lib/prompts";
import { requireUser } from "@/lib/session";

export const metadata = {
  title: "Optimize · Prompt Library",
};

export default async function OptimizePromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/library/${id}/optimize`);
  const prompt = await getPrompt(user.id, id);
  if (!prompt) notFound();

  const configured = isAnthropicConfigured();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <Link
          href={`/library/${prompt.id}`}
          className="text-foreground/50 hover:text-foreground w-fit text-sm transition-colors"
        >
          ← {prompt.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Optimize with AI</h1>
        <p className="text-foreground/60 text-sm">
          Claude rewrites this prompt to work better with AI models. Review the
          changes before saving — nothing changes until you accept.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
          Current prompt
        </h2>
        <pre className="border-foreground/10 bg-foreground/[0.03] max-h-64 overflow-auto rounded-lg border p-4 font-mono text-sm whitespace-pre-wrap">
          {prompt.body}
        </pre>
      </section>

      {configured ? (
        <OptimizePanel
          promptId={prompt.id}
          originalBody={prompt.body}
          title={prompt.title}
        />
      ) : (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          AI optimization isn’t configured on this server. Set an{" "}
          <code className="font-mono">ANTHROPIC_API_KEY</code> to enable it.
        </p>
      )}
    </main>
  );
}
