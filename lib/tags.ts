import { Prisma, type Tag } from "@prisma/client";
import { z } from "zod";

import { DuplicateNameError } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

/**
 * Owner-scoped data-access layer for tags (DIG-24).
 *
 * Tags are free-form, cross-cutting labels (no color) reusable across prompts —
 * the lightweight sibling of categories. Like the rest of the data layer, every
 * query is scoped by `ownerId`, and names are unique per owner
 * (`@@unique([ownerId, name])`), so create/rename surface a `DuplicateNameError`
 * (shared with categories) on collision. Deleting a tag only detaches it from
 * its prompts.
 *
 * Because tags are typically created on the fly while tagging a prompt (DIG-25),
 * `upsertTag` returns the existing tag when the name is already taken instead of
 * erroring — handy for "create-or-reuse" from a tag input.
 */

export { DuplicateNameError };

const nameSchema = z.string().trim().min(1, "Name is required").max(50);

export const createTagSchema = z.object({ name: nameSchema });
export type CreateTagInput = z.infer<typeof createTagSchema>;

function rethrowDuplicate(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new DuplicateNameError("A tag with that name already exists");
  }
  throw error;
}

// --- Reads (owner-scoped) ---------------------------------------------------

/** List the user's tags, alphabetically. */
export function listTags(userId: string): Promise<Tag[]> {
  return prisma.tag.findMany({
    where: { ownerId: userId },
    orderBy: { name: "asc" },
  });
}

/** Fetch one tag the user owns, or null if missing / not theirs. */
export function getTag(userId: string, id: string): Promise<Tag | null> {
  return prisma.tag.findFirst({ where: { id, ownerId: userId } });
}

// --- Writes (owner-scoped) --------------------------------------------------

/** Create a tag owned by `userId`. Throws DuplicateNameError on a name clash. */
export async function createTag(
  userId: string,
  input: CreateTagInput,
): Promise<Tag> {
  const data = createTagSchema.parse(input);
  try {
    return await prisma.tag.create({
      data: { name: data.name, ownerId: userId },
    });
  } catch (error) {
    rethrowDuplicate(error);
  }
}

/**
 * Create a tag, or return the owner's existing tag of that name — the
 * "create-or-reuse" path for tagging prompts (DIG-25). Never throws on a
 * duplicate name.
 */
export async function upsertTag(
  userId: string,
  input: CreateTagInput,
): Promise<Tag> {
  const data = createTagSchema.parse(input);
  return prisma.tag.upsert({
    where: { ownerId_name: { ownerId: userId, name: data.name } },
    update: {},
    create: { name: data.name, ownerId: userId },
  });
}

/** Rename a tag the user owns. Returns the updated row, or null if not theirs. */
export async function renameTag(
  userId: string,
  id: string,
  name: string,
): Promise<Tag | null> {
  const nextName = nameSchema.parse(name);
  const existing = await getTag(userId, id);
  if (!existing) return null;
  try {
    return await prisma.tag.update({
      where: { id: existing.id },
      data: { name: nextName },
    });
  } catch (error) {
    rethrowDuplicate(error);
  }
}

/** Delete a tag the user owns. Returns true if a row was removed. */
export async function deleteTag(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.tag.deleteMany({
    where: { id, ownerId: userId },
  });
  return count > 0;
}
