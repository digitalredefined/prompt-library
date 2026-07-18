import { notFound } from "next/navigation";

import { getSharedPrompt } from "@/lib/prompts";

export const metadata = {
  title: "Shared prompt · Prompt Library",
};

// Public, read-only view of a prompt shared via its unguessable slug (DIG-13).
// Lives outside the (protected) group and the proxy matcher, so no session is
// required. `getSharedPrompt` only returns prompts explicitly marked UNLISTED.
export default async function SharedPromptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prompt = await getSharedPrompt(slug);
  if (!prompt) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <span className="text-foreground/50 text-sm font-medium tracking-wide uppercase">
          Shared prompt
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{prompt.title}</h1>
        {prompt.ownerName ? (
          <p className="text-foreground/60 text-sm">
            Shared by {prompt.ownerName}
          </p>
        ) : null}
      </div>

      <pre className="border-foreground/10 bg-foreground/[0.03] overflow-x-auto rounded-lg border p-4 font-mono text-sm whitespace-pre-wrap">
        {prompt.body}
      </pre>

      {prompt.notes ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
            Notes
          </h2>
          <p className="text-foreground/80 text-sm whitespace-pre-wrap">
            {prompt.notes}
          </p>
        </section>
      ) : null}

      <p className="text-foreground/40 border-foreground/10 border-t pt-5 text-xs">
        This is a read-only shared prompt from Prompt Library.
      </p>
    </main>
  );
}
