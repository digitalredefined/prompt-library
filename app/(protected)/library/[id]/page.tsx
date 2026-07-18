import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { DeletePromptButton } from "@/components/delete-prompt-button";
import { listFolders } from "@/lib/folders";
import { getPrompt } from "@/lib/prompts";
import { requireUser } from "@/lib/session";
import { deletePromptAction, setSharingAction } from "../actions";

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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <Link
        href="/library"
        className="text-foreground/50 hover:text-foreground w-fit text-sm transition-colors"
      >
        ← Library
      </Link>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{prompt.title}</h1>
        <Link
          href={`/library/${prompt.id}/edit`}
          className="border-foreground/15 hover:bg-foreground/5 shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Edit
        </Link>
      </div>

      <div className="text-foreground/50 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span>Updated {dateFmt.format(prompt.updatedAt)}</span>
        {folderName ? <span>Folder: {folderName}</span> : null}
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
