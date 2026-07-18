import { randomBytes } from "node:crypto";

import {
  Prisma,
  PromptSource,
  PromptVisibility,
  type Prompt,
  type PromptVersion,
} from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

/**
 * Owner-scoped data-access layer for prompts (DIG-13).
 *
 * This module is the single door through which prompts are read and written.
 * Every function takes the authenticated user's id and scopes every query by
 * `ownerId`, so ownership is enforced structurally rather than remembered at
 * each call site:
 *
 * - Reads only ever match rows the user owns (`where: { id, ownerId }`).
 * - Creates force `ownerId` to the caller — a client-supplied owner is ignored.
 * - Updates/deletes go through `updateMany`/`deleteMany` scoped by
 *   `{ id, ownerId }`, so a user can never mutate another user's row (a
 *   mismatched id simply affects zero rows).
 * - Related references (e.g. `folderId`) are verified to belong to the same
 *   user before being linked.
 *
 * The one deliberate exception is `getSharedPrompt`, which resolves a prompt by
 * its unguessable `shareSlug` for read-only public access (see DIG-13's
 * foundational sharing model). It is not owner-scoped by design, but only
 * returns prompts explicitly marked `UNLISTED`.
 *
 * DIG-14 (prompt CRUD) calls these from route handlers/server actions after
 * resolving the user with `requireUser()`; folders, categories, and tags follow
 * the same pattern in their own milestones.
 */

/** Thrown when an input references another entity the user does not own. */
export class OwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnershipError";
  }
}

// --- Input validation -------------------------------------------------------

const metadataSchema = z.record(z.string(), z.unknown());

export const createPromptSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().min(1, "Body is required"),
  notes: z.string().max(2000).nullish(),
  folderId: z.string().min(1).nullish(),
  metadata: metadataSchema.nullish(),
});

export const updatePromptSchema = createPromptSchema.partial();

export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;

/** Public, read-only projection returned for shared (UNLISTED) prompts. */
export type SharedPrompt = {
  id: string;
  title: string;
  body: string;
  notes: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  ownerName: string | null;
};

// --- Helpers ----------------------------------------------------------------

/**
 * Ensure `folderId` (when provided) belongs to `userId`. Prevents a user from
 * filing a prompt into someone else's folder. A null/undefined folder is the
 * library root and always allowed.
 */
async function assertFolderOwned(
  userId: string,
  folderId: string | null | undefined,
): Promise<void> {
  if (!folderId) return;
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, ownerId: userId },
    select: { id: true },
  });
  if (!folder) {
    throw new OwnershipError("Folder not found");
  }
}

/** Generate an unguessable, URL-safe slug for a share link. */
function generateShareSlug(): string {
  return randomBytes(12).toString("base64url");
}

// --- Reads (owner-scoped) ---------------------------------------------------

