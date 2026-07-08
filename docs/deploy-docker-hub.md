# Deploy Production Bằng Docker Hub

Tài liệu này dùng cho cách deploy production mà server Linux không cần pull source code. Image được build từ máy dev hoặc CI, push lên Docker Hub, server chỉ pull image và chạy bằng Docker Compose.

## Kiến trúc

- `postgres`: database PostgreSQL, lưu dữ liệu bằng Docker volume.
- `migrate`: chạy Prisma migration trước khi API start.
- `api`: NestJS API, expose nội bộ port `3000`.
- `web`: React build chạy qua Nginx, expose nội bộ port `5173`.
- `seed`: tool chạy một lần để tạo dữ liệu/tài khoản admin ban đầu.

## Build Và Push Image

Đăng nhập Docker Hub:

```bash
docker login
```

Đặt biến dùng chung:

```bash
export DOCKERHUB_NAMESPACE=yourdockerhub
export IMAGE_TAG=1.0.0
export PRODUCTION_API_URL=https://kho.example.com/api
```

Build và push API image:

```bash
docker buildx build --platform linux/amd64 \
  --target api \
  -t $DOCKERHUB_NAMESPACE/warehouse-ql-api:$IMAGE_TAG \
  --push .
```

Build và push tools image dùng cho migrate/seed:

```bash
docker buildx build --platform linux/amd64 \
  --target api-tools \
  -t $DOCKERHUB_NAMESPACE/warehouse-ql-tools:$IMAGE_TAG \
  --push .
```

Build và push web image:

```bash
docker buildx build --platform linux/amd64 \
  --target web \
  --build-arg VITE_API_URL=$PRODUCTION_API_URL \
  -t $DOCKERHUB_NAMESPACE/warehouse-ql-web:$IMAGE_TAG \
  --push .
```

Nếu server chạy ARM64, đổi `--platform linux/amd64` thành `--platform linux/arm64`, hoặc build multi-platform bằng `--platform linux/amd64,linux/arm64`.

Lưu ý: `VITE_API_URL` được build cứng vào frontend. Khi đổi domain hoặc URL API, cần build và push lại web image.

## File Trên Server

Trên server tạo một thư mục deploy, ví dụ:

```bash
mkdir -p /opt/warehouse-ql
cd /opt/warehouse-ql
```

Tạo file `.env`:

```env
DOCKERHUB_NAMESPACE=yourdockerhub
IMAGE_TAG=1.0.0

POSTGRES_PASSWORD=change-this-postgres-password
API_DATABASE_URL=postgresql://postgres:change-this-postgres-password@postgres:5432/warehouse_ql?schema=public

JWT_SECRET=change-this-to-a-long-random-secret
ADMIN_PASSWORD=change-this-admin-password
CORS_ORIGIN=https://kho.example.com
```

Tạo file `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: warehouse-ql-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: warehouse_ql
    volumes:
      - warehouse_ql_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d warehouse_ql"]
      interval: 5s
      timeout: 5s
      retries: 10

  migrate:
    image: ${DOCKERHUB_NAMESPACE}/warehouse-ql-tools:${IMAGE_TAG}
    container_name: warehouse-ql-migrate
    environment:
      DATABASE_URL: ${API_DATABASE_URL}
    command: pnpm --filter @warehouse/api prisma:deploy
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"

  api:
    image: ${DOCKERHUB_NAMESPACE}/warehouse-ql-api:${IMAGE_TAG}
    container_name: warehouse-ql-api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: ${API_DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully

  web:
    image: ${DOCKERHUB_NAMESPACE}/warehouse-ql-web:${IMAGE_TAG}
    container_name: warehouse-ql-web
    restart: unless-stopped
    ports:
      - "127.0.0.1:5173:80"
    depends_on:
      api:
        condition: service_healthy

  seed:
    image: ${DOCKERHUB_NAMESPACE}/warehouse-ql-tools:${IMAGE_TAG}
    profiles: ["tools"]
    container_name: warehouse-ql-seed
    environment:
      NODE_ENV: production
      DATABASE_URL: ${API_DATABASE_URL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    command: pnpm --filter @warehouse/api seed
    depends_on:
      postgres:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    restart: "no"

volumes:
  warehouse_ql_pgdata:
```

Nếu Docker Hub repo private, đăng nhập trên server trước khi pull:

```bash
docker login
```

## Chạy Lần Đầu

Pull image và chạy stack:

```bash
docker compose pull
docker compose up -d
```

Kiểm tra container:

```bash
docker compose ps
```

Seed dữ liệu và tài khoản admin lần đầu:

```bash
docker compose --profile tools run --rm seed
```

Tài khoản admin mặc định sau seed:

- username: `admin`
- password: giá trị `ADMIN_PASSWORD` trong `.env`

## Nginx Reverse Proxy

Ví dụ Nginx host trên server cho domain `kho.example.com`:

```nginx
server {
    server_name kho.example.com;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Cài HTTPS bằng Certbot:

```bash
sudo certbot --nginx -d kho.example.com
```

## Update Production

Build và push image mới với tag mới, ví dụ `1.0.1`:

```bash
export IMAGE_TAG=1.0.1
```

Chạy lại 3 lệnh `docker buildx build --push` ở phần build image.

Trên server, sửa `IMAGE_TAG` trong `.env` sang tag mới:

```env
IMAGE_TAG=1.0.1
```

Pull và restart:

```bash
docker compose pull
docker compose up -d
```

Compose sẽ chạy `migrate` trước khi API lên. Không cần chạy `seed` lại nếu không muốn tạo/cập nhật dữ liệu mẫu.

## Rollback

Đổi `IMAGE_TAG` trong `.env` về tag cũ:

```env
IMAGE_TAG=1.0.0
```

Sau đó chạy:

```bash
docker compose pull
docker compose up -d
```

Lưu ý: rollback code không tự rollback database migration. Nếu release có migration phá vỡ tương thích, cần có kế hoạch backup/restore database trước khi deploy.

## Backup Database

Tạo backup nhanh:

```bash
docker compose exec postgres pg_dump -U postgres -d warehouse_ql > warehouse_ql_$(date +%Y%m%d_%H%M%S).sql
```

Nên backup trước mỗi lần update production có migration.

## Kiểm Tra Và Logs

Xem trạng thái:

```bash
docker compose ps
```

Xem log API:

```bash
docker compose logs -f api
```

Xem log web:

```bash
docker compose logs -f web
```

Kiểm tra health API trên server:

```bash
curl http://127.0.0.1:3000/api/health
```

## Bảo Mật Production

- Không dùng `JWT_SECRET`, `POSTGRES_PASSWORD`, `ADMIN_PASSWORD` mặc định.
- Không mở PostgreSQL port `5432` ra internet.
- Compose mẫu chỉ bind API và web vào `127.0.0.1` để đi qua Nginx reverse proxy.
- Chỉ mở firewall cho `80` và `443` nếu dùng Nginx public.
- Nếu image private, server phải `docker login` bằng tài khoản/token có quyền pull.
