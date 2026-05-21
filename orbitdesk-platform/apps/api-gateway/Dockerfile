# ──────────────────────────────────────────────
# Stage 1: BUILD
# Use a full Node image to compile TypeScript → JavaScript
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (Docker layer caching trick):
# If package.json hasn't changed, Docker reuses the cached npm install layer.
# Only re-runs npm install if dependencies actually changed — speeds up builds.
COPY package*.json ./

RUN npm install

# Copy all source files and compile TypeScript to /app/dist
COPY . .
RUN npm run build

# ──────────────────────────────────────────────
# Stage 2: PRODUCTION IMAGE
# Only copy the compiled output — no TypeScript compiler, no dev deps.
# Smaller image = faster container start, smaller attack surface.
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy only production dependencies (no devDependencies)
COPY package*.json ./
RUN npm install --production

# Copy the compiled JavaScript from the builder stage
COPY --from=builder /app/dist ./dist

# The port this container listens on (matches PORT env var default in configuration.ts)
EXPOSE 8000

# Start the compiled server — no ts-node, just plain node for performance
CMD ["node", "dist/main"]
