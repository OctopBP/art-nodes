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

# Install only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Use PORT from the environment (.env or docker --env-file)

ARG PORT=3008
ENV PORT=${PORT}

EXPOSE ${PORT}

CMD ["npm", "run", "start"]

