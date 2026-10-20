# ==============================================================================
# Multi-Stage Production Dockerfile for OrderFlow Monolith Backend
# ==============================================================================
# Stage 1: Build & Compilation Stage
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies needed for TypeScript & Prisma)
RUN npm ci

# Generate strongly-typed Prisma Client
RUN npx prisma generate

# Copy source code and TypeScript configuration
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# ==============================================================================
# Stage 2: Lean Production Runtime Image
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Install curl for container HEALTHCHECK
RUN apk add --no-cache curl

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy generated Prisma Client from builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy compiled JavaScript distribution
COPY --from=builder /app/dist ./dist

# Create non-root security context
USER node

# Expose HTTP application port
EXPOSE 5000

# Container liveness health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Start production server
CMD ["node", "dist/server.js"]
