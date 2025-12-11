# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Toolchain for native builds (e.g., better-sqlite3 on arm64/musl)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Drop dev dependencies to shrink what we ship
RUN npm prune --omit=dev && npm cache clean --force

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 botuser

# Copy built files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Change ownership to non-root user
RUN chown -R botuser:nodejs /app

USER botuser

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

CMD ["node", "dist/index.js"]
