import { NextResponse } from "next/server";

import {
  AnthropicNotConfiguredError,
  CLAUDE_MODEL,
  getAnthropic,
  isAnthropicConfigured,
} from "@/lib/anthropic";
import { buildOptimizationRequest, parseGoal } from "@/lib/optimize";
import { getPrompt } from "@/lib/prompts";
import { getSessionUserOrNull } from "@/lib/session";

/**
 * Streaming endpoint for prompt optimization (DIG-31).
 *
 * POST { goal } → a `text/plain` stream of the rewritten prompt (and, after a
 * sentinel line, the model's explanation). Streaming keeps long rewrites under
 * request timeouts and lets the UI render tokens as they arrive. Owner-scoped:
 * only the prompt's owner can optimize it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUserOrNull();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      { error: "AI optimization isn’t configured on this server." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const prompt = await getPrompt(user.id, id);
  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  let goal;
  try {
    goal = parseGoal((await request.json())?.goal);
  } catch {
    goal = null;
  }
  if (!goal) {
    return NextResponse.json({ error: "Invalid goal" }, { status: 400 });
  }

  const { system, messages } = buildOptimizationRequest(prompt.body, goal);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Stream the rewrite so long outputs don't hit request timeouts and
        // tokens reach the browser as they're generated (DIG-31).
        const completion = getAnthropic().messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: 8000,
          system,
          messages,
        });
        for await (const event of completion) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (error) {
        // Headers are already sent, so surface the failure by erroring the
        // stream — the client's reader rejects and shows a retry message.
        controller.error(
          error instanceof AnthropicNotConfiguredError
            ? new Error("AI optimization isn’t configured on this server.")
            : error,
        );
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
