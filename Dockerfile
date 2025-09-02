## Simplest single-stage Dockerfile for Next.js (Node 20)
## Builds and runs the app with npm, no multi-stage/standalone.

FROM node:20-bullseye

# Avoid npm audit/fund noise and disable Next telemetry
ENV NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

# Install a stable npm to avoid known npm install bugs in some images
RUN npm -v && npm i -g npm@10.8.2 && npm -v

# Install dependencies (include devDependencies so TypeScript is available)
COPY package.json package-lock.json ./
# Ensure dev deps are installed by setting NODE_ENV just for this command
RUN npm ci --no-audit --no-fund

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
