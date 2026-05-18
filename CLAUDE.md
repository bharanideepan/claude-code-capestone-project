# CLAUDE.md — DevPulse

## Project Description

DevPulse is a developer analytics dashboard that connects to GitHub repositories and surfaces commit frequency, pull request stats, and team activity over time. It is designed as an internal tool for engineering teams who want visibility into their own development patterns without leaving their workflow.

The application fetches repository data via the GitHub MCP server, stores aggregated metrics in PostgreSQL, and renders them through an interactive React dashboard.

---

## Architecture Overview

```
devpulse/
├── app/                        # Next.js 15 App Router
│   ├── (auth)/                 # Auth group: login, register pages
│   ├── (dashboard)/            # Protected group: dashboard, settings
│   ├── api/                    # API route handlers
│   │   ├── auth/               # register, login, logout, session
│   │   ├── repos/              # list, connect, disconnect
│   │   ├── metrics/            # per-repo metrics fetch + aggregate
│   │   └── dashboard/          # aggregated team-level metrics
│   └── layout.tsx
├── components/                 # Reusable React components
│   ├── ui/                     # Primitives: Button, Input, Card, Badge
│   ├── charts/                 # CommitFrequencyChart, PRStatChart, etc.
│   ├── dashboard/              # MetricsSummary, ActivityFeed, RepoSelector
│   └── layout/                 # Navbar, Sidebar, PageWrapper
├── lib/                        # Server-side utilities
│   ├── db.ts                   # Prisma client singleton
│   ├── auth.ts                 # Session helpers, password hashing
│   ├── github.ts               # GitHub MCP client wrapper
│   └── metrics.ts              # Aggregation logic
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── types/                      # Shared TypeScript types and Zod schemas
├── hooks/                      # Client-side React hooks (useDashboard, useRepos)
├── __tests__/                  # Mirrors src structure
└── .github/
    └── workflows/
        └── ci.yml              # Test → Lint → Build → Security
```

### Data Flow

1. User connects a GitHub repo via the UI.
2. API route calls the GitHub MCP server to fetch repo data.
3. Metrics are aggregated and persisted in PostgreSQL via Prisma.
4. Dashboard queries the DB (not GitHub directly) for all chart data.
5. Background refresh re-syncs metrics on a configurable interval.

### Database Schema (Prisma)

```
User         — id, email, passwordHash, createdAt
Repository   — id, githubId, owner, name, userId (FK), lastSyncedAt
Metric       — id, repoId (FK), date, commits, prsOpened, prsMerged, contributors
Session      — id, userId (FK), token, expiresAt
```

---

## Coding Conventions

### TypeScript

- Strict mode enabled (`"strict": true` in tsconfig).
- No `any`. Use `unknown` + type narrowing when the shape is genuinely uncertain.
- Prefer `type` over `interface` for object shapes. Use `interface` only when extending.
- All API route handlers must have explicit return types.

### Naming

| Thing | Convention | Example |
|---|---|---|
| Files / folders | kebab-case | `commit-frequency-chart.tsx` |
| React components | PascalCase | `CommitFrequencyChart` |
| Functions / variables | camelCase | `fetchRepoMetrics` |
| Constants | SCREAMING_SNAKE | `MAX_REPOS_PER_USER` |
| Prisma models | PascalCase | `Repository`, `Metric` |
| DB columns | snake_case (Prisma maps) | `last_synced_at` |
| API routes | kebab-case path segments | `/api/repos/connect` |
| Zod schemas | camelCase + `Schema` suffix | `connectRepoSchema` |

### File Structure Rules

- One component per file. Filename matches the export name.
- Co-locate component tests: `button.tsx` → `button.test.tsx` in `__tests__/components/ui/`.
- API route files export only: `GET`, `POST`, `PUT`, `DELETE` (Next.js route handler convention).
- No barrel (`index.ts`) files — import from the actual file path.
- Keep `lib/` functions pure and framework-agnostic where possible.

### React

- Use server components by default. Add `"use client"` only when interactivity or browser APIs are required.
- Data fetching happens in server components or API routes — not in client `useEffect`.
- Form state uses `useActionState` (Next.js 15 Server Actions pattern).
- Charts are client components (Recharts requires the DOM).

### Styling

- Tailwind utility classes only — no custom CSS files unless animating something Tailwind can't express.
- Use `cn()` (clsx + tailwind-merge) for conditional class merging.
- Color palette defined in `tailwind.config.ts` — do not hardcode hex values inline.

### Error Handling

- API routes return `{ error: string }` with the appropriate HTTP status on failure.
- Never expose stack traces or internal Prisma errors to the client.
- Use Zod for all request body validation at the API boundary.

---

## TDD Rule — Non-Negotiable

**Write the test before writing the implementation. No exceptions.**

The cycle for every function, API route, and component is:

