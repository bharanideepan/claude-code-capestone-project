# DevPulse

Developer analytics dashboard that surfaces commit frequency, pull request stats, and team activity across GitHub repositories. Built for engineering teams who want visibility into their own development patterns without leaving their workflow.

---

## Quick Start

Get a local instance running in under 5 minutes.

**Prerequisites:** Node.js 20+, pnpm 9+, PostgreSQL 15+

```bash
# 1. Clone and install
git clone <repo-url> devpulse && cd devpulse
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, GITHUB_TOKEN, and SESSION_SECRET (see below)

# 3. Create the database and run migrations
pnpm db:migrate

# 4. (Optional) Seed demo data
pnpm db:seed

# 5. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), register an account, and connect a GitHub repository.

### Minimum .env values

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/devpulse?schema=public"
GITHUB_TOKEN="ghp_your_personal_access_token"   # repo scope required
SESSION_SECRET="a-random-string-of-at-least-32-characters"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Generate a session secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## What DevPulse Does

- **Connect GitHub repos** — link any public or private repo your token can access.
- **Sync metrics** — pulls 90 days of commit history and PR activity from the GitHub API.
- **Visualise trends** — commit frequency, PR open/merge/close rates, and contributor counts over time.
- **Team summary** — aggregate view across all connected repos with a top-activity leaderboard.

### What it is not

- Not a GitHub replacement (no code browsing, no issue management)
- Not multi-tenant SaaS (one user account per instance in v1)
- Not real-time (metrics refresh on demand or on a schedule)
- Not a CI/CD tool (no build status, no deployment tracking)

---

## Architecture

```
Browser
  │
  ▼
Next.js 15 App Router (app/)
  ├── (auth)/          — login, register pages (server components)
  ├── (dashboard)/     — dashboard, settings pages (server + client components)
  └── api/             — REST API route handlers
        ├── auth/      — register, login, logout, session
        ├── repos/     — list, connect, disconnect, sync
        ├── metrics/   — per-repo time-series data
        └── dashboard/ — aggregated cross-repo summary
          │
          ▼
lib/ (server utilities)
  ├── auth.ts          — session management, bcrypt helpers
  ├── github.ts        — GitHub REST API client
  ├── rate-limit.ts    — sliding-window in-process rate limiter
  └── db.ts            — Prisma client singleton
          │
          ▼
PostgreSQL (via Prisma)
  ├── users
  ├── sessions
  ├── repositories
  └── metrics
```

### Request flow

1. User connects a repo via the Settings UI.
2. `POST /api/repos/connect` validates input, calls `lib/github.ts → getRepoInfo()`, and persists the repo record.
3. `POST /api/repos/[repoId]/sync` fetches commits and PRs for the last 90 days (or since `lastSyncedAt`) and upserts daily `Metric` rows.
4. Dashboard queries aggregate from the `metrics` table — never directly from GitHub at render time.

### Database schema

| Model | Key fields |
|-------|-----------|
| `User` | `id`, `email`, `passwordHash` |
| `Session` | `id`, `userId`, `token`, `expiresAt` (sliding 30-day window) |
| `Repository` | `id`, `githubId`, `owner`, `name`, `userId`, `syncStatus`, `lastSyncedAt` |
| `Metric` | `id`, `repoId`, `date`, `commits`, `prsOpened`, `prsMerged`, `prsClosed`, `contributors`, `additions`, `deletions` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Database | PostgreSQL + Prisma 6 |
| Auth | Custom session tokens (bcrypt + crypto.randomBytes) |
| Validation | Zod |
| Testing | Vitest + React Testing Library + Supertest |
| CI | GitHub Actions (lint → type-check → test → build → audit) |

---

## Scripts

```bash
pnpm dev              # Start development server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # ESLint
pnpm type-check       # TypeScript (no emit)
pnpm test             # Run all tests
pnpm test:coverage    # Tests with V8 coverage report (≥80% enforced)
pnpm test:watch       # Vitest watch mode

pnpm db:migrate       # Apply pending Prisma migrations
pnpm db:seed          # Seed demo data
pnpm db:studio        # Open Prisma Studio (GUI)
pnpm db:reset         # Drop and recreate local database
```

---

## Project Structure

```
devpulse/
├── app/
│   ├── (auth)/                   # Login + register pages
│   ├── (dashboard)/              # Dashboard + settings pages
│   ├── api/                      # API route handlers
│   └── layout.tsx
├── components/
│   ├── ui/                       # Button, Input, Card, Badge
│   ├── charts/                   # CommitFrequencyChart, PRStatChart, ContributorTrendChart
│   ├── dashboard/                # MetricsSummary, ActivityFeed, DashboardContent
│   ├── settings/                 # ConnectRepoForm, ConnectedReposList, RepoCard
│   └── layout/                   # Navbar, Sidebar, PageWrapper
├── lib/
│   ├── auth.ts                   # Session helpers, password hashing
│   ├── config.ts                 # Environment variable validation
│   ├── db.ts                     # Prisma client singleton
│   ├── github.ts                 # GitHub REST API client
│   ├── rate-limit.ts             # In-process sliding-window rate limiter
│   └── session-cookie.ts         # Client-side session token helpers
├── hooks/
│   ├── use-dashboard.ts          # Dashboard data fetching hook
│   └── use-repos.ts              # Repository list hook
├── types/index.ts                # Zod schemas + shared types
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── __tests__/                    # Mirrors source tree
└── .github/workflows/ci.yml
```

---

## API

See [docs/API.md](docs/API.md) for the full endpoint reference with request/response examples.

---

## Security

See [docs/SECURITY-AUDIT.md](docs/SECURITY-AUDIT.md) for the most recent security audit.

Key controls in place:
- bcrypt (cost 12) password hashing
- 256-bit cryptographically random session tokens with 30-day sliding expiry
- Rate limiting on all auth endpoints (10 req/15 min login, 5 req/hr register)
- Zod validation on all request bodies
- IDOR ownership checks on every repo/metrics route
- Security headers on all responses (CSP, X-Frame-Options, etc.)
- No raw SQL — all queries use Prisma parameterised statements

Open findings (MEDIUM): session cookie is not HttpOnly; no explicit CORS policy. See the audit for remediation guidance.

---

## Development Guide

### TDD is non-negotiable

Write the test before the implementation. The cycle is red → green → refactor. CI blocks merges below 80% line coverage.

### Adding a new API route

1. Write the test in `__tests__/api/<group>/<name>.test.ts`
2. Implement the handler in `app/api/<group>/<name>/route.ts`
3. Export only `GET | POST | PUT | DELETE` from the route file
4. Validate all request bodies with a Zod schema in `types/index.ts`
5. Call `requireSession()` before any state-changing operation

### Adding a new component

1. Write the test in `__tests__/components/<group>/<name>.test.tsx`
2. Create the component in `components/<group>/<name>.tsx`
3. Default to server components; add `"use client"` only for interactivity or browser APIs

### Environment variables

Add new variables to `.env.example` with a placeholder. If required at startup, add a `required('VAR_NAME')` call in `lib/config.ts`.

---

## Contributing

1. Branch from `main`
2. Follow the TDD rule — tests before implementation
3. Run `pnpm lint && pnpm type-check && pnpm test:coverage` before pushing
4. The CI pipeline must be green before merge
