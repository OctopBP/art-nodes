# Multi-stage Dockerfile for Next.js (Node 20 LTS)

# 1) Base dependencies for building
FROM node:20-bookworm-slim AS deps
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Install dependencies only (leverages Docker layer caching)
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# 2) Builder: compile the Next.js application
FROM node:20-bookworm-slim AS builder
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the app
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# 3) Runner: minimal production image
FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0
WORKDIR /app

# Install only production deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev && npm cache clean --force

# Copy built assets from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/package.json ./

# Run as non-root user for security
USER node

# Expose the Next.js port
EXPOSE 3000

# Healthcheck (optional but recommended)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const p=process.env.PORT||3000; fetch('http://localhost:'+p).then(r=>{if(r.status<500)process.exit(0);process.exit(1)}).catch(()=>process.exit(1))" || exit 1

# Start Next.js in production mode
CMD ["npm", "run", "start"]