1. **Red** — write a failing test that describes the intended behaviour
2. **Green** — write the minimum code to make it pass
3. **Refactor** — clean up without breaking the test

This applies at every layer:
- `lib/` functions: test file first, implementation second
- API routes: test the contract (request → response) before writing the handler
- Components: test the render and interaction before writing JSX

Do not open a PR where any new code lacks a corresponding test written before the implementation. If you are adding a function and there is no test for it, the function does not exist yet — write the test first.

CI enforces ≥80% coverage and will block merges if it drops below threshold. Coverage is a floor, not a goal — every meaningful behaviour should be tested regardless of the percentage.

---

## Testing Strategy

### Framework

- **Vitest** for unit and integration tests.
- **React Testing Library** for component tests.
- **Supertest** for API route integration tests.
- Target: **80% line coverage minimum**, enforced in CI.

### Test Categories

| Layer | What to test | What NOT to test |
|---|---|---|
| `lib/metrics.ts` | Aggregation logic, edge cases (empty data, single commit) | Prisma internals |
| `lib/auth.ts` | Password hashing, token generation, session expiry | bcrypt implementation |
| API routes | Request validation, happy path, auth guard, error response shape | DB internals |
| Components | Render with props, user interactions, loading/error states | Tailwind class names |
| Hooks | State transitions, returned values | React internals |

### Conventions

- Test files mirror the source tree under `__tests__/`.
- Describe blocks map to the function or component under test.
- Test names use plain English: `"returns 401 when session token is missing"`.
- Mock only at system boundaries: Prisma client, GitHub MCP calls, `Date.now()`.
- Do not mock internal `lib/` functions — test them directly.

### Running Tests

```bash
pnpm test              # run all tests
pnpm test:coverage     # run with coverage report
pnpm test:watch        # watch mode during development
```

---

## Custom Commands

```bash
/spec          # Generate a 5-phase spec for a new feature
/audit         # Run OWASP security checklist against current API routes
/sync-metrics  # Manually trigger a GitHub metrics sync for all repos
/db-reset      # Drop and recreate the local dev database
```

---

## Scope Boundaries

### What DevPulse IS

- A read-only analytics and visualization layer over GitHub data.
- A single-tenant app: one user account owns connected repositories.
- A dashboard tool for individual developers or small teams.

### What DevPulse is NOT

- **Not a GitHub replacement or mirror.** No code browsing, no file viewing.
- **Not a project management tool.** No task creation, no sprint planning, no issue management.
- **Not multi-tenant SaaS.** No organization accounts, no billing, no team invitations in v1.
- **Not real-time.** Metrics refresh on a schedule — no WebSocket live feeds.
- **Not a CI/CD tool.** No build status, deployment tracking, or pipeline visualization.
- **Not an AI code reviewer.** No automated PR analysis or code suggestions.
- **Not mobile-first.** The dashboard is designed for desktop viewports (≥1024px).

Any feature outside this boundary requires an explicit spec update before implementation.

---

## MCP Integration

### GitHub MCP Server

DevPulse uses the GitHub MCP server for Claude Code to inspect, validate, and explore repository data during development.

**Configuration** (`.mcp.json` — checked into the repo):
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Setup**: Set `GITHUB_TOKEN` in `.env` (a personal access token with `repo` scope). The MCP server picks it up via the `${GITHUB_TOKEN}` reference.

### How MCP is Used

| Context | Usage |
|---|---|
| **Development (Claude Code)** | GitHub MCP tools (`get_repository`, `list_commits`, `list_pull_requests`) used to explore real repo data while building features |
| **Runtime (application)** | `lib/github.ts` calls the GitHub REST API directly using `GITHUB_TOKEN` — same data, framework-agnostic |

### Runtime GitHub Integration (`lib/github.ts`)

Three functions back the sync feature:

| Function | GitHub API Endpoint | Used By |
|---|---|---|
| `getRepoInfo(owner, name)` | `GET /repos/{owner}/{name}` | `POST /api/repos/connect` |
| `fetchCommitsByDateRange(owner, name, branch, from, to)` | `GET /repos/{owner}/{name}/commits` | `POST /api/repos/[repoId]/sync` |
| `fetchPRsByDateRange(owner, name, from, to)` | `GET /repos/{owner}/{name}/pulls` | `POST /api/repos/[repoId]/sync` |

Error classes: `GitHubRepoNotFoundError` → 404, `GitHubRateLimitError` → 429 + `Retry-After`, `GitHubUnavailableError` → 502.

---

## Environment Variables

```env
DATABASE_URL=          # PostgreSQL connection string
GITHUB_TOKEN=          # GitHub personal access token (repo scope, used by MCP + runtime API)
SESSION_SECRET=        # Secret for signing session tokens (min 32 chars)
NEXT_PUBLIC_APP_URL=   # Base URL (used for OAuth redirects if added later)
```

Never commit `.env` to version control. Use `.env.example` with placeholder values.
