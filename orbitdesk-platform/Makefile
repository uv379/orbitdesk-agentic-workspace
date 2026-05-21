# ==============================================================================
# Makefile — Convenience commands for the OrbitDesk monorepo
# ==============================================================================
#
# WHY A MAKEFILE?
# The full docker compose command with 3 -f flags is annoying to type every time.
# `make dev` is much nicer. Makefiles also serve as living documentation —
# new team members can run `make help` to see all available commands.
#
# HOW TO USE:
#   make help        ← list all commands
#   make setup       ← first-time setup (copy .env.shared.template + .env.local.template)
#   make infra       ← start only infra (postgres, redis, kafka, etc.)
#   make dev         ← start everything (infra + all services)
#   make down        ← stop everything
#   make logs        ← tail logs from all containers
#   make gateway     ← start only the api-gateway (for local dev of just the gateway)
# ==============================================================================

# The three compose files that together define the full dev stack
COMPOSE_BASE = -f infra/compose/docker-compose.base.yml
COMPOSE_INFRA = -f infra/compose/docker-compose.infra.yml
COMPOSE_DEV   = -f infra/compose/docker-compose.dev.yml

# Read env vars from the shared template location
ENV_FILE = --env-file infra/compose/.env

# Default target — runs when you type just `make`
.DEFAULT_GOAL := help

.PHONY: help setup infra dev down logs gateway clean

# ── help ──────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "OrbitDesk — available commands:"
	@echo ""
	@echo "  make setup      First-time setup: copies .env.shared.template and .env.local.template → .env"
	@echo "  make infra      Start infra only (postgres, redis, kafka, minio, rabbitmq)"
	@echo "  make dev        Start everything (infra + all services + api-gateway)"
	@echo "  make down       Stop and remove all containers"
	@echo "  make logs       Tail logs from all running containers"
	@echo "  make gateway    Rebuild + restart only the api-gateway container"
	@echo "  make clean      Stop containers AND delete all volumes (⚠️  destroys data)"
	@echo ""

# ── setup ─────────────────────────────────────────────────────────────────────
setup:
	@if [ -f infra/compose/.env ]; then \
		echo "infra/compose/.env already exists — skipping copy."; \
	else \
		cp infra/compose/.env.shared.template infra/compose/.env; \
		echo "✅ Created infra/compose/.env — fill in JWT_SECRET, POSTGRES_PASSWORD, etc."; \
	fi
	@if [ -f apps/api-gateway/.env ]; then \
		echo "apps/api-gateway/.env already exists — skipping copy."; \
	else \
		cp apps/api-gateway/.env.local.template apps/api-gateway/.env; \
		echo "✅ Created apps/api-gateway/.env — gateway-specific vars ready"; \
	fi

# ── infra ─────────────────────────────────────────────────────────────────────
# Start only the infrastructure containers (no application code).
# Useful when you want to run services locally with `npm run start:dev`
# but still need postgres + redis + kafka available.
infra:
	docker compose $(COMPOSE_BASE) $(COMPOSE_INFRA) $(ENV_FILE) up -d

# ── dev ───────────────────────────────────────────────────────────────────────
# Start the entire stack: infra + all 8 backend services + api-gateway.
# -d = detached mode (runs in background, use `make logs` to tail output)
dev:
	docker compose $(COMPOSE_BASE) $(COMPOSE_INFRA) $(COMPOSE_DEV) $(ENV_FILE) up -d
	@echo ""
	@echo "✅ OrbitDesk is running"
	@echo "   API Gateway:      http://localhost:8000"
	@echo "   Health check:     http://localhost:8000/health/live"
	@echo "   MinIO console:    http://localhost:9001"
	@echo "   RabbitMQ console: http://localhost:15672"
	@echo ""
	@echo "Run 'make logs' to tail container output"

# ── down ──────────────────────────────────────────────────────────────────────
# Stop all containers. Data in volumes is preserved.
down:
	docker compose $(COMPOSE_BASE) $(COMPOSE_INFRA) $(COMPOSE_DEV) $(ENV_FILE) down

# ── logs ──────────────────────────────────────────────────────────────────────
# Tail logs from all running containers.
# Filter to a single service: make logs SERVICE=api-gateway
SERVICE ?= ""
logs:
	docker compose $(COMPOSE_BASE) $(COMPOSE_INFRA) $(COMPOSE_DEV) $(ENV_FILE) logs -f $(SERVICE)

# ── gateway ───────────────────────────────────────────────────────────────────
# Rebuild and restart ONLY the api-gateway container.
# Use this after changing api-gateway code when infra is already running.
gateway:
	docker compose $(COMPOSE_BASE) $(COMPOSE_INFRA) $(COMPOSE_DEV) $(ENV_FILE) up -d --build api-gateway

# ── clean ─────────────────────────────────────────────────────────────────────
# Nuclear option: stop containers AND delete all named volumes.
# ⚠️  This destroys all database data, redis data, and uploaded files.
clean:
	@echo "⚠️  This will delete ALL container data (postgres, redis, minio, kafka)."
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	docker compose $(COMPOSE_BASE) $(COMPOSE_INFRA) $(COMPOSE_DEV) $(ENV_FILE) down -v
	@echo "✅ All containers and volumes removed"
