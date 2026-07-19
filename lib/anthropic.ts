import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";

/**
 * Server-side Anthropic Claude client (DIG-30).
 *
 * The AI features (prompt optimization, M6) call Claude from the server so the
 * API key is never exposed to the browser — this module is only ever imported
 * from route handlers and server actions, never a client component.
 *
 * Like the Prisma client, a single instance is reused across hot reloads in
 * development so we don't leak connections/agents on every edit.
 */

/** Model used for AI features. Default to the latest capable Opus (see CLAUDE.md). */
export const CLAUDE_MODEL = "claude-opus-4-8";

/**
 * Thrown when an AI feature is invoked but no API key is configured. Callers map
 * this to a friendly "AI isn't set up" message rather than a 500 — the key is
 * optional in `lib/env` so the app builds and runs without AI configured.
 */
export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super(
      "The Anthropic API key is not configured. Set ANTHROPIC_API_KEY to enable AI features.",
    );
    this.name = "AnthropicNotConfiguredError";
  }
}

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

/**
 * Get the shared Anthropic client, or throw `AnthropicNotConfiguredError` when
 * no key is set. Keeping the guard here means every AI call site fails the same,
 * friendly way instead of the SDK throwing an opaque auth error mid-request.
 *
 * The SDK retries transient failures (429 rate limits and 5xx) with exponential
 * backoff automatically; `maxRetries` bumps that from the default 2 to 3 to ride
 * out brief rate-limit spikes on the single shared org key.
 */
export function getAnthropic(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new AnthropicNotConfiguredError();
  }
  const client =
    globalForAnthropic.anthropic ??
    new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 3 });

  if (process.env.NODE_ENV !== "production") {
    globalForAnthropic.anthropic = client;
  }
  return client;
}

/** Whether AI features are configured (an API key is present). */
export function isAnthropicConfigured(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}
