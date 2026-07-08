# Agent Operating Guide

## Load Order

Before handling a user request in this repository, read these files first:

- `.ai/AGENTS.md`
- `.ai/PROJECTS.md`
- `.ai/MEMORIES.md`
- `.ai/USER.md`

If the task references deployment, Docker Hub, or production operations, also inspect `docs/deploy-docker-hub.md`, `Dockerfile`, `docker-compose.yml`, and `scripts/build-docker.sh` before changing instructions or scripts.

## Collaboration Rules

- Communicate in Vietnamese unless code, logs, or external API names are clearer in English.
- Work step by step and keep the user informed before non-trivial edits or verification.
- Load relevant OpenCode skills automatically when the task matches a skill.
- Preserve dirty worktree changes that were not made by the current agent.
- Do not revert, rename, or reformat unrelated files.
- Prefer the smallest correct change that fits the existing architecture.
- Verify against current code, package scripts, env templates, Docker files, and service entrypoints; older docs can be stale.
- Do not introduce credentials, tokens, private IP secrets, production passwords, or real `.env` files.

## Default Workflow

1. Read `.ai/*` and the relevant source/docs for the requested area.
2. Check `git status --short` when editing or reviewing code, and note unrelated changes.
3. Analyze the codebase if the relevant area is not already understood.
4. Analyze the user requirement, expected behavior, compatibility constraints, and non-goals.
5. Create or maintain a short implementation plan for non-trivial tasks.
6. Identify the affected app and layer.
7. Trace API route/controller -> service -> Prisma model/query, or web page/component -> API client -> type contract.
8. Implement code according to the plan with a minimal patch.
9. Define test cases for the changed behavior before or while implementing.
10. Add focused tests when useful to validate behavior.
11. Review the changed code and diff for correctness, regressions, security, and scope creep.
12. Run focused tests.
13. Run relevant build and lint validation.
14. Remove temporary test-case files or throwaway artifacts before finishing. Keep real repository tests only when intentionally part of the deliverable.
15. Report changed files, validation commands, results, and anything not verified.

## Mandatory Code-Task Checklist

For every implementation task, complete these phases unless the user explicitly limits scope:

1. Codebase analysis: read current architecture, affected files, and sibling patterns if not already known.
2. Requirement analysis: restate the behavior to implement, edge cases, compatibility constraints, and risks.
3. Planning: write or maintain a short step-by-step plan.
4. Implementation: change code strictly according to the plan.
5. Test design: identify success, failure, edge, and regression paths.
6. Test execution: run focused tests or manual checks that match the test cases.
7. Code review: inspect the diff for correctness, data consistency, authorization, validation, decimal math, and accidental unrelated changes.
8. Build and lint: run relevant build/lint commands for the touched scope.
9. Cleanup: remove temporary test-case files, scratch files, logs, generated artifacts, and local-only helpers before final response.
10. Final report: summarize what changed, what was tested, what build/lint ran, and what remains unverified.

If a step cannot be run because of environment limitations, missing dependencies, or user-imposed scope, state the blocker explicitly and do not claim that step passed.

## Review Workflow

- Start with the diff.
- Prioritize correctness, inventory data consistency, Prisma query/update behavior, voucher status transitions, auth/security, deployment safety, and missing tests.
- State explicitly if no findings are found.

## Safe Edit Boundaries

Allowed when relevant:

- `apps/api/src/auth`
- `apps/api/src/catalog`
- `apps/api/src/inventory`
- `apps/api/src/reports`
- `apps/api/src/common`
- `apps/api/src/config`
- `apps/api/prisma` for schema, migrations, and seed changes when requested
- `apps/web/src/pages`
- `apps/web/src/components`
- `apps/web/src/api.ts`, `apps/web/src/types.ts`, `apps/web/src/format.ts`, `apps/web/src/errors.ts`
- `docs`, `Dockerfile`, `docker-compose.yml`, `scripts` when the task targets documentation or deployment
- `.ai` and `opencode.json` when the task targets agent/OpenCode guidance

Avoid unless explicitly required:

- Broad formatting or refactors across unrelated modules.
- Changing applied migrations without a clear migration strategy.
- Changing auth primitives, JWT behavior, or global guards without tracing all affected routes.
- Changing inventory math without focused tests.
- Generated/runtime folders: `node_modules`, `dist`, `build`, `coverage`, `apps/web/dist`, `apps/api/dist`.

## Validation Rules

- API-only change: `pnpm --filter @warehouse/api lint`, `pnpm --filter @warehouse/api test`, and `pnpm --filter @warehouse/api build` when practical.
- Web-only change: `pnpm --filter @warehouse/web lint`, `pnpm --filter @warehouse/web test`, and `pnpm --filter @warehouse/web build` when practical.
- Shared/root config change: run the most relevant package validation plus `pnpm lint` or `pnpm build` when scope warrants it.
- Prisma schema/migration change: run `pnpm --filter @warehouse/api prisma:generate`; run migration/deploy checks only when the database is available and the user expects it.
- Inventory math/voucher confirmation change: run focused inventory tests before broad build.
- Deployment/Docker change: run `docker compose config` when possible; run build only when needed and feasible.
- Docs-only change: no build required unless examples, scripts, or config files were changed.

Do not claim runtime, database, endpoint, or browser verification unless an actual service call, integration test, database query, or browser/manual UI check was run.

## Domain Safety Rules

- Inventory quantities and money fields are decimal-sensitive. Convert and compare deliberately; avoid string/number assumptions without checking Prisma response shape and formatter behavior.
- Voucher confirmation mutates stock, cost, movement rows, and voucher state. Keep status transitions explicit and idempotency/race conditions in mind.
- Do not change confirmed import/export behavior without reviewing both service logic and tests.
- Product `code` is unique. Preserve user-facing conflict messages for duplicate product codes.
- `minStock` is a warning threshold, not a hard stock blocking rule unless a new requirement says otherwise.
- API DTOs and frontend `types.ts` are a contract. Keep request/response compatibility in sync.
- Keep controllers thin; put business behavior in services.
- Keep React pages aligned with Ant Design patterns already used in the app.
- Do not log credentials, JWTs, full auth payloads, production connection strings, or sensitive `.env` values.