/** List the user's prompts, newest first. Optionally filter to one folder. */
export function listPrompts(
  userId: string,
  options: { folderId?: string | null; skip?: number; take?: number } = {},
): Promise<Prompt[]> {
  return prisma.prompt.findMany({
    where: {
      ownerId: userId,
      // `folderId: undefined` means "no filter"; `null` means the root level.
      ...(options.folderId !== undefined ? { folderId: options.folderId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    skip: options.skip,
    take: options.take,
  });
}

/** Count the user's prompts (for pagination), optionally within one folder. */
export function countPrompts(
  userId: string,
  options: { folderId?: string | null } = {},
): Promise<number> {
  return prisma.prompt.count({
    where: {
      ownerId: userId,
      ...(options.folderId !== undefined ? { folderId: options.folderId } : {}),
    },
  });
}

/** Fetch one prompt the user owns, or null if it doesn't exist / isn't theirs. */
export function getPrompt(userId: string, id: string): Promise<Prompt | null> {
  return prisma.prompt.findFirst({ where: { id, ownerId: userId } });
}

// --- Writes (owner-scoped) --------------------------------------------------

/**
 * Create a prompt owned by `userId`. Ignores any caller-supplied owner and
 * captures an initial version snapshot (DIG-20). `source` marks whether the
 * content is a manual edit or an AI optimization (M6).
 */
export async function createPrompt(
  userId: string,
  input: CreatePromptInput,
  source: PromptSource = PromptSource.MANUAL,
): Promise<Prompt> {
  const data = createPromptSchema.parse(input);
  await assertFolderOwned(userId, data.folderId);

  return prisma.prompt.create({
    data: {
      title: data.title,
      body: data.body,
      notes: data.notes ?? null,
      folderId: data.folderId ?? null,
      ownerId: userId,
      // Omit when absent so the column defaults to NULL; cast the object to
      // Prisma's JSON input type when present.
      ...(data.metadata != null
        ? { metadata: data.metadata as Prisma.InputJsonValue }
        : {}),
      // Initial history entry, atomic with the prompt row.
      versions: {
        create: {
          title: data.title,
          body: data.body,
          notes: data.notes ?? null,
          source,
        },
      },
    },
  });
}

/**
 * Update a prompt the user owns. Returns the updated row, or null when no owned
 * prompt matches `id` (not found or not theirs — indistinguishable by design).
 */
export async function updatePrompt(
  userId: string,
  id: string,
  input: UpdatePromptInput,
  source: PromptSource = PromptSource.MANUAL,
): Promise<Prompt | null> {
  const data = updatePromptSchema.parse(input);
  if ("folderId" in data) {
    await assertFolderOwned(userId, data.folderId);
  }

  // Fetch first so ownership is enforced (foreign id → null) and we can detect
  // whether the saved content actually changed before snapshotting a version.
  const existing = await getPrompt(userId, id);
  if (!existing) return null;

  const nextTitle = data.title ?? existing.title;
  const nextBody = data.body ?? existing.body;
  const nextNotes =
    data.notes !== undefined ? (data.notes ?? null) : existing.notes;
  const contentChanged =
    nextTitle !== existing.title ||
    nextBody !== existing.body ||
    nextNotes !== existing.notes;

  // Build the patch explicitly so only provided fields change.
  const patch: Prisma.PromptUncheckedUpdateInput = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.body !== undefined) patch.body = data.body;
  if (data.notes !== undefined) patch.notes = data.notes ?? null;
  if ("folderId" in data) patch.folderId = data.folderId ?? null;
  if (data.metadata !== undefined) {
    patch.metadata =
      data.metadata === null
        ? Prisma.DbNull
        : (data.metadata as Prisma.InputJsonValue);
  }

  // Snapshot the newly-saved content as a version when it changed (DIG-20).
  if (contentChanged) {
    patch.versions = {
      create: { title: nextTitle, body: nextBody, notes: nextNotes, source },
    };
  }

  // Ownership already verified above, so update by id (atomic with the snapshot).
  return prisma.prompt.update({ where: { id: existing.id }, data: patch });
}

/** Delete a prompt the user owns. Returns true if a row was removed. */
export async function deletePrompt(
  userId: string,
  id: string,
): Promise<boolean> {
  const { count } = await prisma.prompt.deleteMany({
    where: { id, ownerId: userId },
  });
  return count > 0;
}

// --- Sharing (foundational read-only links) ---------------------------------

/**
 * Enable read-only sharing for an owned prompt: mark it UNLISTED and assign a
 * share slug (kept stable if already shared). Returns the prompt with its slug,
 * or null if the user doesn't own it.
 */
export async function enableSharing(
  userId: string,
  id: string,
): Promise<Prompt | null> {
  const existing = await getPrompt(userId, id);
  if (!existing) return null;

  return prisma.prompt.update({
    where: { id: existing.id },
    data: {
      visibility: PromptVisibility.UNLISTED,
      shareSlug: existing.shareSlug ?? generateShareSlug(),
    },
  });
}

/** Disable sharing for an owned prompt: back to PRIVATE, slug cleared. */
export async function disableSharing(
  userId: string,
  id: string,
): Promise<Prompt | null> {
  const { count } = await prisma.prompt.updateMany({
    where: { id, ownerId: userId },
    data: { visibility: PromptVisibility.PRIVATE, shareSlug: null },
  });
  if (count === 0) return null;
  return getPrompt(userId, id);
}

/**
 * Resolve a prompt by its share slug for public, read-only access. NOT
 * owner-scoped — that is the whole point of a share link — but only returns
 * prompts explicitly marked UNLISTED, and exposes a minimal projection.
 */
export async function getSharedPrompt(
  shareSlug: string,
): Promise<SharedPrompt | null> {
  const prompt = await prisma.prompt.findFirst({
    where: { shareSlug, visibility: PromptVisibility.UNLISTED },
    select: {
      id: true,
      title: true,
      body: true,
      notes: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { name: true } },
    },
  });
  if (!prompt) return null;

  const { owner, ...rest } = prompt;
  return { ...rest, ownerName: owner.name };
}

// --- Version history (DIG-20) ----------------------------------------------

/** List an owned prompt's versions, newest first. Empty if not owned. */
export async function listPromptVersions(
  userId: string,
  promptId: string,
): Promise<PromptVersion[]> {
  const prompt = await getPrompt(userId, promptId);
  if (!prompt) return [];
  return prisma.promptVersion.findMany({
    where: { promptId },
    orderBy: { createdAt: "desc" },
  });
}

/** Fetch one version of an owned prompt, or null if not owned / not found. */
export async function getPromptVersion(
  userId: string,
  promptId: string,
  versionId: string,
): Promise<PromptVersion | null> {
  const prompt = await getPrompt(userId, promptId);
  if (!prompt) return null;
  return prisma.promptVersion.findFirst({
    where: { id: versionId, promptId },
  });
}

/**
 * Restore an owned prompt to a previous version: apply that version's content
 * and record the restore as a new MANUAL version, so history stays append-only.
 * Returns the updated prompt, or null if the prompt/version isn't owned/found.
 */
export async function restorePromptVersion(
  userId: string,
  promptId: string,
  versionId: string,
): Promise<Prompt | null> {
  const version = await getPromptVersion(userId, promptId, versionId);
  if (!version) return null;

  return prisma.prompt.update({
    where: { id: promptId },
    data: {
      title: version.title,
      body: version.body,
      notes: version.notes,
      versions: {
        create: {
          title: version.title,
          body: version.body,
          notes: version.notes,
          source: PromptSource.MANUAL,
        },
      },
    },
  });
}
