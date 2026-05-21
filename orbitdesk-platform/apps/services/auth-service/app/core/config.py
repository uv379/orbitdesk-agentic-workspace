# ==============================================================================
# app/core/config.py — Application settings loaded from environment variables
# ==============================================================================
#
# HOW IT WORKS:
#   pydantic-settings reads values from:
#     1. Environment variables (highest priority — Docker sets these)
#     2. A .env file in the current directory (local dev fallback)
#
#   You never hardcode secrets in code. Instead, you define what vars you
#   EXPECT here, and the OS/Docker provides the actual values at runtime.
#
# USAGE:
#   from app.core.config import settings
#   print(settings.jwt_secret)
# ==============================================================================

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database ───────────────────────────────────────────────────────────────
    # Full PostgreSQL connection string.
    # Example: postgresql+asyncpg://user:password@localhost:5432/orbitdesk_auth
    # NOTE: "+asyncpg" tells SQLAlchemy to use the async driver.
    database_url: str

    # ── JWT (JSON Web Tokens) ──────────────────────────────────────────────────
    # Secret key used to sign tokens. Must be long & random.
    # Generate one: openssl rand -hex 64
    jwt_secret: str

    # How long an ACCESS token lives. Short on purpose — if stolen, expires fast.
    # Format: "15m", "1h", "7d"
    jwt_access_expires: str = "15m"

    # How long a REFRESH token lives. Used to get new access tokens.
    jwt_refresh_expires: str = "7d"

    # Algorithm used to sign the JWT. HS256 = HMAC with SHA-256.
    jwt_algorithm: str = "HS256"

    # ── Server ─────────────────────────────────────────────────────────────────
    port: int = 3001
    debug: bool = False

    # ── Model config ──────────────────────────────────────────────────────────
    # Tell pydantic-settings to also read from a .env file.
    # env_file=".env" means look for a file called ".env" next to where you run
    # the app. In Docker, env vars are set directly so this file won't exist —
    # that's fine, pydantic-settings falls back gracefully.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# Create one shared instance — every module imports this object.
# This is the "singleton" pattern: one config object for the whole app.
settings = Settings()
