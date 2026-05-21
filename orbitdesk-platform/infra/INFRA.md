# infra/

Infrastructure configuration for the OrbitDesk platform. Contains Docker Compose files for local development and Kubernetes manifests for production deployment.

---

## Quick start

```bash
# First time only
make setup       # copies .env.shared.template → infra/compose/.env
                 # copies .env.local.template  → apps/api-gateway/.env
                 # fill in JWT_SECRET, POSTGRES_PASSWORD, ANTHROPIC_API_KEY

# Start everything
make dev         # infra + all 9 services + api-gateway

# Start infra only (run services locally with npm run start:dev)
make infra

# Other commands
make down        # stop all containers
make logs        # tail all logs
make gateway     # rebuild + restart only api-gateway
make clean       # stop + delete all volumes (WARNING: destroys data)
```

---

## Directory structure

```
infra/
├── INFRA.md                              # this file
│
├── compose/
│   ├── .env.shared.template             # template for shared secrets → copy to .env
│   ├── docker-compose.base.yml          # shared network + volume definitions
│   ├── docker-compose.infra.yml         # infrastructure containers only
│   └── docker-compose.dev.yml           # all application services (hot reload)
│
└── k8s/
    ├── deployments/
    │   └── api-gateway.yaml             # Deployment (2 replicas, liveness/readiness probes)
    ├── services/
    │   └── api-gateway.yaml             # LoadBalancer + HPA (auto-scale 2→10 pods)
    ├── ingress/
    │   └── ingress.yaml                 # TLS termination + domain routing via nginx
    └── helm/orbitdesk/
        ├── Chart.yaml                   # Helm chart metadata
        └── values.yaml                  # All service image tags, replicas, resource limits
```

---

## Docker Compose — how the three files work together

The compose setup is split into three files that are always merged together with `-f`:

```bash
docker compose \
  -f infra/compose/docker-compose.base.yml \    # always first — defines network + volumes
  -f infra/compose/docker-compose.infra.yml \   # infrastructure containers
  -f infra/compose/docker-compose.dev.yml \     # application services
  up
```

`make dev` and `make infra` do this for you automatically.

### docker-compose.base.yml
Defines the shared Docker network (`orbitdesk-network`) and named volumes.
Never run alone — it has no services, only `networks:` and `volumes:`.

### docker-compose.infra.yml
All infrastructure containers. No application code.

| Container | Image | Port | Purpose |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | Shared DB server (each service owns one database) |
| `redis` | redis:7-alpine | 6379 | Queues (agent, workflow), context cache (ai-core) |
| `minio` | minio/minio | 9000 / 9001 | S3-compatible object storage (documents, ML models) |
| `zookeeper` | bitnami/zookeeper:3.9 | — | Required by Kafka for broker coordination |
| `kafka` | bitnami/kafka:3.6 | 9092 | Event streaming (agent events, audit logs) |
| `rabbitmq` | rabbitmq:3.13-management | 5672 / 15672 | Reliable task queues (workflow, integration) |

**Web UIs available locally:**
- MinIO console: http://localhost:9001
- RabbitMQ management: http://localhost:15672

### docker-compose.dev.yml
All 9 application services with hot reload. Each service:
- Builds from its own `Dockerfile`
- Mounts `src/` as a volume so changes auto-reload
- Uses an anonymous `/app/node_modules` volume to prevent host deps interfering
- Gets Docker-internal URLs for downstream services (e.g. `http://auth-service:3001`)

**Only `api-gateway` exposes a host port (8000).** All other services are internal only.

---

## Environment variables — two files, clear rule

| File | Name | Contains | Who reads it |
|---|---|---|---|
| `infra/compose/.env.shared.template` | `.env.shared.template` | Secrets shared by 2+ services | Docker Compose via `--env-file` |
| `apps/api-gateway/.env.local.template` | `.env.local.template` | Gateway-only vars | Gateway container via `env_file:` + local dev |

**Rule: a variable goes in `.env.shared.template` only if two or more services need the same value.**

Variables in `.env.shared.template`:

| Variable | Used by |
|---|---|
| `JWT_SECRET` | api-gateway (verify) + auth-service (sign) |
| `POSTGRES_HOST/PORT/USER/PASSWORD` | all backend services |
| `REDIS_HOST/PORT` | agent, workflow, ai-core, ml-pipeline |
| `KAFKA_BROKER` | agent, ml-pipeline |
| `RABBITMQ_URL` | workflow, integration |
| `S3_*` | document-service, ml-pipeline |
| `ANTHROPIC_API_KEY` | ai-core-service |

