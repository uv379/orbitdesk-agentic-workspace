# ==============================================================================
# app/main.py — FastAPI application entry point
# ==============================================================================
#
# THIS IS WHERE IT ALL STARTS.
#
# When uvicorn runs `app.main:app`, it:
#   1. Imports this file
#   2. Finds the `app` object (a FastAPI instance)
#   3. Starts serving HTTP requests
#
# This file does three things:
#   1. Creates the FastAPI application instance
#   2. Adds middleware (CORS)
#   3. Registers routers (the actual endpoint definitions)
#
# WHAT IS MIDDLEWARE?
#   Middleware runs on EVERY request before it reaches your route handlers,
#   and on every response before it's sent back to the client.
#   CORS middleware adds headers that tell browsers which origins can call the API.
#
# WHAT IS A ROUTER?
#   A router is a group of related endpoints. We define them in separate files
#   (routers/auth.py, routers/sessions.py) and "mount" them here.
# ==============================================================================

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, sessions


# ── Lifespan handler ───────────────────────────────────────────────────────────
# `lifespan` is the modern FastAPI way to run code on startup and shutdown.
# Replaces the old @app.on_event("startup") / @app.on_event("shutdown").
#
# Everything BEFORE `yield` runs on startup.
# Everything AFTER `yield` runs on shutdown.
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────────
    # Future: create DB tables, start background workers, warm caches.
    # For now, Alembic handles migrations — we don't auto-create tables here.
    print("✓ auth-service started")
    yield
    # ── Shutdown ───────────────────────────────────────────────────────────────
    print("auth-service shutting down")


# ── FastAPI app instance ───────────────────────────────────────────────────────
app = FastAPI(
    title="OrbitDesk Auth Service",
    description="Handles signup, login, JWT tokens, and session management.",
    version="1.0.0",
    # /docs shows Swagger UI (interactive API explorer)
    # /redoc shows ReDoc (alternative docs UI)
    # Both are auto-generated from your route definitions and Pydantic schemas.
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── CORS Middleware ────────────────────────────────────────────────────────────
# CORS (Cross-Origin Resource Sharing) is a browser security feature.
# Without this, a JavaScript app at http://localhost:5173 would be BLOCKED
# from calling http://localhost:3001 because they're on different ports.
#
# allow_origins: which domains can call this API.
#   In dev, we allow localhost on typical frontend ports.
#   In production, this should be your actual domain only.
#
# allow_credentials: allow cookies and Authorization headers to be sent.
# allow_methods: which HTTP methods are permitted.
# allow_headers: which request headers the browser can send.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server (shell MFE)
        "http://localhost:8000",   # API Gateway
        "http://localhost:3000",   # Alternative React dev port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register routers ───────────────────────────────────────────────────────────
# include_router() mounts a router onto the app.
# prefix="/auth" means all routes in auth.router get the "/auth" prefix.
#   e.g., router.post("/signup") becomes POST /auth/signup
#   e.g., router.get("/me")      becomes GET  /auth/me
app.include_router(auth.router, prefix="/auth")
app.include_router(sessions.router, prefix="/auth")


# ── Health check ───────────────────────────────────────────────────────────────
# Used by Docker health checks and the API Gateway to verify this service is up.
# Returns 200 OK if the process is running. Does NOT check DB connectivity.
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "auth-service"}
