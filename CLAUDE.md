# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository.

## What this is

**Prompt Library** — a Next.js web app to save, organize, categorize, and
optimize AI prompts. Users save prompts into a searchable library, organize them
into nested folders, categorize/tag them, search across everything, version their
changes, and improve prompts with Claude.

## Stack

- **Framework:** Next.js (App Router, TypeScript) — currently Next.js 16, React 19
- **UI:** Tailwind CSS (v4) + shadcn/ui (added in M7)
- **DB/ORM:** Postgres + Prisma (pinned to **Prisma 6.x** — Prisma 7 drops the
  classic `url = env(...)` datasource in favour of driver adapters; revisit later)
- **Auth:** Auth.js (NextAuth) with the Prisma adapter
- **AI:** Anthropic Claude API (server-side) for the optimization feature
- **Hosting:** Vercel

Stack choices are defaults from the project plan and may be revised per-issue.

## Commands

```bash
npm run dev        # dev server → http://localhost:3000
npm run build      # production build
npm run start      # serve production build
npm run lint       # ESLint (eslint-config-next)
npm run typecheck  # tsc --noEmit
```

Before committing non-trivial changes, run `npm run typecheck` and `npm run lint`.

## Project structure

```
app/          # App Router routes, layouts, pages, route handlers
components/    # Reusable UI components (shadcn/ui lives here once added)
lib/          # Shared utilities, DB client, server logic, API clients
public/       # Static assets
prisma/       # Prisma schema, migrations, and seed script (DIG-7)
```

- Path alias: **`@/*` → repo root** (e.g. `import { cn } from "@/lib/utils"`).
- **DB access:** import the shared client from `@/lib/prisma` (a hot-reload-safe
  singleton) — never instantiate `new PrismaClient()` in app code.
- Local Postgres runs via `docker-compose.yml`; `npm run db:*` scripts wrap the
  Prisma/Docker workflow (see README).
- `lib/utils.ts` currently ships a dependency-free `cn`; swap it for the
  clsx + tailwind-merge version when shadcn/ui is introduced (DIG-34).

## Conventions

- **TypeScript strict** everywhere. No `any` without a good reason.
- **Validation:** use `zod` for input validation on server actions / route handlers.
- **Ownership:** every prompt/folder/etc. query MUST be scoped to the authenticated
  user. Enforce ownership on every read and write (see DIG-13).
- **Secrets:** never commit secrets. All config goes through env vars, documented
  in `.env.example` and validated (zod) — see DIG-9. `.env*` is gitignored.
- **Server-side AI:** the Anthropic key is server-only. Never expose it to the client.
- Keep new code consistent with the surrounding style; prefer server components and
  server actions where they fit.

## Working an issue (agent workflow)

Work is organized as Linear issues (DIG-*). One issue = one focused change.

**Before editing:**

- Read the Linear issue, any linked spec, and the existing files you'll touch.
- Identify the acceptance criteria **and the non-goals** — what this issue explicitly does _not_ cover.
- Check how the codebase already solves similar problems; reuse those patterns instead of inventing new ones.
- Run `git status` first so unrelated in-progress work isn't disturbed.

**While editing:**

- Implement **only** the stated acceptance criteria. Nothing more.
- Don't change unrelated files. Don't refactor opportunistically — if you spot a worthwhile cleanup, note it as a follow-up issue rather than doing it here.
- Preserve existing behavior unless the issue explicitly changes it.
- Follow existing architecture, naming, and UI conventions.
- Add or update tests when the change affects logic, data flow, permissions, integrations, or user-visible behavior (see Testing below).

## Testing & verification

