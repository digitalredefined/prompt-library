import { Prisma, type Category } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

/**
 * Owner-scoped data-access layer for categories (DIG-24).
 *
 * Categories are a cross-cutting classification independent of folders: a named,
 * optionally-colored label reusable across many prompts (the Prompt↔Category
 * many-to-many is defined in the schema; assignment lands in DIG-25). Like
 * `lib/prompts` and `lib/folders`, this is the single door for reads/writes and
 * scopes every query by `ownerId`.
 *
 * Names are unique per owner (`@@unique([ownerId, name])`), so create/rename map
 * the Postgres unique-violation to a `DuplicateNameError` for friendly handling.
 * Deleting a category just removes its prompt associations (implicit join rows);
 * the prompts themselves are untouched.
 */

/** Thrown when a category name collides with an existing one for the owner. */
export class DuplicateNameError extends Error {
  constructor(message = "A category with that name already exists") {
    super(message);
    this.name = "DuplicateNameError";
  }
}

// --- Input validation -------------------------------------------------------

const nameSchema = z.string().trim().min(1, "Name is required").max(60);
const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #4F46E5")
  .nullish();

export const createCategorySchema = z.object({
  name: nameSchema,
  color: colorSchema,
});
export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

/** Map a Prisma unique-constraint violation to DuplicateNameError; rethrow rest. */
function rethrowDuplicate(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new DuplicateNameError();
  }
  throw error;
}

// --- Reads (owner-scoped) ---------------------------------------------------

/** List the user's categories, alphabetically. */
export function listCategories(userId: string): Promise<Category[]> {
  return prisma.category.findMany({
    where: { ownerId: userId },
    orderBy: { name: "asc" },
  });
}

/** Fetch one category the user owns, or null if missing / not theirs. */
export function getCategory(
  userId: string,
  id: string,
): Promise<Category | null> {
  return prisma.category.findFirst({ where: { id, ownerId: userId } });
}

// --- Writes (owner-scoped) --------------------------------------------------

/** Create a category owned by `userId`. Forces the owner to the caller. */
export async function createCategory(
  userId: string,
  input: CreateCategoryInput,
): Promise<Category> {
  const data = createCategorySchema.parse(input);
  try {
    return await prisma.category.create({
      data: { name: data.name, color: data.color ?? null, ownerId: userId },
    });
  } catch (error) {
    rethrowDuplicate(error);
  }
}

/**
 * Update a category the user owns (rename and/or recolor). Only provided fields
 * change; pass `color: null` to clear the color. Returns the updated row, or
 * null when no owned category matches `id`.
 */
export async function updateCategory(
  userId: string,
  id: string,
  input: UpdateCategoryInput,
): Promise<Category | null> {
  const data = updateCategorySchema.parse(input);
  const existing = await getCategory(userId, id);
  if (!existing) return null;

  const patch: Prisma.CategoryUpdateInput = {};
  if (data.name !== undefined) patch.name = data.name;
  if ("color" in data) patch.color = data.color ?? null;

  try {
    return await prisma.category.update({
      where: { id: existing.id },
      data: patch,
    });
  } catch (error) {
    rethrowDuplicate(error);
  }
}

/** Delete a category the user owns. Returns true if a row was removed. */
export async function deleteCategory(
  userId: string,
  id: string,
): Promise<boolean> {
  const { count } = await prisma.category.deleteMany({
    where: { id, ownerId: userId },
  });
  return count > 0;
}
