import Link from "next/link";
import { notFound } from "next/navigation";

import { PromptForm } from "@/components/prompt-form";
import { listFolders } from "@/lib/folders";
import { getPrompt } from "@/lib/prompts";
import { requireUser } from "@/lib/session";
import { updatePromptAction } from "../../actions";

export const metadata = {
  title: "Edit prompt · Prompt Library",
};

export default async function EditPromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/library/${id}/edit`);
  const [prompt, folders] = await Promise.all([
    getPrompt(user.id, id),
    listFolders(user.id),
  ]);

  if (!prompt) notFound();

  // Bind the prompt id so the form's action matches the (prev, formData) shape.
  const action = updatePromptAction.bind(null, prompt.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <Link
          href={`/library/${prompt.id}`}
          className="text-foreground/50 hover:text-foreground w-fit text-sm transition-colors"
        >
          ← Back to prompt
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit prompt</h1>
      </div>

      <PromptForm
        action={action}
        folders={folders}
        initial={{
          title: prompt.title,
          body: prompt.body,
          notes: prompt.notes,
          folderId: prompt.folderId,
        }}
        submitLabel="Save changes"
        cancelHref={`/library/${prompt.id}`}
      />
    </main>
  );
}
