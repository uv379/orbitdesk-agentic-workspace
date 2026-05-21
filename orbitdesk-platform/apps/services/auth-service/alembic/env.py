# ==============================================================================
# alembic/env.py — Alembic environment configuration
# ==============================================================================
#
# This file is called by Alembic when you run `alembic` commands.
# It does two things:
#   1. Reads the DATABASE_URL from environment variables (not alembic.ini).
#   2. Points Alembic to our SQLAlchemy models so it can auto-detect schema changes.
#
# ASYNC NOTE:
#   Our SQLAlchemy setup uses async (asyncpg driver). Alembic runs synchronously,
#   so we use a sync psycopg2 URL for migrations.
#   The Dockerfile and requirements.txt include psycopg2-binary for this purpose.
#   We convert "postgresql+asyncpg://..." → "postgresql+psycopg2://..." here.
# ==============================================================================

import os
from logging.config import fileConfig

from dotenv import load_dotenv
load_dotenv()  # loads .env file so DATABASE_URL is available without prefixing the command

from sqlalchemy import engine_from_config, pool
from alembic import context

# Import our models' Base so Alembic knows about all our tables.
# This is the key line — without it, `--autogenerate` won't detect any tables.
from app.db.session import Base
from app.models import user  # noqa: F401 — import triggers model registration

# Alembic Config object — lets us read values from alembic.ini.
config = context.config

# Set up Python logging from the alembic.ini [loggers] section.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# `target_metadata` tells Alembic which tables exist in our models.
# It compares this against the actual DB schema to generate migration diffs.
target_metadata = Base.metadata


def get_url() -> str:
    """
    Read DATABASE_URL from the environment and convert it to a sync URL
    for Alembic (which runs synchronously, unlike our app).
    """
    url = os.environ.get("DATABASE_URL", "")
    # Replace async driver with sync driver for Alembic.
    # "postgresql+asyncpg://..." → "postgresql+psycopg2://..."
    return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    Generates SQL scripts without connecting to the DB.
    Useful for reviewing what Alembic WOULD do, or for DBAs who apply SQL manually.
    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.
    Connects to the DB and applies changes directly.
    This is the normal mode when you run `alembic upgrade head`.
    """
    # Override the sqlalchemy.url in alembic.ini with the env var value.
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # don't pool connections for migrations
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


# Alembic calls this file and checks if we're in online or offline mode.
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
