# Prompt Library

A Next.js web app to **save, organize, categorize, and optimize AI prompts**.
Save prompts into a searchable library, organize them into nested folders,
categorize and tag them, search across everything, and improve them with Claude.

## Stack

| Concern   | Choice                                      |
| --------- | ------------------------------------------- |
| Framework | Next.js (App Router, TypeScript)            |
| UI        | Tailwind CSS + shadcn/ui                    |
| DB / ORM  | Postgres + Prisma                           |
| Auth      | Auth.js (NextAuth)                          |
| AI        | Anthropic Claude API (optimization feature) |
| Hosting   | Vercel                                      |

## Getting started

Requirements: **Node.js 20+**, npm, and **Docker** (for the local database).

```bash
npm install                 # install dependencies
cp .env.example .env        # then adjust values if needed
npm run db:up               # start local Postgres (docker-compose)
npm run db:migrate          # apply migrations to the local DB
npm run dev                 # start the dev server at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000). Edit `app/page.tsx` and the
page hot-reloads.

## Database

Local development uses a Postgres container defined in `docker-compose.yml`.
Production uses a hosted Postgres provider (Neon is the intended target for
Vercel's serverless runtime) — set its connection string as `DATABASE_URL`.

The ORM is [Prisma](https://www.prisma.io/); the schema lives in
`prisma/schema.prisma` and the client singleton in `lib/prisma.ts`.

**Migration workflow**

```bash
npm run db:up          # start the local Postgres container
npm run db:migrate     # create + apply a migration (prisma migrate dev)
npm run db:generate    # regenerate the Prisma client
npm run db:seed        # run the seed script (prisma/seed.ts)
npm run db:studio      # open Prisma Studio to browse data
npm run db:reset       # drop, re-migrate, and re-seed (destructive)
npm run db:deploy      # apply migrations in CI/production (prisma migrate deploy)
npm run db:down        # stop the local Postgres container
```

Migrations in `prisma/migrations/` are committed to the repo. The full data
model (User, Prompt, Folder, Category, Tag, PromptVersion) is defined in a later
issue; the current schema carries a placeholder model to bootstrap migrations.

## Scripts

| Script                 | What it does                      |
| ---------------------- | --------------------------------- |
| `npm run dev`          | Start the local dev server        |
| `npm run build`        | Production build                  |
| `npm run start`        | Serve the production build        |
| `npm run lint`         | Run ESLint                        |
| `npm run typecheck`    | Type-check with `tsc --noEmit`    |
| `npm run format`       | Format the codebase with Prettier |
| `npm run format:check` | Check formatting without writing  |

## Project structure

```
app/          # App Router routes, layouts, pages
components/    # Reusable UI components
lib/           # Shared utilities, clients, server logic
public/        # Static assets
```

Path alias: `@/*` maps to the repo root (e.g. `import { cn } from "@/lib/utils"`).

## Conventions

- **Language:** TypeScript in `strict` mode. Avoid `any`; prefer precise types.
- **Formatting:** Prettier is the source of truth (config in `.prettierrc.json`);
  Tailwind classes are auto-sorted. Run `npm run format` before committing.
- **Linting:** ESLint (`eslint-config-next`), with `eslint-config-prettier` last so
  it never fights the formatter.
- **Pre-commit:** Husky runs `lint-staged`, which lints + formats staged files.
  It runs automatically on `git commit` after `npm install` (via the `prepare`
  script). To bypass in an emergency: `git commit --no-verify`.
- **Imports:** use the `@/*` path alias instead of long relative paths.
- **Validation:** validate all external input with `zod` on server actions and
  route handlers.
- **Ownership:** scope every data query to the authenticated user and enforce
  ownership on reads and writes.
- **Secrets:** never commit secrets; use env vars documented in `.env.example`.
  The Anthropic API key is server-side only.

See [`CLAUDE.md`](./CLAUDE.md) for the full data model and milestone plan.

## Roadmap

Work is tracked in Linear (project **Prompt Library**, team **Digitalredefined**)
across milestones M1–M8. See [`CLAUDE.md`](./CLAUDE.md) for the full plan and
conventions.

- **M1 · Foundation & Setup** — scaffold, tooling, database, deploy pipeline
- **M2 · Auth & Users** — authentication, sessions, ownership
- **M3 · Core Prompt Management** — CRUD + versioning
- **M4 · Organization** — folders, categories, tags
- **M5 · Search & Discovery** — full-text search, filters, favorites
- **M6 · Prompt Optimization (AI)** — Claude-powered optimization
- **M7 · UX & Polish** — design system, responsive, dark mode
- **M8 · Testing & Deployment** — tests, QA, production launch