- **Never test a booking page automatically. Full stop.** Do not drive, submit, or otherwise interact with any live booking/reservation page via an automated test, headless browser, script, or agent-driven flow. Any exercise of a booking page must be done by a human, hands-on, with direct observation. **Why:** booking testing currently runs against the _production_ environment (no dev/staging exists), so any automated interaction risks pushing real, extraneous reservations into the live system. A human must be the one to submit — no exceptions, and never "just to verify it works."
- All _other_ testing may be automated (unit/integration DIG-38, Playwright E2E DIG-39). _(This Prompt Library app has no booking flow — the rule above is a standing guardrail carried into any project where a production booking page is in scope.)_
- Use the **narrowest useful verification command** for what you touched — don't lean on a broad suite when a targeted check proves the change.
- If a broad check is already failing for reasons unrelated to your change, say so plainly (in the PR) and include the targeted checks that _did_ pass. Don't let known-unrelated red hide a real regression.
- Before committing non-trivial changes: `npm run typecheck` and `npm run lint` (also noted under Commands).

## Pull requests

Review the diff for unrelated changes before opening. Every PR should explain:

- **What** changed and **why**
- The **Linear issue** it closes
- **Acceptance criteria** checked off
- **Screenshots / Loom / preview URL** when there's a UI or behavior change
- **Risk** and **how to test**
- **What was intentionally not done** (and any follow-up issues created)
- **Agent involvement** — what Claude did vs. what was hand-written

**Reviewing a PR:** review against the linked issue _only_. Flag acceptance-criteria gaps, bugs, broken data flow, scope creep, security issues, bad abstractions, and missing loading/error states. Don't suggest unrelated improvements unless they're severe. Group feedback as: **(1) Must fix before merge · (2) Should fix soon · (3) Safe to merge.**

## Data model (defined in DIG-8 — `prisma/schema.prisma`)

The schema is implemented. The Auth.js adapter models (`Account`, `Session`,
`VerificationToken`) are **already present** — DIG-11 wires up Auth.js against
them, it does not re-add them. Domain entities are owner-scoped with cascade on
user delete.

- **User** — linked to Auth.js.
- **Prompt** — title, body, notes, metadata, timestamps, `ownerId`, `folderId`.
- **Folder** — name, `parentId` (nesting), `ownerId`. Prevent reparent cycles.
- **Category** & **Tag** — many-to-many to Prompt. Categories support color/label.
- **PromptVersion** — snapshot of body + source (`manual` | `ai`) for history.

## Roadmap — Linear project "Prompt Library" (team Digitalredefined)

37 issues, DIG-5 → DIG-41, across 8 milestones. Work milestone by milestone.

- **M1 · Foundation & Setup** — DIG-5 scaffold ✅, DIG-6 tooling (ESLint/Prettier/
  Husky), DIG-7 Postgres+Prisma, DIG-8 schema, DIG-9 env/secrets, DIG-10 Vercel+CI.
- **M2 · Auth & Users** — DIG-11 Auth.js, DIG-12 sessions/protected routes,
  DIG-13 ownership & sharing model.
- **M3 · Core Prompt Management** — DIG-14 CRUD, DIG-15 form, DIG-16 list view,
  DIG-17 detail, DIG-18 delete, DIG-19 copy/quick actions, DIG-20 versioning.
- **M4 · Organization** — DIG-21 folder CRUD API, DIG-22 folder sidebar,
  DIG-23 move (drag & drop), DIG-24 categories/tags model, DIG-25 assign,
  DIG-26 filter.
- **M5 · Search & Discovery** — DIG-27 full-text search, DIG-28 sorting/filters,
  DIG-29 favorites.
- **M6 · Prompt Optimization (AI)** — DIG-30 Anthropic client, DIG-31 optimize flow,
  DIG-32 diff/review, DIG-33 save optimized version.
- **M7 · UX & Polish** — DIG-34 shadcn/ui + theming, DIG-35 responsive + dark mode,
  DIG-36 empty/loading/error states, DIG-37 shortcuts + command palette.
- **M8 · Testing & Deployment** — DIG-38 unit/integration tests, DIG-39 Playwright
  E2E, DIG-40 production deploy, DIG-41 docs/README.

Each Linear issue has acceptance criteria — treat them as the definition of done.
Use `mcp__claude_ai_Linear__get_issue` with the issue ID (e.g. `DIG-7`) to read them.

## Claude / Anthropic API notes

The optimization feature calls Claude server-side. When implementing it, default to
the latest capable model and consult the `claude-api` skill for current model IDs,
streaming, and pricing rather than relying on memory.
