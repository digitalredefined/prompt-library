import Link from "next/link";
import { notFound } from "next/navigation";

import { getPrompt, listPromptVersions } from "@/lib/prompts";
import { requireUser } from "@/lib/session";

export const metadata = {
  title: "Version history · Prompt Library",
};

const dateFmt = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function PromptHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/library/${id}/history`);
  const prompt = await getPrompt(user.id, id);
  if (!prompt) notFound();

  const versions = await listPromptVersions(user.id, id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <Link
          href={`/library/${prompt.id}`}
          className="text-foreground/50 hover:text-foreground w-fit text-sm transition-colors"
        >
          ← {prompt.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Version history</h1>
        <p className="text-foreground/60 text-sm">
          {versions.length} {versions.length === 1 ? "version" : "versions"}
        </p>
      </div>

      <ol className="flex flex-col gap-2">
        {versions.map((version, index) => (
          <li
            key={version.id}
            className="border-foreground/10 flex items-center justify-between gap-3 rounded-lg border p-4"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {dateFmt.format(version.createdAt)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    version.source === "AI"
                      ? "bg-foreground/10 text-foreground/70"
                      : "border-foreground/20 text-foreground/50 border"
                  }`}
                >
                  {version.source === "AI" ? "AI" : "Manual"}
                </span>
                {index === 0 ? (
                  <span className="text-foreground/40 text-[11px]">
                    (current)
                  </span>
                ) : null}
              </div>
              <span className="text-foreground/50 line-clamp-1 text-xs">
                {version.body}
              </span>
            </div>
            <Link
              href={`/library/${prompt.id}/history/${version.id}`}
              className="border-foreground/15 hover:bg-foreground/5 shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            >
              View
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
