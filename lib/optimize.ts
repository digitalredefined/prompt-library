/**
 * Prompt optimization with Claude (DIG-31).
 *
 * A meta-prompt asks Claude to rewrite a user's saved prompt to be clearer,
 * better-structured, and more effective, steered by a chosen goal. The model
 * returns the rewritten prompt followed by a short explanation of what changed,
 * separated by a sentinel line so a single streamed response carries both.
 *
 * This module is deliberately free of server-only imports (the Anthropic SDK,
 * env) so the goal list and the result parser can be shared with the client
 * review panel. The actual streaming call lives in the optimize route handler.
 */

/** Optimization goals the user can pick from (DIG-31). */
export const OPTIMIZATION_GOALS = [
  {
    id: "general",
    label: "General improvement",
    description: "Clarity, structure, and specificity all-round",
    instruction:
      "Improve the prompt's overall clarity, structure, and specificity while preserving its intent.",
  },
  {
    id: "clarity",
    label: "Clarity",
    description: "Remove ambiguity and tighten wording",
    instruction:
      "Focus on removing ambiguity and vague wording so the instructions are unmistakable.",
  },
  {
    id: "concise",
    label: "Concision",
    description: "Say the same thing in fewer words",
    instruction:
      "Focus on making the prompt more concise — cut redundancy and filler while keeping every instruction.",
  },
  {
    id: "examples",
    label: "Add examples",
    description: "Illustrate the desired output with examples",
    instruction:
      "Add one or two concrete illustrative examples of the desired input/output so the model has a clear target.",
  },
  {
    id: "specific",
    label: "More specific",
    description: "Add concrete constraints and detail",
    instruction:
      "Make the prompt more specific — add concrete constraints, formats, and success criteria the original leaves implicit.",
  },
] as const;

export type OptimizationGoalId = (typeof OPTIMIZATION_GOALS)[number]["id"];

const GOAL_IDS = OPTIMIZATION_GOALS.map((g) => g.id);

/** Narrow an arbitrary string (from the request body) to a valid goal id, or null. */
export function parseGoal(value: unknown): OptimizationGoalId | null {
  return typeof value === "string" &&
    GOAL_IDS.includes(value as OptimizationGoalId)
    ? (value as OptimizationGoalId)
    : null;
}

/**
 * Sentinel the model emits between the rewritten prompt and its explanation.
 * Kept distinctive so it won't collide with real prompt content, and parsed out
 * of the stream client-side (see `splitOptimizedResult`).
 */
export const EXPLANATION_MARKER = "===EXPLANATION===";

const SYSTEM_PROMPT = `You are an expert prompt engineer. You rewrite prompts that people save in their prompt library so they work better with large language models.

Rules:
- Preserve the original intent and any concrete details (names, formats, constraints). Never invent facts or change what the prompt is for.
- Return the rewritten prompt itself — not a description of it, and not wrapped in code fences or quotes.
- Keep any template placeholders (e.g. {{variable}}, [TOPIC], <input>) intact.
- After the rewritten prompt, output a line containing only ${EXPLANATION_MARKER}, then 1–3 short bullet points explaining what you changed and why.

Output format, exactly:
<the rewritten prompt>
${EXPLANATION_MARKER}
- <change 1>
- <change 2>`;

function buildUserMessage(body: string, goalId: OptimizationGoalId): string {
  const goal =
    OPTIMIZATION_GOALS.find((g) => g.id === goalId) ?? OPTIMIZATION_GOALS[0];
  return `Optimization goal: ${goal.label}. ${goal.instruction}

Here is the prompt to rewrite:

${body}`;
}

/**
 * Build the system prompt and messages for an optimization request. Pure (no
 * SDK dependency) so it can be unit-tested and kept client-safe; the route
 * handler feeds the result to the Anthropic client and streams the reply.
 */
export function buildOptimizationRequest(
  body: string,
  goalId: OptimizationGoalId,
): { system: string; messages: { role: "user"; content: string }[] } {
  return {
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(body, goalId) }],
  };
}

/** The rewritten prompt and its explanation, split out of the streamed text. */
export type OptimizedResult = {
  /** The rewritten prompt body (before the marker). */
  body: string;
  /** The model's explanation of what changed (after the marker), if any. */
  explanation: string;
};

/**
 * Split a full optimization response into the rewritten prompt and the
 * explanation on the sentinel line. Tolerant of a missing marker (treats the
 * whole thing as the body) so a truncated stream still yields a usable prompt.
 */
export function splitOptimizedResult(text: string): OptimizedResult {
  const idx = text.indexOf(EXPLANATION_MARKER);
  if (idx === -1) {
    return { body: text.trim(), explanation: "" };
  }
  return {
    body: text.slice(0, idx).trim(),
    explanation: text.slice(idx + EXPLANATION_MARKER.length).trim(),
  };
}
