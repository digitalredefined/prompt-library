"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/session";
import {
  OwnershipError,
  createPrompt,
  deletePrompt,
  disableSharing,
  enableSharing,
  updatePrompt,
} from "@/lib/prompts";
import type { FormState } from "./form-state";

/**
 * Prompt CRUD server actions (DIG-14).
 *
 * Each action resolves the authenticated user with `requireUser()` and delegates
 * to the owner-scoped data-access layer (`lib/prompts`), which enforces ownership
 * and validates input with zod. Failures are mapped to a typed `FormState` so
 * forms can render field- and form-level errors; on success the mutating actions
 * revalidate and redirect.
 */

/** Pull the prompt fields out of a submitted form. */
function readPromptForm(formData: FormData) {
  const folderId = (formData.get("folderId") as string | null)?.trim();
  const notes = (formData.get("notes") as string | null)?.trim();
  return {
    title: ((formData.get("title") as string | null) ?? "").trim(),
    body: (formData.get("body") as string | null) ?? "",
    notes: notes ? notes : null,
    // Empty string from the "No folder" option means the library root.
    folderId: folderId ? folderId : null,
  };
}

/** Map thrown errors from the data layer into a typed FormState. */
function toFormState(error: unknown): FormState {
  if (error instanceof z.ZodError) {
    return { ok: false, fieldErrors: error.flatten().fieldErrors };
  }
  if (error instanceof OwnershipError) {
    return { ok: false, error: error.message };
  }
  throw error;
}

export async function createPromptAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  let newId: string;
  try {
    const prompt = await createPrompt(user.id, readPromptForm(formData));
    newId = prompt.id;
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath("/library");
  redirect(`/library/${newId}`);
}

export async function updatePromptAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  try {
    const updated = await updatePrompt(user.id, id, readPromptForm(formData));
    if (!updated) {
      return { ok: false, error: "Prompt not found." };
    }
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath("/library");
  revalidatePath(`/library/${id}`);
  redirect(`/library/${id}`);
}

export async function deletePromptAction(id: string): Promise<void> {
  const user = await requireUser();
  await deletePrompt(user.id, id);
  revalidatePath("/library");
  redirect("/library");
}

export async function setSharingAction(
  id: string,
  enabled: boolean,
): Promise<void> {
  const user = await requireUser();
  if (enabled) {
    await enableSharing(user.id, id);
  } else {
    await disableSharing(user.id, id);
  }
  revalidatePath(`/library/${id}`);
}
