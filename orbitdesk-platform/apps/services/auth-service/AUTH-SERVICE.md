# apps/services/auth-service

Handles everything related to identity: account creation, login, JWT token signing, token refresh, and session management. Every other service trusts the tokens this service produces.

Built with **FastAPI (Python)** on **port 3001**.

---

## How to run

### Option 1 — Local dev (no Docker for the service itself, but Postgres must be running)

**Terminal 1 — Start Postgres** (run once, keep running)
```bash
# path: anywhere
sudo docker run -d \
  --name orbitdesk-postgres \
  -e POSTGRES_USER=orbitdesk \
  -e POSTGRES_PASSWORD="lnnpL3GrZS17WWiDwqFry+4UTYZ8KGn3" \
  -e POSTGRES_DB=orbitdesk_auth \
  -p 5432:5432 \
  postgres:16-alpine
```

**Terminal 2 — Run migrations** (run once, or after every model change)
```bash
# path: apps/services/auth-service/
source venv/bin/activate
PYTHONPATH=. alembic upgrade head
```

**Terminal 3 — Start the service**
```bash
# path: apps/services/auth-service/
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

Swagger UI (interactive API docs): **http://localhost:3001/docs**

---

### Option 2 — Full stack via Docker (recommended once all services exist)

```bash
# path: orbitdesk-platform/ (project root)
make setup     # copies .env templates (run once)
make infra     # starts postgres + redis + kafka etc.
make dev       # starts all services including auth-service
```

---

### First-time setup (run once ever)

```bash
# path: apps/services/auth-service/

# 1. Create virtual environment
python3 -m venv venv

# 2. Activate it
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy env template
cp .env.local.template .env
# Edit .env — set DATABASE_URL and JWT_SECRET

# 5. Create and apply database migrations
PYTHONPATH=. alembic revision --autogenerate -m "initial tables"
PYTHONPATH=. alembic upgrade head
```

---

## Directory structure

```
apps/services/auth-service/
├── Dockerfile                          # python:3.12-slim, uvicorn --reload
├── requirements.txt                    # all Python dependencies
├── alembic.ini                         # Alembic config (points to alembic/ folder)
├── .env.local.template                 # env vars template (copy → .env)
│
├── alembic/                            # Database migration tool
│   ├── env.py                          # Connects Alembic to SQLAlchemy models + reads DATABASE_URL
│   ├── script.py.mako                  # Template for auto-generated migration files
│   └── versions/                       # Migration scripts live here (auto-generated)
│       └── xxxx_initial_tables.py      # First migration: creates users + sessions tables
│
└── app/
    ├── main.py                         # FastAPI app entry point — registers routers + CORS
    │
    ├── core/                           # Pure logic, no HTTP — shared across routers
    │   ├── config.py                   # Reads env vars via pydantic-settings
    │   ├── jwt.py                      # create_access_token / create_refresh_token / decode_access_token
    │   ├── password.py                 # hash_password / verify_password (bcrypt)
    │   └── rbac.py                     # get_current_user dependency + require_role() factory
    │
    ├── db/
    │   └── session.py                  # Async SQLAlchemy engine + get_db() dependency
    │
    ├── models/
    │   └── user.py                     # User table + Session table (SQLAlchemy ORM)
    │
    ├── schemas/
    │   └── auth.py                     # Pydantic request/response shapes (validation + serialization)
    │
    └── routers/
        ├── auth.py                     # POST /auth/signup /login /refresh /logout — GET /auth/me
        └── sessions.py                 # GET /auth/sessions — DELETE /auth/sessions/{id} and /sessions
```

---

## Auth flow

```
── Signup ──────────────────────────────────────────────────────────────────────
Client → POST /auth/signup { full_name, email, password, workspace_name, timezone }
       → hash password (bcrypt)
       → INSERT users row
       → INSERT sessions row (stores refresh token hash)
       → return { access_token, refresh_token, user }

── Login ───────────────────────────────────────────────────────────────────────
Client → POST /auth/login { email, password }
       → verify bcrypt hash
       → INSERT sessions row
       → return { access_token, refresh_token, user }

── Authenticated request ────────────────────────────────────────────────────────
Client → Any protected endpoint
       → send: Authorization: Bearer <access_token>
       → API Gateway verifies JWT (same JWT_SECRET, no DB call)
       → Gateway injects x-user-id / x-user-role / x-workspace-id headers
       → Downstream service trusts those headers

