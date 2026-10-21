# ==============================================================================
# Multi-Stage Production Dockerfile for OrderFlow Backend API
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma/

# Install all dependencies including devDependencies
RUN npm install

# Copy backend source code
COPY backend/src ./src/

# Generate Prisma Client & compile TypeScript
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

# ==============================================================================
# Stage 2: Production Runtime
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl for container HEALTHCHECK
RUN apk add --no-cache curl

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install only production dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy generated Prisma Client and compiled distribution
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
