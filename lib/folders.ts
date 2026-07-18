import type { Folder } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { OwnershipError } from "@/lib/prompts";

/**
 * Owner-scoped data-access layer for folders (DIG-21).
 *
 * Like `lib/prompts`, this module is the single door through which folders are
 * read and written. Every function takes the authenticated user's id and scopes
 * every query by `ownerId`, so ownership is enforced structurally rather than
 * remembered at each call site:
 *
 * - Reads only ever match rows the user owns (`where: { id, ownerId }`).
 * - Creates force `ownerId` to the caller — a client-supplied owner is ignored.
 * - Updates/deletes verify ownership first (or go through `deleteMany` scoped by
 *   `{ id, ownerId }`), so a user can never mutate another user's row.
 * - A referenced `parentId` is verified to belong to the same user before being
 *   linked, and reparenting is checked for cycles (see `moveFolder`).
 *
 * Nesting is modelled by the self-relation on `Folder` (`parentId`). The schema
 * cascades on delete so orphans re-root automatically (see `deleteFolder`):
 * `Folder.parentId` and `Prompt.folderId` both use `onDelete: SetNull`, so a
 * deleted folder's child folders move up to the root and its prompts move to the
 * library root — no manual reassignment needed.
 */

// --- Input validation -------------------------------------------------------

const folderNameSchema = z.string().trim().min(1, "Name is required").max(120);

export const createFolderSchema = z.object({
  name: folderNameSchema,
  parentId: z.string().min(1).nullish(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;

/** Thrown when reparenting a folder would create a cycle in the tree. */
export class FolderCycleError extends Error {
  constructor(
    message = "A folder cannot be moved into itself or a descendant",
  ) {
    super(message);
    this.name = "FolderCycleError";
  }
}

// --- Helpers ----------------------------------------------------------------

/**
 * Ensure `parentId` (when provided) names a folder owned by `userId`. A
 * null/undefined parent is the root level and always allowed.
 */
async function assertParentOwned(
  userId: string,
  parentId: string | null | undefined,
): Promise<void> {
  if (!parentId) return;
  const parent = await prisma.folder.findFirst({
    where: { id: parentId, ownerId: userId },
    select: { id: true },
  });
  if (!parent) {
    throw new OwnershipError("Parent folder not found");
  }
}

/**
 * True when `candidateParentId` is `folderId` itself or one of its descendants,
 * i.e. making it the folder's parent would create a cycle. Walks up the ancestor
 * chain from the candidate parent to the root; if it reaches `folderId`, that
 * folder is above the candidate in the tree, so the move would form a loop. The
 * walk is bounded by the tree depth and scoped to the user's own folders.
 */
async function wouldCreateCycle(
  userId: string,
  folderId: string,
  candidateParentId: string,
): Promise<boolean> {
  let cursor: string | null = candidateParentId;
  while (cursor) {
    if (cursor === folderId) return true;
    const parent: { parentId: string | null } | null =
      await prisma.folder.findFirst({
        where: { id: cursor, ownerId: userId },
        select: { parentId: true },
      });
    cursor = parent?.parentId ?? null;
  }
  return false;
}

// --- Reads (owner-scoped) ---------------------------------------------------

/** List all of the user's folders, alphabetically. */
export function listFolders(userId: string): Promise<Folder[]> {
  return prisma.folder.findMany({
    where: { ownerId: userId },
    orderBy: { name: "asc" },
  });
}

/** Fetch one folder the user owns, or null if it doesn't exist / isn't theirs. */
export function getFolder(userId: string, id: string): Promise<Folder | null> {
  return prisma.folder.findFirst({ where: { id, ownerId: userId } });
}

/** A folder plus the number of prompts filed directly in it (not descendants). */
export type FolderWithCount = Folder & { promptCount: number };

/**
 * List the user's folders (alphabetical) with a direct prompt count each, for
 * the sidebar tree (DIG-22). The count is the prompts filed directly in the
 * folder, not a rollup of descendants.
 */
export async function listFoldersWithCounts(
  userId: string,
): Promise<FolderWithCount[]> {
  const rows = await prisma.folder.findMany({
    where: { ownerId: userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { prompts: true } } },
  });
  return rows.map(({ _count, ...folder }) => ({
    ...folder,
    promptCount: _count.prompts,
  }));
}

// --- Writes (owner-scoped) --------------------------------------------------

/**
 * Create a folder owned by `userId`. Ignores any caller-supplied owner and
 * verifies the parent (when given) belongs to the same user.
 */
export async function createFolder(
  userId: string,
  input: CreateFolderInput,
): Promise<Folder> {
  const data = createFolderSchema.parse(input);
  await assertParentOwned(userId, data.parentId);

  return prisma.folder.create({
    data: {
      name: data.name,
      parentId: data.parentId ?? null,
      ownerId: userId,
    },
  });
}

/**
 * Rename a folder the user owns. Returns the updated row, or null when no owned
 * folder matches `id` (not found or not theirs — indistinguishable by design).
 */
export async function renameFolder(
  userId: string,
  id: string,
  name: string,
): Promise<Folder | null> {
  const nextName = folderNameSchema.parse(name);
  const { count } = await prisma.folder.updateMany({
    where: { id, ownerId: userId },
    data: { name: nextName },
  });
  if (count === 0) return null;
  return getFolder(userId, id);
}

/**
 * Move a folder under a new parent (or to the root when `parentId` is null).
 * Verifies the folder and the target parent are both owned by the user, and
 * rejects moves that would create a cycle (into itself or one of its
 * descendants). Returns the updated folder, or null if the folder isn't owned.
 */
export async function moveFolder(
  userId: string,
  id: string,
  parentId: string | null,
): Promise<Folder | null> {
  const folder = await getFolder(userId, id);
  if (!folder) return null;

  if (parentId) {
    await assertParentOwned(userId, parentId);
    if (parentId === id || (await wouldCreateCycle(userId, id, parentId))) {
      throw new FolderCycleError();
    }
  }

  return prisma.folder.update({
    where: { id: folder.id },
    data: { parentId: parentId ?? null },
  });
}

/**
 * Delete a folder the user owns. Thanks to `onDelete: SetNull` on the schema's
 * self-relation and on `Prompt.folderId`, the folder's child folders re-root to
 * the top level and its prompts move to the library root automatically — nothing
 * is cascade-deleted. Returns true if a row was removed.
 */
export async function deleteFolder(
  userId: string,
  id: string,
): Promise<boolean> {
  const { count } = await prisma.folder.deleteMany({
    where: { id, ownerId: userId },
  });
  return count > 0;
}