── Token refresh ────────────────────────────────────────────────────────────────
Client → POST /auth/refresh { refresh_token }    ← when access_token expires (15 min)
       → hash incoming refresh_token
       → look up session in DB (must not be revoked or expired)
       → return new { access_token }              ← same refresh_token reused

── Logout ──────────────────────────────────────────────────────────────────────
Client → POST /auth/logout { refresh_token }
       → mark session.revoked_at = now()
       → both tokens are now dead (access expires naturally, refresh is revoked)
```

---

## API endpoints

| Method | Path | Auth required | Description |
|--------|------|---------------|-------------|
| `POST` | `/auth/signup` | No | Create account + workspace |
| `POST` | `/auth/login` | No | Login with email + password |
| `POST` | `/auth/refresh` | No | Get new access token using refresh token |
| `POST` | `/auth/logout` | Yes | Revoke current session |
| `GET` | `/auth/me` | Yes | Get current user profile |
| `GET` | `/auth/sessions` | Yes | List all active login sessions |
| `DELETE` | `/auth/sessions/{id}` | Yes | Revoke a specific session (remote logout) |
| `DELETE` | `/auth/sessions` | Yes | Revoke all sessions (logout everywhere) |
| `GET` | `/health` | No | Health check — returns `{ status: "ok" }` |
| `GET` | `/docs` | No | Swagger UI — interactive API explorer |

---

## Database tables

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key, auto-generated |
| `full_name` | VARCHAR(255) | From signup form |
| `email` | VARCHAR(255) | Unique, indexed |
| `password_hash` | TEXT | bcrypt hash — never plain text |
| `workspace_name` | VARCHAR(255) | From signup form |
| `timezone` | VARCHAR(100) | e.g. `Asia/Calcutta` |
| `role` | ENUM | `admin` or `member` |
| `is_active` | BOOLEAN | False = soft-deleted |
| `email_verified` | BOOLEAN | Reserved for future email verification |
| `created_at` | TIMESTAMPTZ | Set by Postgres on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated by Postgres on every update |

### `sessions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users.id (CASCADE delete) |
| `refresh_token_hash` | VARCHAR(255) | SHA-256 of the raw refresh token |
| `ip_address` | VARCHAR(45) | Client IP (IPv6 safe) |
| `user_agent` | TEXT | Browser/device string |
| `expires_at` | TIMESTAMPTZ | When this refresh token expires |
| `revoked_at` | TIMESTAMPTZ | NULL = active, non-NULL = logged out |
| `created_at` | TIMESTAMPTZ | Set by Postgres on insert |

---

## Alembic — database migration commands

> All commands run from `apps/services/auth-service/` with venv activated.

```bash
# Activate venv first (every new terminal)
source venv/bin/activate

# Create a new migration after changing a model (e.g. added a column)
PYTHONPATH=. alembic revision --autogenerate -m "describe what changed"

# Apply all pending migrations to the database
PYTHONPATH=. alembic upgrade head

# Roll back the last migration
PYTHONPATH=. alembic downgrade -1

# See which migration the DB is currently at
PYTHONPATH=. alembic current

# See full migration history
PYTHONPATH=. alembic history
```

**Why `PYTHONPATH=.`?**
Alembic's `env.py` imports `from app.db.session import Base`. Python needs to know that `app/` is in the current directory. Setting `PYTHONPATH=.` adds the current folder to Python's module search path.

---

## Docker commands

> Run from anywhere — no specific path required.

```bash
# Start Postgres container (first time or after reboot)
sudo docker run -d \
  --name orbitdesk-postgres \
  -e POSTGRES_USER=orbitdesk \
  -e POSTGRES_PASSWORD="lnnpL3GrZS17WWiDwqFry+4UTYZ8KGn3" \
  -e POSTGRES_DB=orbitdesk_auth \
  -p 5432:5432 \
  postgres:16-alpine

# Check running containers
sudo docker ps

# Stop Postgres
sudo docker stop orbitdesk-postgres

# Start it again after a reboot (container already exists, just stopped)
sudo docker start orbitdesk-postgres

# Delete the container completely (data is lost)
sudo docker rm -f orbitdesk-postgres

# View Postgres logs (useful if connection is refused)
sudo docker logs orbitdesk-postgres
```

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | `postgresql+asyncpg://user:pass@host:port/db` — **must use `+asyncpg`** |
| `JWT_SECRET` | Yes | — | Must match the value in `infra/compose/.env` (api-gateway reads the same secret) |
| `JWT_ACCESS_EXPIRES` | No | `15m` | Access token lifetime. Format: `15m`, `1h`, `7d` |
| `JWT_REFRESH_EXPIRES` | No | `7d` | Refresh token lifetime |
| `PORT` | No | `3001` | Server port |
| `DEBUG` | No | `False` | Set `True` to print all SQL queries to console |

