# Multi-stage build for optimized production image
FROM node:20-alpine AS base

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Stage 1: Install production dependencies
FROM base AS deps-prod

COPY package*.json ./

RUN npm ci --omit=dev --prefer-offline --no-audit

# Stage 2: Install all dependencies and build
FROM base AS build

COPY package*.json ./

RUN npm ci --prefer-offline --no-audit

COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

# Stage 3: Final production image
FROM node:20-alpine AS prod

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Copy only necessary files
COPY --from=deps-prod --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Start application
CMD ["node", "dist/app.js"]