---

## Service port map

| Service | Internal port | Public |
|---|---|---|
| api-gateway | 8000 | ✅ (only one exposed to host) |
| auth-service | 3001 | ❌ internal only |
| user-service | 3002 | ❌ internal only |
| agent-service | 3003 | ❌ internal only |
| ai-core-service | 3004 | ❌ internal only |
| document-service | 3005 | ❌ internal only |
| workflow-service | 3006 | ❌ internal only |
| integration-service | 3007 | ❌ internal only |
| ml-pipeline-service | 3008 | ❌ internal only |

To access a service directly for debugging, uncomment its `ports:` block in `docker-compose.dev.yml`.

---

## Database layout

One PostgreSQL server, one database per service:

| Service | Database |
|---|---|
| auth-service | `orbitdesk_auth` |
| user-service | `orbitdesk_users` |
| agent-service | `orbitdesk_agents` |
| ai-core-service | `orbitdesk_ai_core` |
| document-service | `orbitdesk_documents` |
| workflow-service | `orbitdesk_workflows` |
| integration-service | `orbitdesk_integrations` |
| ml-pipeline-service | `orbitdesk_ml` |

Each service creates its own database via migrations on first startup.

---

## Kubernetes (k8s/)

Only `api-gateway` has full k8s manifests — apply these as each service is built.

### Apply api-gateway to a cluster

```bash
# Create namespace
kubectl create namespace orbitdesk

# Create secrets (never store real values in yaml files)
kubectl create secret generic orbitdesk-secrets \
  --from-literal=jwt-secret=<value> \
  -n orbitdesk

# Create configmap for non-secret config
kubectl create configmap orbitdesk-config \
  --from-literal=cors-origin=https://app.orbitdesk.io \
  -n orbitdesk

# Apply manifests
kubectl apply -f infra/k8s/deployments/api-gateway.yaml
kubectl apply -f infra/k8s/services/api-gateway.yaml
kubectl apply -f infra/k8s/ingress/ingress.yaml
```

### Helm (alternative to raw kubectl)

```bash
# Install everything at once
helm install orbitdesk ./infra/k8s/helm/orbitdesk \
  --set secrets.jwtSecret=<value> \
  --set secrets.postgresPassword=<value> \
  -n orbitdesk

# Upgrade after a change
helm upgrade orbitdesk ./infra/k8s/helm/orbitdesk \
  --set gateway.image.tag=v1.2.3 \
  -n orbitdesk

# Rollback
helm rollback orbitdesk 1 -n orbitdesk
```

---

## CI/CD — .github/workflows/

| File | Trigger | Does |
|---|---|---|
| `ci.yml` | Every push / PR to any branch | TypeScript typecheck on changed apps only |
| `deploy-dev.yml` | Push to `main` | Build image → push to ghcr.io → rolling update on dev cluster |
| `deploy-prod.yml` | Publish a GitHub Release | CI gate → manual approval → build → prod deploy → auto-rollback on failure |

**Required GitHub secrets:**
- `KUBE_CONFIG_DEV` — base64-encoded kubeconfig for dev cluster
- `KUBE_CONFIG_PROD` — base64-encoded kubeconfig for prod cluster
- `GITHUB_TOKEN` — auto-provided, used to push images to ghcr.io

---

## Key decisions

- **Split compose files** — `base + infra + dev` instead of one monolithic file. You can start only infra (`make infra`) when developing a single service locally, without booting all 9 application containers.
- **Named volumes** — data survives `docker compose down`. Use `make clean` (which runs `down -v`) only when you want to reset everything.
- **Only api-gateway is publicly exposed** — all other services are reachable only via the gateway inside `orbitdesk-network`. This mirrors the production architecture where only the gateway has a public IP.
- **`.env.shared.template` not `.env.example`** — named to make the purpose obvious. `.example` is ambiguous; `.shared.template` tells a new developer exactly what belongs in it.
- **`env_file:` pattern for gateway in Docker** — the gateway reads `apps/api-gateway/.env` via `env_file:`, then the `environment:` block overrides service URLs with Docker-internal hostnames. One template file works for both Docker and local dev.
