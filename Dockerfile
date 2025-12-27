# Multi-stage build for BaxPro - Bourbon Alert Platform
# Optimized for Cloud Run deployment

# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-slim AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build frontend and backend
RUN node build.mjs

# Stage 3: Production
FROM node:20-slim AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Copy migrations folder (SQL migration files)
COPY --from=builder /app/migrations ./migrations

# # Create proper system user (UID < 1000)
# RUN adduser --system --uid 999 --group --no-create-home expressjs && \
#     chown -R expressjs:expressjs /app

# # This user CAN access /cloudsql
# USER 999

# Expose Cloud Run default port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]
