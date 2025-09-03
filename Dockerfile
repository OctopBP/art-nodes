# syntax=docker/dockerfile:1

# Install dependencies (cached separately)
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# Build the Next.js app
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

# Optional: libc compatibility for native libs
RUN apk add --no-cache libc6-compat

# Copy standalone server and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Use PORT from the environment (.env or docker --env-file)

ARG PORT=3008
ENV PORT=${PORT}

EXPOSE ${PORT}

# Drop privileges
USER node

# Run standalone server
CMD ["node", "server.js"]
