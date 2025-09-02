## Simplest single-stage Dockerfile for Next.js (Node 20)
## Builds and runs the app with npm, no multi-stage/standalone.

FROM node:20-bookworm-slim

# Avoid npm audit/fund noise and disable Next telemetry
ENV NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

# Install dependencies (includes devDependencies so TypeScript is available)
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# Production runtime env
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Run as non-root
USER node

EXPOSE 3000

# Start Next.js
CMD ["npm", "start"]
