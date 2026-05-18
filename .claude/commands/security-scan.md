Run a thorough security audit of the DevPulse codebase. Examine every API route, shared library, schema, and configuration file. For each finding, record severity, file, line range, the vulnerability, and the recommended fix. At the end, update `docs/SECURITY-AUDIT.md` with the complete results and fix every finding rated HIGH.

---

## What to scan

### 1. Authentication & authorisation

Read every file under `app/api/` and verify:
- Every state-changing route (`POST`, `PUT`, `PATCH`, `DELETE`) calls `requireSession()` before touching the database.
- Every route that accesses a user-owned resource (repository, metric) performs an ownership check (`repo.userId !== user.id`) after fetching it.
- `requireSession` itself (in `lib/auth.ts`) validates token presence, DB lookup, and expiry — confirm all three checks are still present.

### 2. Input validation

Read `types/index.ts` and every route that parses user input:
- All request bodies are validated through a Zod schema with `.safeParse()` before use.
- String fields have `max()` length bounds in addition to `min()`.
- Fields that are forwarded to external systems (GitHub owner/name, date strings) have format-constraining `regex()` validators.
- Date range parameters have a maximum window enforced (currently 365 days) on every route that accepts them — check `app/api/metrics/[repoId]/route.ts` AND `app/api/dashboard/summary/route.ts`.

### 3. Injection vulnerabilities

- **SQL injection:** Confirm all database queries go through Prisma's typed query builder. Search for any usage of `prisma.$queryRaw`, `prisma.$executeRaw`, or template literals inside Prisma calls. Flag any found.
- **XSS:** Confirm all API routes return `application/json`. Check `app/` pages for any use of `dangerouslySetInnerHTML`. Check that user-supplied strings (repo names, descriptions) are never rendered as raw HTML.

### 4. Secrets & sensitive data

Search the entire codebase (excluding `node_modules/` and `.next/`) for:
- Hardcoded tokens, passwords, or connection strings (patterns: `ghp_`, `postgres://`, `SECRET=`, bare hex strings ≥ 40 chars in non-test files).
- Any `.env` file committed to git history (`git log --all -- .env`).
- Confirm `lib/auth.ts` never returns `passwordHash` in any response shape.
- Confirm `app/api/auth/session/route.ts` does not expose the raw session token.

### 5. Security headers

Read `next.config.ts` and verify the `headers()` export sets at minimum:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- A `Content-Security-Policy` that includes `frame-ancestors 'none'`

Flag any missing header.

### 6. Rate limiting

Check that `lib/rate-limit.ts` exists and is imported by both `app/api/auth/login/route.ts` and `app/api/auth/register/route.ts`. Verify the limits are applied before any database query in each handler.

### 7. CORS

Search for `Access-Control-Allow-Origin` headers. If none are set, note that Next.js defaults to same-origin (acceptable) but flag the absence of an explicit policy.

### 8. Dependency vulnerabilities

Run `pnpm audit`. Categorise findings by severity. HIGH and CRITICAL are hard findings. MODERATE findings are informational unless they affect runtime code (build-time-only vulnerabilities are lower priority).

### 9. Error handling & information leakage

- Verify no route returns a raw Prisma error, stack trace, or internal error message to the client.
- Confirm the generic `errorResponse('Internal server error', 500)` fallback is present in every route's catch block.

---

## Severity definitions

| Level    | Definition |
|----------|------------|
| CRITICAL | Unauthenticated remote code execution, secret exfiltration, or auth bypass |
| HIGH     | Authenticated privilege escalation, injection, brute-force with no limit |
| MEDIUM   | Information disclosure, missing validation, unthrottled queries |
| LOW      | Defence-in-depth gaps, policy violations |
| INFO     | Informational, build-time only, or accepted risks |

---

## Output

1. Print each finding in this format:

```
[SEVERITY] Short title
  File:    path/to/file.ts
  Lines:   N–M
  Finding: What the vulnerability is and why it matters.
  Fix:     What to change (be specific — include the code if short).
```

2. After listing all findings, fix every HIGH and CRITICAL finding in place.

3. Re-run `pnpm test` to confirm no regressions from your fixes.

4. Overwrite `docs/SECURITY-AUDIT.md` with a complete report: date, all findings (including those already fixed in prior audits), and a "Controls verified as correct" section for everything that passed.
