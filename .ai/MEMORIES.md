# Memories

## Standing Notes

- The user wants `.ai/AGENTS.md`, `.ai/PROJECTS.md`, `.ai/MEMORIES.md`, and `.ai/USER.md` read before handling requests in this repo.
- The repo uses project OpenCode config in `opencode.json`.
- OpenCode project config scans skills from `~/.agents/skills`, `~/.claude/skills`, `.opencode/skills`, and `~/.hermes/skills`.
- Preserve dirty worktree changes that were not made by the current agent.
- Prefer small targeted patches and verify against current code, not only docs.
- Communicate in Vietnamese by default.
- The user often expects implementation, verification, and a concise final report when asking for code changes.

## Project Notes

- API already supports product update via `PATCH /products/:id`; frontend product edit is implemented through `api.updateProduct` and `ProductsPage` modal reuse.
- Product `minStock` is a low-stock warning threshold. It should not block export/sale unless explicitly requested.
- Docker production documentation exists at `docs/deploy-docker-hub.md` and covers Docker Hub image push, server compose, seed, update, rollback, backup, and Nginx reverse proxy.
- Frontend build embeds `VITE_API_URL`; changing production domain/API URL requires rebuilding the web image.

## Validation Memories

- Recent web product-edit change passed `pnpm --filter @warehouse/web lint`, `pnpm --filter @warehouse/web test`, and `pnpm --filter @warehouse/web build`.
- Docs-only changes do not require build/test unless scripts/config examples are changed.

## Domain Notes

- Product `code` has a unique constraint and duplicate conflicts should surface as `Mã hàng đã tồn tại`.
- Catalog entities include product, category, and unit. Product category/unit are optional.
- Stock import confirmation increases product stock and updates average cost.
- Stock export confirmation decreases product stock and snapshots cost/revenue/profit fields.
- Reports rely on confirmed inventory data; be careful changing voucher status or movement semantics.
