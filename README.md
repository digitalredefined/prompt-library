# Prompt Library

A Next.js web app to **save, organize, categorize, and optimize AI prompts**.
Save prompts into a searchable library, organize them into nested folders,
categorize and tag them, search across everything, and improve them with Claude.

## Stack

| Concern    | Choice                                      |
| ---------- | ------------------------------------------- |
| Framework  | Next.js (App Router, TypeScript)            |
| UI         | Tailwind CSS + shadcn/ui                     |
| DB / ORM   | Postgres + Prisma                           |
| Auth       | Auth.js (NextAuth)                          |
| AI         | Anthropic Claude API (optimization feature) |
| Hosting    | Vercel                                       |

## Getting started

Requirements: **Node.js 20+** and npm.

```bash
npm install       # install dependencies
npm run dev       # start the dev server at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000). Edit `app/page.tsx` and the
page hot-reloads.

## Scripts

| Script              | What it does                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Start the local dev server                |
| `npm run build`     | Production build                          |
| `npm run start`     | Serve the production build                |
| `npm run lint`      | Run ESLint                                |
| `npm run typecheck` | Type-check with `tsc --noEmit`            |

## Project structure

```
app/          # App Router routes, layouts, pages
components/    # Reusable UI components
lib/           # Shared utilities, clients, server logic
public/        # Static assets
```

Path alias: `@/*` maps to the repo root (e.g. `import { cn } from "@/lib/utils"`).

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