In Docker (via `docker-compose.dev.yml`), these are set via the `environment:` block. The `.env` file is only used when running locally without Docker.

---

## JWT token details

| | Access Token | Refresh Token |
|---|---|---|
| **Type** | JWT (signed string) | Opaque random string |
| **Lifetime** | 15 minutes | 7 days |
| **Where stored** | Client memory / localStorage | Secure storage |
| **Where validated** | API Gateway (no DB call) | auth-service DB (sessions table) |
| **Payload** | `{ sub, email, role, workspaceId }` | N/A — random bytes |
| **Revocable** | No (stateless, expires naturally) | Yes (set revoked_at in DB) |

---

## Troubleshooting

### `relation "users" does not exist`
Tables haven't been created. Run migrations:
```bash
# path: apps/services/auth-service/
PYTHONPATH=. alembic upgrade head
```

### `Connection refused` on signup/login
Postgres is not running. Start it:
```bash
sudo docker start orbitdesk-postgres
# or if it doesn't exist yet:
sudo docker run -d --name orbitdesk-postgres -e POSTGRES_USER=orbitdesk \
  -e POSTGRES_PASSWORD="lnnpL3GrZS17WWiDwqFry+4UTYZ8KGn3" \
  -e POSTGRES_DB=orbitdesk_auth -p 5432:5432 postgres:16-alpine
```

### `ModuleNotFoundError: No module named 'app'`
You're running alembic without `PYTHONPATH=.`:
```bash
PYTHONPATH=. alembic upgrade head   # ← add PYTHONPATH=. prefix
```

### `Could not parse SQLAlchemy URL from string ''`
`DATABASE_URL` env var is empty. Either:
- Pass it inline: `DATABASE_URL="postgresql+asyncpg://..." alembic upgrade head`
- Or make sure `.env` file exists and `alembic/env.py` loads it (`load_dotenv()` is already there)

### `email-validator is not installed`
```bash
# path: apps/services/auth-service/
source venv/bin/activate
pip install email-validator
```

### `ValueError: password cannot be longer than 72 bytes` (passlib + bcrypt error)
This is a known incompatibility between `passlib 1.7.4` and `bcrypt 4.x+`.
**Already fixed** — `app/core/password.py` now uses `bcrypt` directly without passlib.
If you see this on a fresh install, make sure you're using the latest `requirements.txt`.

### `externally-managed-environment` when running pip
You're using the system Python. Always use the venv:
```bash
# path: apps/services/auth-service/
python3 -m venv venv          # create venv (once)
source venv/bin/activate      # activate (every new terminal)
pip install -r requirements.txt
```

### `permission denied` connecting to Docker socket
Your user isn't in the docker group yet:
```bash
sudo usermod -aG docker $USER
newgrp docker
# or fully log out and log back in
```

---

## Key decisions

- **FastAPI over NestJS** — auth-service is Python because the rest of the AI stack (ai-core-service, ml-pipeline-service) will also be Python. Sharing a language reduces context switching.
- **Opaque refresh tokens (not JWT)** — refresh tokens are random strings stored as SHA-256 hashes in the DB. This makes them revocable — unlike JWTs, the server has a record of every active session and can invalidate any of them.
- **bcrypt directly (no passlib)** — passlib 1.7.4 is incompatible with bcrypt 4.x+. Using `bcrypt` directly is simpler and has no version conflicts.
- **Sessions table** — storing refresh tokens in a `sessions` table enables: listing active logins, remote logout from any device, detecting token reuse after revocation.
- **JWT payload includes `workspaceId`** — the API gateway reads `workspaceId` from the token and forwards it as `x-workspace-id` to every downstream service. Without this field, services wouldn't know which workspace a request belongs to.
- **`PYTHONPATH=.` for Alembic** — Alembic runs as a CLI tool, not inside the FastAPI app. It needs `PYTHONPATH=.` to resolve `from app.db.session import Base`. This is a one-line prefix, not a config change.
