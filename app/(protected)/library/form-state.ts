/**
 * Shared form-state contract for the prompt CRUD actions and forms. Kept out of
 * `actions.ts` because a `"use server"` module may only export async functions —
 * not the type or the constant below.
 */

/** Typed result consumed by `useActionState` in the prompt forms. */
export type FormState = {
  ok: boolean;
  /** Form-level error message (e.g. an ownership failure). */
  error?: string;
  /** Per-field validation messages keyed by field name. */
  fieldErrors?: Record<string, string[] | undefined>;
};

export const INITIAL_FORM_STATE: FormState = { ok: true };
