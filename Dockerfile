# ========================================
# BoX2 Next.js Production Dockerfile
# Multi-stage build for optimized image
# ========================================

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build arguments for environment
ARG DATABASE_URL
ARG AUTH_SECRET
ARG AUTH_URL
ARG NEXT_PUBLIC_APP_NAME=BoX2

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install netcat for database connection check and postgresql-client for schema init
RUN apk add --no-cache netcat-openbsd postgresql16-client

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy prisma client for runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy ldapts for LDAP authentication
COPY --from=builder /app/node_modules/ldapts ./node_modules/ldapts
COPY --from=builder /app/node_modules/asn1 ./node_modules/asn1
COPY --from=builder /app/node_modules/safer-buffer ./node_modules/safer-buffer

# Copy prisma directory for schema reference (not used at runtime but useful for debugging)
COPY --from=builder /app/prisma ./prisma

# Copy scripts directory for db:seed and other utilities
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Make scripts executable
RUN chmod +x scripts/docker-entrypoint.sh scripts/init-schema.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start with auto-initialization (db push, seed, OpenLdapConfig)
CMD ["sh", "scripts/docker-entrypoint.sh"]
