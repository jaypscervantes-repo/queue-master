# Multi-stage Dockerfile for Fly.io deployment

FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Install ALL dependencies (including dev — we need tsc, next, prisma at build time)
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# Build: generates Prisma client, builds Next.js, compiles server.ts → dist/
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runtime: minimal image with only what's needed to run
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/public ./public

EXPOSE 3000

# On container start: sync DB schema, then run the compiled server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/server.js"]
