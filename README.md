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
`prisma/schema.prisma` and the client singleton in `lib/prisma.ts`. Runtime
environment variables are validated by server code as features use them; the
Next.js config intentionally does not import app env validation so Vercel can
complete builds before runtime-only secrets are exercised.

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

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`:
formatting check → lint → typecheck → build. Automated tests slot into this
workflow in M8 (DIG-38/DIG-39). No database is required for CI (it runs with
`SKIP_ENV_VALIDATION=1`).

## Deployment (Vercel)

Preview and production deploys are handled by Vercel's Git integration once the
project is linked. First-time setup:

1. **Push to GitHub.** Create a repo and add it as `origin`:
   ```bash
   git remote add origin git@github.com:<owner>/<repo>.git
   git push -u origin main
   ```
2. **Import into Vercel.** In the Vercel dashboard: _Add New… → Project_ → import
   the GitHub repo. Framework preset auto-detects **Next.js**.
3. **Provision a production database** (e.g. a Neon Postgres) and copy its pooled,
   SSL connection string.
4. **Set environment variables** in Vercel _Project → Settings → Environment
   Variables_ (Production + Preview), per [`.env.example`](./.env.example):
   - `DATABASE_URL` (required)
   - `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (from M2). `AUTH_SECRET` is required in production; `NEXTAUTH_SECRET` is accepted as a legacy alias if already configured.
   - `AUTH_URL` (recommended in production; use your deployed `https://...` URL). `NEXTAUTH_URL` is accepted as a legacy alias if already configured.
   - `AUTH_TRUST_HOST` (set to `true` if Auth.js logs `UntrustedHost` / `Host must be trusted` behind Vercel or another proxy)
   - `ANTHROPIC_API_KEY` (from M6)
5. **Configure Google OAuth for deployed sign-in.** In Google Cloud Console, add your production origin (for example `https://your-domain.com`) and callback URL (`https://your-domain.com/api/auth/callback/google`). Keep the localhost origin/callback for local development.
6. **Run migrations against production** before/at deploy: `npm run db:deploy`
   (`prisma migrate deploy`) with the production `DATABASE_URL`.

Environment variable names are case-sensitive: use `DATABASE_URL` exactly, not `database_url`. For local development, put these values in `.env`. For deployed Vercel preview/production builds, put them in Vercel **Project → Settings → Environment Variables**; a local `.env` file is not uploaded to Vercel. If Vercel logs `MissingSecret: Please define a secret`, generate a value with `npx auth secret` or `openssl rand -base64 32`, add it as `AUTH_SECRET` in Vercel for the affected Production/Preview environment, then redeploy.

After linking, every PR gets a **preview deploy** and merges to `main` deploy to
**production** automatically.

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
