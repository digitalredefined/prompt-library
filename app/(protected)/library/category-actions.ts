"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DuplicateNameError, createCategory } from "@/lib/categories";
import { requireUser } from "@/lib/session";

/**
 * Create-a-category action for the prompt form (DIG-25). Categories are a
 * controlled vocabulary, so the form lets a user add one inline; this returns
 * the created category (or a friendly error) so the client can select it
 * immediately without a full round-trip through `useActionState`.
 */

export type CreateCategoryResult =
  | { ok: true; category: { id: string; name: string; color: string | null } }
  | { ok: false; error: string };

export async function createCategoryAction(
  name: string,
  color: string | null,
): Promise<CreateCategoryResult> {
  const user = await requireUser();
  try {
    const category = await createCategory(user.id, { name, color });
    revalidatePath("/library");
    return {
      ok: true,
      category: {
        id: category.id,
        name: category.name,
        color: category.color,
      },
    };
  } catch (error) {
    if (error instanceof DuplicateNameError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        error: error.issues[0]?.message ?? "Invalid category",
      };
    }
    throw error;
  }
}
