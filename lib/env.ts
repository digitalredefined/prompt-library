import { z } from "zod";

/**
 * Typed, validated access to environment variables.
 *
 * Prefer importing `env` from `@/lib/env` for app-owned configuration so
 * missing/malformed values fail with a clear error. Framework integrations may
 * still read their standard environment variables directly when that avoids
 * build-time coupling.
 *
 * Variables that a given feature needs are marked optional here until the
 * milestone that introduces the feature makes them required (see comments).
 * Set `SKIP_ENV_VALIDATION=1` to bypass validation (e.g. for lint/typecheck
 * steps in CI that never touch the database).
 */
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // --- Database (required) ---
    DATABASE_URL: z.url(),

    // --- Auth.js (required from M2 / DIG-11 onward) ---
    // Generate a secret with `npx auth secret` or `openssl rand -base64 32`.
    AUTH_SECRET: z.string().min(1).optional(),
    // Compatibility aliases accepted by Auth.js / older NextAuth docs.
    NEXTAUTH_SECRET: z.string().min(1).optional(),
    AUTH_GOOGLE_ID: z.string().min(1).optional(),
    AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
    // Canonical app URL for production OAuth callbacks, e.g. https://example.com.
    AUTH_URL: z.url().optional(),
    NEXTAUTH_URL: z.url().optional(),
    // Required behind some proxies if Auth.js cannot infer the trusted host.
    AUTH_TRUST_HOST: z.enum(["true", "false"]).optional(),

    // --- Anthropic Claude API (required from M6 / DIG-30 onward) ---
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") {
      return;
    }

    if (!env.AUTH_SECRET && !env.NEXTAUTH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message:
          "Required in production. Set AUTH_SECRET (preferred) or NEXTAUTH_SECRET in your Vercel Environment Variables.",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  if (process.env.SKIP_ENV_VALIDATION) {
    return process.env as unknown as Env;
  }

  // Treat empty strings as "unset" so an optional var left blank in .env (e.g.
  // AUTH_GOOGLE_ID="" before OAuth is configured) reads as undefined rather
  // than failing a min-length check.
  const source = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== ""),
  );

  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map(
        (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      )
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${details}\n\nCheck your .env against .env.example.`,
    );
  }

  return parsed.data;
}

export const env = parseEnv();
