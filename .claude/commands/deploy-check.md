Run a complete pre-deployment verification of the DevPulse project. Work through every gate below in order. Stop and report any failure immediately — do not proceed past a failing gate.

## Gate 1 — Working tree is clean

Run `git status` and confirm there are no uncommitted changes. If there are, list them and ask the user whether to stash or commit before continuing.

## Gate 2 — Dependencies are up to date

Run `pnpm install --frozen-lockfile` to verify the lockfile is consistent with `package.json`. A non-zero exit means someone updated `package.json` without updating the lockfile.

## Gate 3 — Type-check passes

Run `pnpm type-check`. Zero errors required. Report every TypeScript error with file and line number.

## Gate 4 — Lint passes

Run `pnpm lint`. Report every lint error. Warnings are acceptable but note them.

## Gate 5 — Full test suite passes with coverage

Run `pnpm test:coverage`. All 4 coverage thresholds (lines, branches, functions, statements) must be ≥ 80%. Report any failing test with its full name and error message.

## Gate 6 — No high/critical dependency vulnerabilities

Run `pnpm audit --audit-level=high`. Any high or critical finding is a hard block. List moderate findings for awareness but do not block on them.

## Gate 7 — Production build succeeds

Run `pnpm build`. A build failure is a hard block regardless of test results. Capture and report any build error.

## Gate 8 — Environment variables are documented

Read `.env.example` and verify every variable listed there has a non-empty placeholder. Check that `.env` is in `.gitignore` (it must never be committed). Read `lib/config.ts` and verify every `required()` call has a corresponding entry in `.env.example`.

## Gate 9 — Database migrations are in sync

Read `prisma/schema.prisma` and the `prisma/migrations/` directory. Confirm the latest migration file is not newer than the schema (i.e., `prisma migrate status` would show no drift). If a database is reachable, run `pnpm prisma migrate status` to confirm.

## Gate 10 — Security audit is current

Read `docs/SECURITY-AUDIT.md`. Check the date at the top of the file. If it is more than 30 days old, warn that a fresh audit is recommended. List any OPEN findings with severity HIGH or MEDIUM and ask the user to confirm they are accepted risks before proceeding.

---

## Final report

After all gates, produce a summary table:

| Gate | Status | Notes |
|------|--------|-------|
| 1 – Clean working tree | PASS / FAIL | … |
| 2 – Lockfile consistent | PASS / FAIL | … |
| 3 – Type-check | PASS / FAIL | … |
| 4 – Lint | PASS / FAIL | … |
| 5 – Tests + coverage | PASS / FAIL | … |
| 6 – Dependency audit | PASS / FAIL | … |
| 7 – Production build | PASS / FAIL | … |
| 8 – Env vars documented | PASS / FAIL | … |
| 9 – Migrations in sync | PASS / FAIL | … |
| 10 – Security audit current | PASS / WARN | … |

If all gates pass, print: **✓ Ready to deploy.**
If any gate fails, print: **✗ Blocked — resolve the failures above before deploying.**
