# Project Map

## Overview

`warehouse-ql` is a warehouse management CMS for product catalog, stock imports, stock exports, current stock, revenue/profit reporting, and monthly export Excel files.

- Stack: pnpm workspace, NestJS 10 API, Prisma 6, PostgreSQL, JWT auth, ExcelJS, React 18, Vite, Ant Design, TanStack Query, Recharts, Vitest, Docker Compose.
- API prefix: `/api`.
- Local web port: `5173`.
- Local API port: `3000`.

## Workspace Structure

- `apps/api`: NestJS API.
- `apps/web`: React/Vite admin UI.
- `docs`: deployment and operating documentation.
- `scripts`: Docker helper scripts.
- `Dockerfile`: multi-stage build for API, API tools, and web Nginx image.
- `docker-compose.yml`: local/full-stack Docker Compose with Postgres, migration, API, web, and seed service.

## API Modules

- `apps/api/src/auth`: login, JWT strategy, current user endpoint, password verification.
- `apps/api/src/catalog`: products, categories, units, product movements.
- `apps/api/src/inventory`: stock imports, stock exports, voucher confirmation, inventory math.
- `apps/api/src/reports`: overview, daily reports, low-stock/top-product data.
- `apps/api/src/users`: admin-only account creation, role/status management, and password reset.
- `apps/api/src/partners`: customer and supplier master data used by inventory vouchers.
- `apps/api/src/prisma`: Prisma service/module.
- `apps/api/src/common`: pagination, current-user decorator, roles guard/decorator.
- `apps/api/src/config`: environment validation.
- `apps/api/prisma/schema.prisma`: database schema.
- `apps/api/prisma/seed.ts`: seed admin and sample data.

## Web Modules

- `apps/web/src/App.tsx`: app shell/routes.
- `apps/web/src/Login.tsx`: login flow.
- `apps/web/src/api.ts`: API client and token handling.
- `apps/web/src/types.ts`: frontend API/domain types.
- `apps/web/src/pages/ProductsPage.tsx`: product catalog UI.
- `apps/web/src/pages/ImportsPage.tsx`: stock import list and creation.
- `apps/web/src/pages/ExportsPage.tsx`: stock export list and creation.
- `apps/web/src/pages/VoucherForm.tsx`: shared import/export voucher form.
- `apps/web/src/pages/ReportsPage.tsx`: reports UI.
- `apps/web/src/pages/Dashboard.tsx`: dashboard UI.
- `apps/web/src/pages/UsersPage.tsx`: admin-only user and role management.
- `apps/web/src/components/PageHeader.tsx`: common page header.
- `apps/web/src/format.ts`: formatting and label helpers.
- `apps/web/src/errors.ts`: user-facing error handling.

## Runtime Shape

- PostgreSQL stores users, partners, categories, units, products, vouchers, attachment metadata, items, and stock movements. Receipt image binaries live in `UPLOAD_DIR`.
- API reads env from `apps/api/.env` in local development.
- Docker Compose can override runtime env via root `.env` variables.
- Web uses `VITE_API_URL`, which is build-time configuration in the Vite bundle.
- Prisma migration deploy is handled by the `migrate` service in Docker Compose.
- Seed is a separate tool service and should not be run automatically on every deploy unless explicitly intended.

## Domain Boundaries

- Catalog owns product code/name/category/unit/default sale price/min stock/note and category/unit creation.
- Inventory owns voucher creation and confirmation, stock movement rows, stock quantity changes, and average cost updates.
- Physical stock corrections use the admin-only stock-adjustment endpoint and always append an `ADJUSTMENT` movement.
- Reports owns read-only aggregation for overview/daily/low-stock/top-product views.
- Auth owns user identity, JWT issuance, current-user lookup, and route protection.

## Important Entrypoints

- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/prisma/schema.prisma`
- `apps/web/src/main.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `package.json`
- `README.md`
- `Dockerfile`
- `docker-compose.yml`

## Commands

- Install: `pnpm install`.
- Dev all: `pnpm dev`.
- Build all: `pnpm build`.
- Test all: `pnpm test`.
- Lint/typecheck all: `pnpm lint`.
- API dev: `pnpm --filter @warehouse/api dev`.
- API build: `pnpm --filter @warehouse/api build`.
- API test: `pnpm --filter @warehouse/api test`.
- API lint/typecheck: `pnpm --filter @warehouse/api lint`.
- Prisma generate: `pnpm --filter @warehouse/api prisma:generate`.
- Prisma dev migration: `pnpm --filter @warehouse/api prisma:migrate`.
- Prisma deploy migrations: `pnpm --filter @warehouse/api prisma:deploy`.
- Seed: `pnpm --filter @warehouse/api seed`.
- Web dev: `pnpm --filter @warehouse/web dev`.
- Web build: `pnpm --filter @warehouse/web build`.
- Web test: `pnpm --filter @warehouse/web test`.
- Web lint/typecheck: `pnpm --filter @warehouse/web lint`.
- Docker build: `pnpm docker:build`.
- Docker up: `pnpm docker:up`.
- Docker migrate: `pnpm docker:migrate`.
- Docker seed: `pnpm docker:seed`.
- Docker down: `pnpm docker:down`.

## Read-First References

- Project basics: `README.md`, `package.json`, `pnpm-workspace.yaml`.
- API scripts/dependencies: `apps/api/package.json`.
- Web scripts/dependencies: `apps/web/package.json`.
- Database schema: `apps/api/prisma/schema.prisma`.
- Local env template: `apps/api/.env.example`.
- Docker deploy: `Dockerfile`, `docker-compose.yml`, `scripts/build-docker.sh`.
- Docker Hub production deploy: `docs/deploy-docker-hub.md`.
