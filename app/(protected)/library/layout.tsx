import { FolderSidebar } from "@/components/folder-sidebar";
import { listFoldersWithCounts } from "@/lib/folders";
import { countPrompts } from "@/lib/prompts";
import { requireUser } from "@/lib/session";

/**
 * Library shell (DIG-22): renders the folder-tree sidebar alongside every
 * library route so folder navigation persists across the list, detail, and
 * edit views. Fetches the owner-scoped folder tree with per-folder prompt
 * counts, plus the totals for the "All prompts" and "Unfiled" rows.
 */
export const dynamic = "force-dynamic";

export default async function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/library");
  const [folders, totalCount, unfiledCount] = await Promise.all([
    listFoldersWithCounts(user.id),
    countPrompts(user.id),
    countPrompts(user.id, { folderId: null }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
      <FolderSidebar
        folders={folders}
        totalCount={totalCount}
        unfiledCount={unfiledCount}
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
