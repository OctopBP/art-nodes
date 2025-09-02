## Multi-stage Dockerfile for Next.js (adapted from the Vite example)

# Stage 1: Build the Next.js project
FROM node:20-bullseye AS build

# Keep installs stable and quiet
ENV NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

# Use a stable npm to avoid rare install issues in some builders
RUN npm -v && npm i -g npm@10.8.2 && npm -v

# Copy package manifests and install deps (include dev deps for TypeScript config)
COPY package.json package-lock.json ./
RUN NODE_ENV=development npm ci --no-audit --no-fund

# Copy the rest of the sources and build
COPY . .
RUN npm run build


# Stage 2: Minimal runtime image that serves the Next standalone server
FROM node:20-bullseye AS runner

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0

# Allow customizing port similarly to the Vite example
ARG PORT=3000
ENV PORT=${PORT}

# Copy standalone server output and static assets
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Drop privileges
USER node

# Expose the configured port
EXPOSE ${PORT}

# Start the Next.js standalone server
CMD ["node", "server.js"]
