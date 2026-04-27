FROM node:24-alpine AS base
# Install pnpm via npm-install instead of corepack: corepack on Node 24
# alpine images intermittently fails its integrity check when fetching the
# pnpm tarball (https://github.com/nodejs/corepack/issues/612). Pin the
# exact version to match `packageManager` in the root package.json.
RUN npm install -g pnpm@10.32.1 && npm cache clean --force

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @blue-escrow/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 express
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
USER express
EXPOSE 4000
ENV PORT=4000
CMD ["node", "dist/server.js"]
