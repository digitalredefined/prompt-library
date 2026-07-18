"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  FolderCycleError,
  createFolder,
  deleteFolder,
  renameFolder,
} from "@/lib/folders";
import { OwnershipError } from "@/lib/prompts";
import { requireUser } from "@/lib/session";
import type { FormState } from "./form-state";

/**
 * Folder server actions (DIG-22) — thin wrappers over the owner-scoped folder
 * data-access layer (`lib/folders`, DIG-21). Each resolves the authenticated
 * user, delegates the write, revalidates `/library` so the sidebar re-renders,
 * and maps thrown errors to a typed `FormState` for inline display.
 */

/** Map thrown errors from the data layer into a typed FormState. */
function toFormState(error: unknown): FormState {
  if (error instanceof z.ZodError) {
    return { ok: false, fieldErrors: error.flatten().fieldErrors };
  }
  if (error instanceof OwnershipError || error instanceof FolderCycleError) {
    return { ok: false, error: error.message };
  }
  throw error;
}

export async function createFolderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const name = ((formData.get("name") as string | null) ?? "").trim();
  const parentId = (formData.get("parentId") as string | null)?.trim();

  try {
    await createFolder(user.id, { name, parentId: parentId ? parentId : null });
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath("/library");
  return { ok: true };
}

export async function renameFolderAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const name = ((formData.get("name") as string | null) ?? "").trim();

  try {
    const renamed = await renameFolder(user.id, id, name);
    if (!renamed) return { ok: false, error: "Folder not found." };
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath("/library");
  return { ok: true };
}

export async function deleteFolderAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteFolder(user.id, id);
  revalidatePath("/library");
}
