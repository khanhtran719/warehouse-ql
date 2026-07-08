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

Tài khoản seed local mặc định:

- username: `admin`
- password: `admin123456`

Khi seed môi trường thật, đặt `ADMIN_PASSWORD` trong `apps/api/.env` và đổi `JWT_SECRET` khỏi giá trị mẫu.

## Script chính

```bash
pnpm build
pnpm test
pnpm --filter @warehouse/api dev
pnpm --filter @warehouse/web dev
```

## Chạy bằng Docker

Build image và chạy toàn bộ hệ thống:

```bash
pnpm docker:build
pnpm docker:up
```

Docker Compose sẽ chạy PostgreSQL, apply Prisma migration, API NestJS và Web Nginx.

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Healthcheck API: `http://localhost:3000/api/health`

Seed dữ liệu mẫu sau khi hệ thống chạy:

```bash
pnpm docker:seed
```

Dừng stack Docker:

```bash
pnpm docker:down
```

Biến môi trường Docker có thể override:

- `API_DATABASE_URL`: connection string PostgreSQL trong container
- `JWT_SECRET`: secret JWT, cần đổi khi deploy thật
- `ADMIN_PASSWORD`: mật khẩu admin khi seed
- `CORS_ORIGIN`: origin web được API cho phép
- `VITE_API_URL`: URL API được build vào frontend
