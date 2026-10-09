FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable


# ============================================================
# Dependencies
# ============================================================

FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile


# ============================================================
# Next.js Builder
# ============================================================

FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build


# ============================================================
# Next.js Production App
# Target: runner
# ============================================================

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]


# ============================================================
# Worker Dependencies
# ============================================================

FROM base AS worker-deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

RUN pnpm deploy --filter . --prod /worker

WORKDIR /worker

RUN pnpm add tsx@4.23.15 dotenv@18.0.5 --prod --ignore-scripts


# ============================================================
# Worker Production
# Target: worker
# ============================================================

FROM node:22-alpine AS worker

WORKDIR /app

ENV NODE_ENV=production

COPY --from=worker-deps /worker/package.json ./package.json
COPY --from=worker-deps /worker/node_modules ./node_modules
COPY tsconfig.json ./tsconfig.json
COPY src ./src

CMD ["node_modules/.bin/tsx", "src/worker/index.ts"]