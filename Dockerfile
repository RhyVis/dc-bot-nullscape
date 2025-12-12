# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Toolchain for native builds (e.g., better-sqlite3) on glibc
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Use pnpm via Corepack
RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Drop dev dependencies to shrink what we ship
RUN pnpm prune --prod && pnpm store prune

# Production stage
FROM node:22-slim AS runner

WORKDIR /app

# Create non-root user for security
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs botuser

# Copy built files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules

# Change ownership to non-root user
RUN chown -R botuser:nodejs /app

USER botuser

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

CMD ["node", "dist/index.js"]
