# Warehouse QL

Web CMS quản lý 1 kho hàng hoá: nhập kho, xuất kho, tồn kho, báo cáo doanh thu/lợi nhuận và export Excel phiếu xuất theo tháng.

## Stack

- API: NestJS, Prisma, PostgreSQL, JWT, ExcelJS
- Web: React, Vite, Ant Design, TanStack Query, Recharts

## Chạy local

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
docker compose up -d postgres
pnpm --filter @warehouse/api prisma:generate
pnpm --filter @warehouse/api prisma:migrate
pnpm --filter @warehouse/api seed
pnpm dev
```

Tài khoản seed mặc định:

- username: `admin`
- password: `admin123456`

## Script chính

```bash
pnpm build
pnpm test
pnpm --filter @warehouse/api dev
pnpm --filter @warehouse/web dev
```
