# =============================================================================
# Nevark MSS — Frontend Production Dockerfile
# Next.js 15 / Node 20 / Standalone output
# =============================================================================

# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install only production-safe native build tools
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_API_URL is baked at build time.
# Pass via --build-arg in docker compose or override here.
ARG NEXT_PUBLIC_API_URL=http://localhost/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable Next.js telemetry in CI/prod builds
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: minimal runtime ──────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup -S nevark && adduser -S nevark -G nevark

# Copy only the standalone build output
COPY --from=builder --chown=nevark:nevark /app/public          ./public
COPY --from=builder --chown=nevark:nevark /app/.next/standalone  ./
COPY --from=builder --chown=nevark:nevark /app/.next/static     ./.next/static

USER nevark

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
