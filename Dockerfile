# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS api-tools
COPY tsconfig.base.json ./
COPY apps/api apps/api
RUN pnpm --filter @warehouse/api prisma:generate

FROM api-tools AS api-builder
RUN pnpm --filter @warehouse/api build
RUN pnpm --filter @warehouse/api deploy --prod --legacy /prod/api
RUN cd /prod/api && /app/apps/api/node_modules/.bin/prisma generate --schema=prisma/schema.prisma

FROM node:22-alpine AS api
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=api-builder /prod/api ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/main.js"]

FROM deps AS web-builder
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL
COPY apps/web apps/web
RUN pnpm --filter @warehouse/web build

FROM nginx:1.27-alpine AS web
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
