# ==============================================================================
# Dockerfile — auth-service (FastAPI / Python)
# ==============================================================================
#
# HOW DOCKER BUILDS AN IMAGE:
#   Each line starting with FROM, RUN, COPY, etc. is a "layer".
#   Docker caches each layer. If a layer hasn't changed, Docker skips it.
#
#   IMPORTANT ORDERING TRICK:
#   We copy requirements.txt FIRST and run pip install BEFORE copying the app code.
#   Why? Because requirements.txt changes rarely. If you change only Python files,
#   Docker skips the pip install step (cached) and rebuilds only the last COPY layer.
#   This makes rebuilds much faster.
#
# TWO-STAGE vs SINGLE-STAGE:
#   This is a single-stage Dockerfile — fine for development.
#   For production, you'd use a two-stage build to keep the image small
#   (builder stage installs everything, final stage copies only the app).
# ==============================================================================

# ── Base image ─────────────────────────────────────────────────────────────────
# python:3.12-slim = Python 3.12 on Debian with minimal extra packages.
# "slim" removes docs, test files, and rarely-used packages → smaller image.
FROM python:3.12-slim

# ── Set working directory ──────────────────────────────────────────────────────
# All subsequent commands run relative to /app inside the container.
WORKDIR /app

# ── System dependencies ────────────────────────────────────────────────────────
# gcc and libpq-dev are needed to compile asyncpg (the Postgres driver).
# --no-install-recommends reduces the number of extra packages installed.
# We clean up apt cache in the same RUN layer to keep the image smaller.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ────────────────────────────────────────────────────────
# COPY requirements.txt first (before copying app code) to maximize layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ───────────────────────────────────────────────────────────
# Copy the entire app directory into the container.
# In development (docker-compose), this layer is overridden by a volume mount,
# so live code changes don't require a rebuild.
COPY . .

# ── Runtime ────────────────────────────────────────────────────────────────────
# Expose the port the app runs on (informational — docker-compose maps it).
EXPOSE 3001

# Default command: start uvicorn.
# --host 0.0.0.0  → listen on all network interfaces (required inside Docker)
# --port 3001     → match the port in docker-compose
# --reload        → watch for file changes and restart automatically (dev only)
#
# In production, remove --reload and add --workers 4 for multiple processes.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3001", "--reload"]
