# ==============================================================================
# app/routers/sessions.py — Session management endpoints
# ==============================================================================
#
# ENDPOINTS:
#   GET    /auth/sessions         → list all active sessions for the current user
#   DELETE /auth/sessions/{id}    → revoke a specific session (remote logout)
#   DELETE /auth/sessions         → revoke ALL sessions (logout everywhere)
#
# USE CASE:
#   These endpoints power a "Your active logins" page where users can see:
#     - Which devices are logged in
#     - When each session was created
#     - Their IP addresses
#   And they can click "Log out" next to any device to revoke that session.
#
# SECURITY NOTE:
#   We always filter sessions by `user_id = current_user.id`.
#   This ensures users can ONLY manage their own sessions — never someone else's.
# ==============================================================================

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.jwt import hash_refresh_token
from app.core.rbac import get_current_user
from app.db.session import get_db
from app.models.user import Session as DBSession
from app.models.user import User
from app.schemas.auth import MessageResponse, SessionResponse

router = APIRouter(tags=["Sessions"])


# ==============================================================================
# GET /auth/sessions
# ==============================================================================
@router.get(
    "/sessions",
    response_model=list[SessionResponse],
    summary="List all active login sessions",
)
async def list_sessions(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return all non-revoked, non-expired sessions for the current user.

    The `is_current` flag is set to True on the session that matches the
    current request's refresh token — so the UI can show "This device".

    Note: We don't have the refresh token in this endpoint (it's not sent
    here), so we identify the current session by matching the IP + user-agent.
    This is a best-effort heuristic, not a perfect match.
    """
    now = datetime.now(timezone.utc)

    # Query all valid (not revoked, not expired) sessions for this user.
    result = await db.execute(
        select(DBSession).where(
            DBSession.user_id == current_user.id,
            DBSession.revoked_at.is_(None),          # not revoked
            DBSession.expires_at > now,               # not expired
        ).order_by(DBSession.created_at.desc())       # newest first
    )
    sessions = result.scalars().all()

    # Identify the "current" session by matching IP + user-agent.
    current_ip = _get_client_ip(request)
    current_ua = request.headers.get("user-agent")

    response_list = []
    for session in sessions:
        is_current = (
            session.ip_address == current_ip
            and session.user_agent == current_ua
        )
        # model_validate() converts the SQLAlchemy object into the Pydantic schema.
        # We use model_copy() to set the extra `is_current` field.
        s = SessionResponse.model_validate(session)
        s.is_current = is_current
        response_list.append(s)

    return response_list


# ==============================================================================
# DELETE /auth/sessions/{session_id}
# ==============================================================================
@router.delete(
    "/sessions/{session_id}",
    response_model=MessageResponse,
    summary="Revoke a specific session (log out one device)",
)
async def revoke_session(
    session_id: uuid.UUID,            # FastAPI parses the path param as a UUID automatically
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Revoke a specific session by its ID.

    The session must belong to the current user — we enforce this in the
    WHERE clause so users cannot revoke other users' sessions even if they
    know the session UUID.
    """
    result = await db.execute(
        select(DBSession).where(
            DBSession.id == session_id,
            DBSession.user_id == current_user.id,   # ownership check
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    if session.revoked_at is not None:
        return MessageResponse(message="Session was already revoked.")

    session.revoked_at = datetime.now(timezone.utc)
    await db.commit()

    return MessageResponse(message="Session revoked successfully.")


# ==============================================================================
# DELETE /auth/sessions  (revoke ALL)
# ==============================================================================
@router.delete(
    "/sessions",
    response_model=MessageResponse,
    summary="Revoke all sessions (log out everywhere)",
)
async def revoke_all_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Revoke every active session for the current user.
    Useful for "log out of all devices" in security settings.

    Note: the current access token is still valid until it expires (we don't
    store access tokens — they're stateless JWTs). Only future refresh
    attempts will fail.
    """
    now = datetime.now(timezone.utc)

    # Get all non-revoked sessions for this user
    result = await db.execute(
        select(DBSession).where(
            DBSession.user_id == current_user.id,
            DBSession.revoked_at.is_(None),
        )
    )
    sessions = result.scalars().all()

    for session in sessions:
        session.revoked_at = now

    await db.commit()

    return MessageResponse(message=f"Revoked {len(sessions)} session(s).")


# ── Helper ─────────────────────────────────────────────────────────────────────

def _get_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else None
