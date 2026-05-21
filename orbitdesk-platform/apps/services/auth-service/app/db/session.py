# ==============================================================================
# app/db/session.py — PostgreSQL connection setup using SQLAlchemy (async)
# ==============================================================================
#
# WHAT THIS FILE DOES:
#   1. Creates an "engine" — the low-level connection pool to PostgreSQL.
#   2. Creates an "AsyncSession factory" — used to open DB sessions in routers.
#   3. Exports a `get_db()` dependency function — FastAPI injects this into
#      route handlers so they get a fresh DB session per request.
#
# ANALOGY:
#   Think of the engine as a pool of database connections (like a connection
#   manager). A "session" is a single conversation with the DB — you use it
#   to run queries, then close it when done.
#
# ASYNC vs SYNC:
#   Regular SQLAlchemy blocks the server while waiting for DB results.
#   Async SQLAlchemy (create_async_engine) lets the server handle other
#   requests while waiting — much more efficient for a web API.
# ==============================================================================

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


# ── Engine ─────────────────────────────────────────────────────────────────────
# The engine manages the actual TCP connections to PostgreSQL.
# pool_pre_ping=True: before using a connection, send a "SELECT 1" to check
# it's still alive. Prevents "connection closed" errors after long idle periods.
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    # echo=True would print every SQL query to the console — useful for debugging
    # but noisy in production. Enable locally if you want to see what's happening.
    echo=settings.debug,
)


# ── Session factory ────────────────────────────────────────────────────────────
# AsyncSessionLocal is a "class" that creates new session objects.
# expire_on_commit=False: after committing, SQLAlchemy by default marks all
# objects as "expired" so the next access hits the DB again. We set this to
# False so we can still read fields after a commit (useful in response models).
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Base class for all models ──────────────────────────────────────────────────
# Every SQLAlchemy model (User, Session, etc.) will inherit from this Base.
# This is how SQLAlchemy "knows" which classes are database tables.
class Base(DeclarativeBase):
    pass


# ── FastAPI dependency: get_db ─────────────────────────────────────────────────
# This is a "dependency injection" function.
#
# HOW IT WORKS:
#   - `async def get_db()` is a generator (note the `yield`).
#   - FastAPI calls this before your route handler runs.
#   - The `db` session is passed into your route as a parameter.
#   - After your route finishes (or raises an error), FastAPI resumes here
#     and closes the session — guaranteed cleanup even on exceptions.
#
# USAGE IN A ROUTER:
#   from app.db.session import get_db
#   from sqlalchemy.ext.asyncio import AsyncSession
#
#   @router.get("/example")
#   async def my_route(db: AsyncSession = Depends(get_db)):
#       result = await db.execute(select(User))
#       ...
async def get_db():
    # Open a new session from the factory
    async with AsyncSessionLocal() as session:
        # `yield` pauses this function and sends `session` to the route handler.
        # Execution resumes here after the route handler returns.
        yield session
        # The `async with` block automatically calls session.close() here.
