import Link from "next/link";

import { PromptForm } from "@/components/prompt-form";
import { listCategories } from "@/lib/categories";
import { listFolders } from "@/lib/folders";
import { listTags } from "@/lib/tags";
import { requireUser } from "@/lib/session";
import { createPromptAction } from "../actions";

export const metadata = {
  title: "New prompt · Prompt Library",
};

export default async function NewPromptPage() {
  const user = await requireUser("/library/new");
  const [folders, categories, tags] = await Promise.all([
    listFolders(user.id),
    listCategories(user.id),
    listTags(user.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <Link
          href="/library"
          className="text-foreground/50 hover:text-foreground w-fit text-sm transition-colors"
        >
          ← Library
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New prompt</h1>
      </div>

      <PromptForm
        action={createPromptAction}
        folders={folders}
        categories={categories}
        tagSuggestions={tags.map((t) => t.name)}
        submitLabel="Create prompt"
        cancelHref="/library"
      />
    </main>
  );
}
