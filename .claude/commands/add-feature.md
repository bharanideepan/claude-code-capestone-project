Scaffold a new feature for DevPulse following the project's TDD convention and architecture. The feature to add is: $ARGUMENTS

Work through the phases below in order. Do not write implementation code before writing a failing test.

---

## Phase 1 — Understand the feature

Before writing anything, answer these questions (draw on the existing codebase):
1. What layer(s) does this feature touch? (API route / lib utility / React component / hook / all)
2. Does it require new database columns or tables? If so, sketch the schema change.
3. Which existing files will it extend or call?
4. What are the 3–5 most important behaviours to test (happy path + key edge cases)?

Print the answers, then proceed.

---

## Phase 2 — Test file first (Red)

Create the test file(s) before any implementation. Follow these conventions:

**File placement:**
- API routes → `__tests__/api/<path>/name.test.ts`
- `lib/` functions → `__tests__/lib/name.test.ts`
- React components → `__tests__/components/<category>/name.test.tsx` with `// @vitest-environment jsdom` at the top

**Test structure:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock at system boundaries only: Prisma client, GitHub API, Date.now()
// Never mock internal lib/ functions

describe('<function or route name>', () => {
  it('<plain English description of the behaviour>', async () => {
    // Arrange
    // Act
    // Assert
  })
})
```

**Mandatory test cases:**
- Happy path (expected input → expected output / status)
- Auth guard: returns 401 when session token is missing (for every API route)
- Ownership check: returns 403 when resource belongs to a different user (for user-owned resources)
- Validation: returns 400 for missing or malformed required fields
- At least 2 edge cases specific to the feature logic

Run `pnpm test <test-file>` and confirm the tests fail with "not found" or similar — proving the implementation does not exist yet.

---

## Phase 3 — Schema migration (if needed)

If the feature requires new database fields:
1. Edit `prisma/schema.prisma` — add the new model or fields following existing naming conventions (camelCase fields, `@map("snake_case")`, `@map("table_name")`).
2. Run `pnpm db:migrate` with a descriptive migration name.
3. Update the Prisma client: `pnpm prisma generate`.

---

## Phase 4 — Implementation (Green)

Write the minimum code to make the tests pass. Follow the project conventions:

**Naming:**
- Files/folders: `kebab-case`
- React components: `PascalCase`
- Functions/variables: `camelCase`
- Zod schemas: `camelCase` + `Schema` suffix (defined in `types/index.ts`)
- Constants: `SCREAMING_SNAKE_CASE`

**API routes (`app/api/...`):**
- Export only `GET`, `POST`, `PUT`, or `DELETE`.
- Call `requireSession(req)` first on every state-changing route.
- Validate the request body with a Zod `safeParse` before any DB call.
- Return `errorResponse(message, status)` from `@/types/index` on failure.
- Return `Response.json(data, { status })` on success.
- Never expose Prisma errors or stack traces to the client.
- For routes that accept date range query params, enforce `from ≤ to` and `diffDays ≤ 365`.

**lib/ utilities:**
- Keep functions pure and framework-agnostic where possible.
- No `any` — use `unknown` with type narrowing if the shape is uncertain.

**React components:**
- Server components by default; add `'use client'` only for interactivity or browser APIs.
- Tailwind utility classes only — no inline styles or custom CSS.
- Use `cn()` from `@/lib/cn` for conditional class merging.

**Rate limiting (for new auth-adjacent endpoints):**
- Import `checkRateLimit` from `@/lib/rate-limit` and apply it before the first DB call.

---

## Phase 5 — Make tests pass, then run full suite

Run `pnpm test <test-file>` repeatedly until all new tests are green.

Then run `pnpm test:coverage` and confirm:
- All new tests pass
- Coverage thresholds remain ≥ 80% across lines, branches, functions, and statements
- No existing tests regressed

If coverage dropped, write additional tests for uncovered branches before proceeding.

---

## Phase 6 — Refactor

With the tests green, clean up:
- Remove any duplication introduced during the green phase
- Ensure naming matches the conventions table above
- Delete any debug logging or temporary code
- Run `pnpm type-check` and `pnpm lint` — zero errors required

---

## Phase 7 — Summary

Print a concise summary of what was created:

```
New files:
  __tests__/...   — N tests (all passing)
  app/api/...     — route handler
  lib/...         — utility (if any)
  types/index.ts  — new Zod schema (if any)

Modified files:
  prisma/schema.prisma  — (if schema changed)
  ...

Coverage: XX% lines / XX% branches
```
