# DevPulse — Formal Specification

**Version:** 1.0  
**Date:** 2026-05-12  
**Status:** Approved  

---

## Table of Contents

1. [Requirements](#1-requirements)
2. [Technical Design](#2-technical-design)
3. [Implementation Plan](#3-implementation-plan)
4. [Scope Boundaries](#4-scope-boundaries)
5. [Success Criteria](#5-success-criteria)
6. [Certification Rubric Cross-Reference](#6-certification-rubric-cross-reference)

---

## 1. Requirements

### 1.1 User Stories — Authentication

---

**US-01: Register an account**  
*As a developer, I want to create an account so I can save my connected repositories and preferences.*

Acceptance Criteria:
- [ ] User can submit email + password via a registration form
- [ ] Password must be at least 8 characters; shorter passwords show a field-level error
- [ ] Duplicate email shows: "An account with this email already exists"
- [ ] Successful registration creates a session and redirects to `/dashboard`
- [ ] Password is never stored in plaintext; only a bcrypt hash is persisted
- [ ] The API response never includes `passwordHash`

---

**US-02: Log in**  
*As a returning user, I want to log in so I can access my dashboard.*

Acceptance Criteria:
- [ ] User can submit email + password via a login form
- [ ] Invalid credentials show a generic message: "Invalid email or password" (no oracle for which field is wrong)
- [ ] Successful login returns a session token and redirects to `/dashboard`
- [ ] Session persists for 30 days with sliding expiry (each authenticated request refreshes it)

---

**US-03: Log out**  
*As a logged-in user, I want to log out so my session is revoked.*

Acceptance Criteria:
- [ ] Clicking "Log out" in the navbar sends a logout request
- [ ] The session token is deleted from the database immediately
- [ ] User is redirected to `/login` after logout
- [ ] Using the deleted token on any subsequent request returns 401

---

### 1.2 User Stories — Repository Management

---

**US-04: Connect a GitHub repository**  
*As a developer, I want to connect a GitHub repo so DevPulse can track its activity.*

Acceptance Criteria:
- [ ] User can enter `owner/repo` in a connect form on the Settings page
- [ ] If the repo does not exist on GitHub, show: "Repository not found on GitHub"
- [ ] If the repo is already connected, show: "Repository is already connected"
- [ ] On success, the repo appears in the sidebar with a PENDING sync badge
- [ ] Connecting a private repo works as long as the configured `GITHUB_TOKEN` has access

---

**US-05: View connected repositories**  
*As a developer, I want to see all my connected repos so I can manage them.*

Acceptance Criteria:
- [ ] Settings page lists all connected repos with: full name, privacy status, sync status badge, last synced time
- [ ] Sync status badge reflects current DB state: PENDING / SYNCING / SUCCESS / FAILED
- [ ] List is empty-state handled: "No repositories connected yet. Add one above."

---

**US-06: Sync a repository**  
*As a developer, I want to manually trigger a sync so I can get fresh metrics.*

Acceptance Criteria:
- [ ] "Sync now" button on each repo card triggers `POST /api/repos/[repoId]/sync`
- [ ] Badge changes to SYNCING during the request
- [ ] On success, badge shows SUCCESS and "Last synced" timestamp updates
- [ ] On GitHub rate limit, badge shows FAILED and a human-readable retry message appears
- [ ] On GitHub unavailable, badge shows FAILED and "GitHub is currently unreachable" is shown

---

**US-07: Disconnect a repository**  
*As a developer, I want to remove a repo so I can stop tracking it.*

Acceptance Criteria:
- [ ] "Disconnect" button on each repo card triggers a confirmation prompt
- [ ] On confirm, repo is removed from the sidebar and Settings list
- [ ] All metric data for that repo is also deleted (cascade)
- [ ] Action cannot be performed on another user's repo (returns 403)

---

### 1.3 User Stories — Dashboard & Analytics

---

**US-08: View commit frequency**  
*As a developer, I want to see how many commits were made over time so I can spot patterns.*

Acceptance Criteria:
- [ ] Dashboard shows a line chart of daily commit counts for the selected repo(s)
- [ ] Chart supports day / week / month granularity via a toggle
- [ ] X-axis shows dates; Y-axis shows commit count
- [ ] Empty state handled: "No commit data for this period"
- [ ] Selecting "All repos" aggregates commits across all connected repos

---

**US-09: View PR statistics**  
*As a developer, I want to see PR open/merge/close trends so I can understand delivery pace.*

Acceptance Criteria:
- [ ] Dashboard shows a stacked bar chart with PRs opened, merged, and closed per period
- [ ] Chart uses distinct colours for each series with a legend
- [ ] Granularity toggle (day / week / month) applies to this chart too
- [ ] Hovering a bar shows a tooltip with exact counts

---

**US-10: View contributor activity**  
*As a developer, I want to see contributor counts over time so I can understand team engagement.*

Acceptance Criteria:
- [ ] Dashboard shows an area chart of unique contributors per period
- [ ] Chart is rendered client-side via Recharts

---

**US-11: View summary metrics**  
*As a developer, I want to see totals at a glance so I can get a quick health check.*

Acceptance Criteria:
- [ ] Dashboard shows four metric cards: Total Commits, PRs Opened, PRs Merged, Active Contributors
- [ ] Each card shows the value for the selected date range
- [ ] Each card shows a delta percentage compared to the previous equivalent period (green = positive, red = negative)

---

**US-12: Filter by date range**  
*As a developer, I want to change the date range so I can focus on a specific period.*

Acceptance Criteria:
- [ ] Date range picker in the Activity Feed allows custom from/to dates
- [ ] Preset options: Last 7 days, Last 30 days, Last 90 days
- [ ] Selecting a range refreshes all charts and summary cards
- [ ] Invalid ranges (from > to) show a validation error; API rejects ranges > 365 days

---

**US-13: Select a single repository**  
*As a developer, I want to filter the dashboard to one repo so I can analyse it in isolation.*

Acceptance Criteria:
- [ ] Sidebar RepoSelector allows selecting "All repos" or any single connected repo
- [ ] Selecting a repo filters all charts and summary cards to that repo's metrics only
- [ ] Selected state is reflected visually in the sidebar

---

## 2. Technical Design

### 2.1 Data Model

```
┌─────────────────────────────┐
│           users             │
├─────────────────────────────┤
│ id           String  PK     │
│ email        String  UNIQUE │
│ passwordHash String         │
│ createdAt    DateTime       │
│ updatedAt    DateTime       │
└──────────────┬──────────────┘
               │ 1
               │
               │ has many
               ▼ N
┌─────────────────────────────┐        ┌─────────────────────────────┐
│          sessions           │        │        repositories         │
├─────────────────────────────┤        ├─────────────────────────────┤
│ id        String  PK        │        │ id            String  PK    │
│ userId    String  FK→users  │        │ githubId      Int     UNIQUE│
│ token     String  UNIQUE    │        │ owner         String        │
│ expiresAt DateTime          │        │ name          String        │
│ createdAt DateTime          │        │ fullName      String        │
│ ipAddress String?           │        │ description   String?       │
│ userAgent String?           │        │ isPrivate     Boolean       │
└─────────────────────────────┘        │ defaultBranch String       │
                                       │ userId        String FK→users│
                                       │ lastSyncedAt  DateTime?     │
                                       │ syncStatus    SyncStatus    │
                                       │ createdAt     DateTime      │
                                       │ updatedAt     DateTime      │
                                       └──────────────┬──────────────┘
                                                      │ 1
                                                      │
                                                      │ has many
                                                      ▼ N
                                       ┌─────────────────────────────┐
                                       │           metrics           │
                                       ├─────────────────────────────┤
                                       │ id           String  PK     │
                                       │ repoId       String FK→repos│
                                       │ date         Date           │
                                       │ commits      Int            │
                                       │ prsOpened    Int            │
                                       │ prsMerged    Int            │
                                       │ prsClosed    Int            │
                                       │ contributors Int            │
                                       │ additions    Int            │
                                       │ deletions    Int            │
                                       │ createdAt    DateTime       │
                                       │ updatedAt    DateTime       │
                                       │ UNIQUE(repoId, date)        │
                                       └─────────────────────────────┘

SyncStatus enum: PENDING | SYNCING | SUCCESS | FAILED
```

**Key constraints:**
- `UNIQUE(repoId, date)` on metrics — guarantees idempotent upsert-based sync
- `onDelete: Cascade` on Session→User and Metric→Repository — deleting a user/repo cleans up all child rows
- `UNIQUE(owner, name)` on repositories — prevents duplicate connections per user

---

### 2.2 API Contracts

All responses use `Content-Type: application/json`.  
Authenticated routes require `Authorization: Bearer <token>`.  
All error responses: `{ "error": "<message>" }`.

---

#### POST /api/auth/register

Request:
```json
{ "email": "user@example.com", "password": "min8chars" }
```

Response `201`:
```json
{ "user": { "id": "cuid", "email": "user@example.com", "createdAt": "ISO8601" } }
```

Errors: `400` validation, `409` duplicate email

---

#### POST /api/auth/login

Request:
```json
{ "email": "user@example.com", "password": "..." }
```

Response `200`:
```json
{
  "token": "hex256",
  "expiresAt": "ISO8601",
  "user": { "id": "cuid", "email": "user@example.com" }
}
```

Errors: `400` validation, `401` invalid credentials

---

#### POST /api/auth/logout

Response `200`: `{ "success": true }`  
Errors: `401`

---

#### GET /api/auth/session

Response `200`:
```json
{
  "user": { "id": "cuid", "email": "user@example.com" },
  "session": { "expiresAt": "ISO8601" }
}
```

Errors: `401`

---

#### GET /api/repos

Response `200`:
```json
{
  "repositories": [
    {
      "id": "cuid",
      "githubId": 12345,
      "owner": "octocat",
      "name": "hello-world",
      "fullName": "octocat/hello-world",
      "description": "My first repo",
      "isPrivate": false,
      "syncStatus": "SUCCESS",
      "lastSyncedAt": "ISO8601"
    }
  ]
}
```

Errors: `401`

---

#### POST /api/repos/connect

Request:
```json
{ "owner": "octocat", "name": "hello-world" }
```

Response `201`:
```json
{ "repository": { "id": "cuid", "fullName": "octocat/hello-world", "syncStatus": "PENDING" } }
```

Errors: `400` validation, `401`, `404` not on GitHub, `409` already connected, `502` GitHub unreachable

---

#### DELETE /api/repos/[repoId]

Response `200`: `{ "success": true }`  
Errors: `401`, `403` not owner, `404`

---

#### POST /api/repos/[repoId]/sync

Response `200`:
```json
{
  "repository": {
    "id": "cuid",
    "syncStatus": "SUCCESS",
    "lastSyncedAt": "ISO8601"
  }
}
```

Errors: `401`, `403`, `404`, `429` rate limited (includes `Retry-After` header), `502`

---

#### GET /api/metrics/[repoId]?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day|week|month

Response `200`:
```json
{
  "repoId": "cuid",
  "from": "2026-04-01",
  "to": "2026-04-30",
  "granularity": "day",
  "data": [
    {
      "date": "2026-04-01",
      "commits": 5,
      "prsOpened": 2,
      "prsMerged": 1,
      "prsClosed": 0,
      "contributors": 3,
      "additions": 120,
      "deletions": 45
    }
  ]
}
```

Errors: `400` invalid range or range >365 days, `401`, `403`, `404`

---

#### GET /api/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD

Response `200`:
```json
{
  "from": "2026-04-01",
  "to": "2026-04-30",
  "totals": {
    "commits": 142,
    "prsOpened": 18,
    "prsMerged": 14,
    "contributors": 5,
    "additions": 3400,
    "deletions": 890
  },
  "byRepo": [
    { "repoId": "cuid", "fullName": "owner/repo", "commits": 80, "prsMerged": 8 }
  ],
  "topContributorDays": [
    { "date": "2026-04-15", "commits": 22 }
  ]
}
```

Errors: `400` missing/invalid params, `401`

---

### 2.3 Component Tree

```
app/
├── (auth)/
│   ├── login/page.tsx                  [Server]
│   │   └── LoginForm                   [Client] — useActionState
│   │         ├── Input (email)         [Client]
│   │         ├── Input (password)      [Client]
│   │         └── Button (submit)       [Client]
│   └── register/page.tsx               [Server]
│       └── RegisterForm                [Client]
│             ├── Input (email)
│             ├── Input (password)
│             └── Button (submit)
│
└── (dashboard)/
    ├── dashboard/page.tsx              [Server — fetches summary + repos]
    │   └── PageWrapper                 [Server]
    │         ├── Navbar                [Client — logout action]
    │         ├── Sidebar               [Client]
    │         │     └── RepoSelector    [Client — selects repo or "all"]
    │         │           └── Badge     [Client]
    │         └── DashboardContent      [Server]
    │               ├── MetricsSummary  [Server]
    │               │     └── Card ×4  [Client]
    │               ├── CommitFrequencyChart   [Client — Recharts LineChart]
    │               ├── PRStatChart            [Client — Recharts BarChart]
    │               ├── ContributorTrendChart  [Client — Recharts AreaChart]
    │               └── ActivityFeed    [Client — date range picker]
    │
    └── settings/page.tsx               [Server — fetches repos]
        └── PageWrapper
              ├── Navbar
              └── SettingsContent       [Server]
                    ├── ConnectRepoForm         [Client — useActionState]
                    └── ConnectedReposList      [Client]
                          └── RepoCard ×N       [Client]
                                ├── Badge
                                ├── Button (Sync)
                                └── Button (Disconnect)
```

**Client components** (`"use client"`): all forms, charts (Recharts requires DOM), Sidebar, Navbar (logout), ActivityFeed, ConnectedReposList, RepoCard, all UI primitives.  
**Server components**: all page.tsx files, PageWrapper, DashboardContent, MetricsSummary, SettingsContent.

---

### 2.4 MCP Integration

**Server:** GitHub MCP server  
**Config:** `GITHUB_TOKEN` env var  
**Wrapper:** `lib/github.ts`

| MCP Tool | Used For | Called By |
|---|---|---|
| `get_repository` | Fetch repo metadata on connect | `getRepoInfo(owner, name)` |
| `list_commits` | Daily commit counts, additions/deletions | `fetchCommitsByDateRange(owner, name, branch, from, to)` |
| `list_pull_requests` | PR counts by state per date | `fetchPRsByDateRange(owner, name, from, to)` |

Error mapping:
- MCP returns null/empty → `GitHubRepoNotFoundError` → HTTP 404
- MCP call rejects → `GitHubUnavailableError` → HTTP 502
- MCP returns 429 → `GitHubRateLimitError { retryAfter }` → HTTP 429 + `Retry-After` header

---

## 3. Implementation Plan

### Phase 1 — Scaffolding + DB Setup (3 hrs)

Tasks:
1. `pnpm create next-app` with TypeScript, Tailwind, App Router
2. Install all dependencies (see CLAUDE.md)
3. Configure `tailwind.config.ts` with design tokens
4. Write `prisma/schema.prisma` with all four models + enum
5. Run `prisma migrate dev --name init`
6. Write `lib/db.ts` (Prisma singleton)
7. Write `lib/config.ts` (validates env vars at startup, throws if missing)
8. Write `.env.example`

Deliverables: running `pnpm dev` with no errors, DB schema applied, Prisma client generated.

---

### Phase 2 — Authentication (4 hrs)

Tasks:
1. `lib/auth.ts`: `hashPassword`, `comparePassword`, `generateSessionToken`, `requireSession`
2. `types/auth.ts`: `registerSchema`, `loginSchema` (Zod)
3. API routes: `POST /register`, `POST /login`, `POST /logout`, `GET /session`
4. UI primitives: `Button`, `Input`, `Card`, `Badge` in `components/ui/`
5. Layout: `PageWrapper`, `Navbar` in `components/layout/`
6. Auth pages: `LoginForm`, `RegisterForm`, `/login`, `/register`

Deliverables: user can register, log in, log out, and session is validated.

---

### Phase 3 — Repo Connection + GitHub MCP Sync (5 hrs)

Tasks:
1. Configure GitHub MCP server in Claude Code settings
2. `lib/github.ts`: `getRepoInfo`, `fetchCommitsByDateRange`, `fetchPRsByDateRange`, error classes
3. API routes: `GET /repos`, `POST /repos/connect`, `DELETE /repos/[repoId]`, `POST /repos/[repoId]/sync`
4. Components: `ConnectRepoForm`, `ConnectedReposList`, `RepoSelector`
5. `/settings` page

Deliverables: user can connect a repo, trigger a sync, see badge state update, disconnect.

---

### Phase 4 — Metrics API + Aggregation Logic (4 hrs)

Tasks:
1. `lib/metrics.ts`: `aggregateSummary`, `groupByWeek`, `groupByMonth`, `computeDelta`, `topContributorDays`, `mergeCommitsAndPRs`
2. `types/metrics.ts`: Zod schemas for query params + shared metric types
3. API routes: `GET /metrics/[repoId]`, `GET /dashboard/summary`

Deliverables: metrics endpoints return correct aggregated data for any date range and granularity.

---

### Phase 5 — Frontend Dashboard + Charts (6 hrs)

Tasks:
1. `lib/cn.ts`: `cn()` utility (clsx + tailwind-merge)
2. `components/layout/sidebar.tsx`
3. `components/dashboard/metrics-summary.tsx`
4. `components/dashboard/activity-feed.tsx` (date range picker)
5. `components/charts/commit-frequency-chart.tsx` (Recharts LineChart)
6. `components/charts/pr-stat-chart.tsx` (Recharts BarChart stacked)
7. `components/charts/contributor-trend-chart.tsx` (Recharts AreaChart)
8. `hooks/use-dashboard.ts`, `hooks/use-repos.ts`
9. `app/(dashboard)/dashboard/page.tsx` — wire server fetch → client components

Deliverables: dashboard renders charts with real data, date range filter and repo selector work.

---

### Phase 6 — Tests to 80% Coverage (4 hrs)

Tasks:
1. Configure Vitest with Istanbul coverage thresholds (80% lines/branches/functions/statements)
2. Write `__tests__/lib/auth.test.ts` (no mocks)
3. Write `__tests__/lib/metrics.test.ts` (no mocks)
4. Write `__tests__/lib/github.test.ts` (mock MCP client)
5. Write `__tests__/api/auth/` (Supertest, mock Prisma)
6. Write `__tests__/api/repos/` (Supertest, mock Prisma + GitHub)
7. Write `__tests__/api/metrics/` and `__tests__/api/dashboard/`
8. Write `__tests__/components/` (RTL, MSW)
9. Run `pnpm test:coverage` and fill branch gaps

Deliverables: `pnpm test:coverage` passes at ≥80% across all thresholds.

---

### Phase 7 — CI/CD + Security Audit (3 hrs)

Tasks:
1. Write `.github/workflows/ci.yml`:
   - `pnpm install --frozen-lockfile`
   - `pnpm prisma generate`
   - `pnpm lint`
   - `pnpm type-check`
   - `pnpm test:coverage`
   - `pnpm build`
   - `pnpm audit --audit-level=high`
2. Security audit against OWASP checklist (see §5.2)
3. Add security headers to `next.config.ts`
4. Add rate limiting middleware (`middleware.ts`)
5. Write final `README.md` with setup, env vars, API reference

Deliverables: CI pipeline passes on `main`, all security checklist items resolved, README complete.

---

### Time Summary

| Phase | Focus | Hours |
|---|---|---|
| 1 | Scaffolding + DB | 3 |
| 2 | Authentication | 4 |
| 3 | Repo + MCP Sync | 5 |
| 4 | Metrics API | 4 |
| 5 | Frontend | 6 |
| 6 | Tests | 4 |
| 7 | CI/CD + Security | 3 |
| **Total** | | **29 hrs** |

---

## 4. Scope Boundaries

### What DevPulse includes

- Read-only analytics dashboard over GitHub commit and PR data
- Single user account (one email + password, one session at a time)
- Multiple connected repositories per user
- Commit frequency, PR stats, contributor trends with date range filtering
- Manual sync trigger per repository
- Settings page for managing connected repos
- Opaque session-based authentication

### What DevPulse explicitly does NOT include

| Out of scope | Reason |
|---|---|
| GitHub OAuth / SSO | Adds OAuth flow complexity; token-based auth is sufficient for v1 |
| Multi-tenant / team accounts | No organization model, no invitations, no billing |
| Real-time updates (WebSocket / SSE) | Scheduled sync is sufficient; real-time adds infrastructure complexity |
| Code browsing / file viewing | DevPulse is an analytics layer, not a GitHub mirror |
| Issue tracking / sprint planning | Out of domain; GitHub already covers this |
| CI/CD build status / deployment tracking | A different domain (observability vs. analytics) |
| AI-powered code review or PR analysis | Different product category |
| Mobile / responsive layout | Desktop only (≥1024px viewport) |
| Email notifications | Requires email infrastructure; out of v1 scope |
| CSV / PDF export | Useful future feature; out of v1 scope |
| Repository search / discovery | User types owner/repo directly; no GitHub search UI |
| Contributor identity mapping | No de-duplication of GitHub usernames across repos |
| Self-hosted GitHub (GitHub Enterprise) | Requires separate MCP config; out of v1 scope |

Any feature outside this boundary requires a spec update before implementation begins.

---

## 5. Success Criteria

### 5.1 Functional Verification

The project is complete when all of the following pass:

**Authentication:**
- [ ] New user can register at `/register` and is redirected to `/dashboard`
- [ ] Registered user can log in at `/login`
- [ ] Logging out invalidates the token; subsequent requests return 401
- [ ] All dashboard routes redirect unauthenticated users to `/login`

**Repository management:**
- [ ] User can connect a public GitHub repo via Settings
- [ ] Sync badge progresses PENDING → SYNCING → SUCCESS
- [ ] Metric rows appear in the `metrics` table after sync
- [ ] Disconnecting a repo removes it and cascades to metrics

**Dashboard:**
- [ ] Commit frequency chart renders with real data for a connected repo
- [ ] PR stat chart renders with opened/merged/closed series
- [ ] Contributor trend chart renders
- [ ] Summary cards show correct totals and delta percentages
- [ ] Date range picker changes all charts and cards simultaneously
- [ ] Repo selector filters to a single repo or shows all

**Error handling:**
- [ ] Connecting a non-existent repo shows a user-visible error
- [ ] GitHub unavailable during sync shows FAILED badge + error message
- [ ] Invalid date range shows a validation error

### 5.2 Security Verification

- [ ] `pnpm audit` — zero high-severity vulnerabilities in dependencies
- [ ] No `passwordHash` or session `token` in any API response body
- [ ] Auth endpoints return generic error messages (no email oracle)
- [ ] Every repo endpoint returns 403 (not 404) when repoId belongs to another user
- [ ] Security headers present in all responses: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`
- [ ] Rate limiting active: 10 req/min on `/api/auth/*`, 60 req/min on other routes
- [ ] No secrets present in git history: `git log --all -S "SECRET"` returns no matches
- [ ] `GITHUB_TOKEN` never referenced in any `"use client"` component

### 5.3 Technical Verification

- [ ] `pnpm test:coverage` — ≥80% lines, branches, functions, statements
- [ ] `pnpm type-check` — zero TypeScript errors (`tsc --noEmit`)
- [ ] `pnpm lint` — zero ESLint errors
- [ ] `pnpm build` — production build succeeds with no warnings treated as errors
- [ ] GitHub Actions CI pipeline passes on `main` (all 6 steps green)
- [ ] All 10 API endpoints respond correctly with Postman / curl

### 5.4 Documentation Verification

- [ ] `README.md` covers: project overview, prerequisites, local setup, env var table, running tests, CI badge
- [ ] `docs/SPEC.md` (this file) is complete and reflects implemented state
- [ ] `CLAUDE.md` is accurate and up to date
- [ ] All custom commands (`/spec`, `/audit`, `/sync-metrics`, `/db-reset`) are documented and functional

---

## 6. Certification Rubric Cross-Reference

| Rubric Requirement | Minimum | DevPulse Implementation | Where to Verify |
|---|---|---|---|
| **REST API endpoints** | 5+ | 10 endpoints across 4 resource groups | `app/api/` — register, login, logout, session, list repos, connect, delete, sync, metrics, dashboard |
| **Database tables (related)** | 3+ | 4 tables: `users`, `sessions`, `repositories`, `metrics` | `prisma/schema.prisma` — FK relationships with cascade deletes |
| **Frontend components** | 5+ | 15+ components: LoginForm, RegisterForm, Navbar, Sidebar, RepoSelector, MetricsSummary, ActivityFeed, CommitFrequencyChart, PRStatChart, ContributorTrendChart, ConnectRepoForm, ConnectedReposList, Button, Input, Card, Badge | `components/` directory |
| **Test coverage** | 80%+ | Vitest with Istanbul; thresholds enforced in CI | `pnpm test:coverage` — all 4 thresholds ≥80% |
| **Specification document** | 5-phase spec | This document (SPEC.md): Requirements, Technical Design, Implementation Plan, Scope Boundaries, Success Criteria | `docs/SPEC.md` |
| **CI/CD configuration** | GitHub Actions | 6-step pipeline: install → generate → lint → type-check → test → build → audit | `.github/workflows/ci.yml` |
| **Security audit** | Completed + findings fixed | OWASP checklist in §5.2; rate limiting, security headers, bcrypt, opaque tokens, ownership checks, no secrets in responses | Security checklist in §5.2 |
| **Documentation** | README + API docs | README.md (setup, env vars, CI badge) + API contracts in §2.2 | `README.md`, `docs/SPEC.md §2.2` |
| **CLAUDE.md + custom commands** | Project conventions | Naming, file structure, testing strategy, error handling, env vars; 4 custom commands | `CLAUDE.md` |
| **MCP integration** | 1 server | GitHub MCP server — 3 tools used: `get_repository`, `list_commits`, `list_pull_requests` | `lib/github.ts`, Phase 3 |

**Module source mapping:**

| Rubric Item | Module |
|---|---|
| CRISP prompting | Module 2 — used to write this spec and feature prompts |
| Debugging | Module 3 — test-driven debugging of aggregation logic |
| TDD + coverage | Module 3 — 80% threshold enforced in CI |
| Full-stack dev | Module 4 — Next.js API routes + Prisma + React |
| Plan Mode + spec | Module 5 — this SPEC.md from the approved plan |
| MCP + CLAUDE.md | Module 6 — GitHub MCP server, custom commands |
| CI/CD + security | Module 7 — GitHub Actions pipeline + OWASP audit |
