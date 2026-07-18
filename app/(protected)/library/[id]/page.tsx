import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/copy-button";
import { DeletePromptButton } from "@/components/delete-prompt-button";
import { listFolders } from "@/lib/folders";
import { getPrompt } from "@/lib/prompts";
import { requireUser } from "@/lib/session";
import { deletePromptAction, setSharingAction } from "../actions";

/** Render prompt metadata (free-form JSON object) as a simple key/value list. */
function metadataEntries(metadata: unknown): [string, string][] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  return Object.entries(metadata as Record<string, unknown>).map(([k, v]) => [
    k,
    typeof v === "string" ? v : JSON.stringify(v),
  ]);
}

const dateFmt = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/library/${id}`);
  const prompt = await getPrompt(user.id, id);
  if (!prompt) notFound();

  const folderName = prompt.folderId
    ? (await listFolders(user.id)).find((f) => f.id === prompt.folderId)?.name
    : null;

  const isShared = prompt.visibility === "UNLISTED" && prompt.shareSlug;
  let shareUrl: string | null = null;
  if (isShared) {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    shareUrl = `${proto}://${h.get("host")}/shared/${prompt.shareSlug}`;
  }

  const deleteAction = deletePromptAction.bind(null, prompt.id);
  const metadata = metadataEntries(prompt.metadata);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <Link
        href="/library"
        className="text-foreground/50 hover:text-foreground w-fit text-sm transition-colors"
      >
        ← Library
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{prompt.title}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <CopyButton
            text={prompt.body}
            label="Copy prompt"
            className="border-foreground/15 hover:bg-foreground/5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
          />
          <Link
            href={`/library/${prompt.id}/edit`}
            className="border-foreground/15 hover:bg-foreground/5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Edit
          </Link>
          <span
            title="AI optimization arrives in M6 (DIG-31)"
            className="border-foreground/10 text-foreground/40 cursor-not-allowed rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Optimize
          </span>
        </div>
      </div>

      <div className="text-foreground/50 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span>Updated {dateFmt.format(prompt.updatedAt)}</span>
        {folderName ? <span>Folder: {folderName}</span> : null}
        <Link
          href={`/library/${prompt.id}/history`}
          className="hover:text-foreground underline underline-offset-4 transition-colors"
        >
          Version history
        </Link>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
          Prompt
        </h2>
        <pre className="border-foreground/10 bg-foreground/[0.03] overflow-x-auto rounded-lg border p-4 font-mono text-sm whitespace-pre-wrap">
          {prompt.body}
        </pre>
      </section>

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

      {metadata.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
            Metadata
          </h2>
          <dl className="border-foreground/10 divide-foreground/10 divide-y rounded-lg border text-sm">
            {metadata.map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 px-4 py-2"
              >
                <dt className="text-foreground/60">{key}</dt>
                <dd className="font-mono text-xs">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="border-foreground/10 flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Read-only share link</span>
            <span className="text-foreground/50 text-xs">
              {isShared
                ? "Anyone with the link can view this prompt."
                : "Sharing is off — this prompt is private."}
            </span>
          </div>
          <form action={setSharingAction.bind(null, prompt.id, !isShared)}>
            <button
              type="submit"
              className="border-foreground/15 hover:bg-foreground/5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {isShared ? "Stop sharing" : "Create link"}
            </button>
          </form>
        </div>
        {shareUrl ? (
          <a
            href={shareUrl}
            className="text-foreground/70 hover:text-foreground truncate text-xs underline underline-offset-4"
          >
            {shareUrl}
          </a>
        ) : null}
      </section>

      <div className="border-foreground/10 flex items-center justify-between border-t pt-5">
        <DeletePromptButton action={deleteAction} />
      </div>
    </main>
  );
}
