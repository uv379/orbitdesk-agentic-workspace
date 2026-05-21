# ==============================================================================
# app/models/user.py — SQLAlchemy database models (tables)
# ==============================================================================
#
# WHAT ARE MODELS?
#   A SQLAlchemy model is a Python class that maps to a database table.
#   Each class attribute with `mapped_column()` becomes a column in the table.
#
# TWO TABLES DEFINED HERE:
#   1. User    — stores account info (from your signup UI)
#   2. Session — stores active login sessions (for refresh tokens + revocation)
#
# RELATIONSHIP:
#   One User → Many Sessions (a user can be logged in from multiple devices)
#
# NOTE ON `Mapped[type]`:
#   This is SQLAlchemy 2.0 syntax. `Mapped[str]` means "this column holds a
#   string and is NOT NULL". `Mapped[Optional[str]]` means "nullable column".
# ==============================================================================

import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


# ── Role enum ──────────────────────────────────────────────────────────────────
# Defines the two possible roles a user can have in a workspace.
# `PyEnum` (Python's built-in enum) is used here; SQLAlchemy stores it as
# a VARCHAR with a CHECK constraint in Postgres.
class UserRole(str, PyEnum):
    ADMIN = "admin"    # Workspace owner — full permissions
    MEMBER = "member"  # Regular user — limited permissions


# ── User model → maps to the "users" table ─────────────────────────────────────
class User(Base):
    # __tablename__ tells SQLAlchemy what to name the table in PostgreSQL.
    __tablename__ = "users"

    # Primary key: UUID instead of auto-increment integer.
    # UUIDs are better for distributed systems — no collision between services.
    # default=uuid.uuid4 means Python generates the UUID before inserting.
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Fields from your Signup UI ─────────────────────────────────────────────

    # "Full name" field in signup form
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # "Email" field — must be unique across all users (login identifier)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)

    # Never store plain passwords! We store the bcrypt hash instead.
    # The original password is never recoverable from this hash.
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)

    # "Workspace name" field in signup form (e.g., "Acme Corp")
    workspace_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # "Timezone" field in signup form (e.g., "Asia/Calcutta")
    timezone: Mapped[str] = mapped_column(String(100), nullable=False, default="UTC")

    # ── Access control ─────────────────────────────────────────────────────────

    # Role: "admin" (workspace creator) or "member" (invited user).
    # First user to create a workspace gets admin role automatically.
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=False, default=UserRole.ADMIN
    )

    # Soft-delete: instead of deleting the row, set is_active=False.
    # This preserves data for audit trails and makes re-activation possible.
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)

    # Email verification flag. Set to True after user clicks the verification link.
    # Currently not enforced at login — placeholder for future email verification flow.
    email_verified: Mapped[bool] = mapped_column(nullable=False, default=False)

    # ── Timestamps ─────────────────────────────────────────────────────────────

    # server_default=func.now() → PostgreSQL sets this to NOW() on INSERT.
    # We also set Python-side default for consistency.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # onupdate=func.now() → PostgreSQL updates this automatically on every UPDATE.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    # "A user has many sessions." This lets you do `user.sessions` to get all
    # their login sessions. `back_populates` links the two sides of the relation.
    # `cascade="all, delete-orphan"` → deleting a user also deletes their sessions.
    sessions: Mapped[List["Session"]] = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"


# ── Session model → maps to the "sessions" table ──────────────────────────────
# Each row = one active login (one device / one browser tab).
# Storing sessions lets us:
#   - List all active logins for a user
#   - Revoke individual sessions (remote logout)
#   - Detect token theft (if a refresh token is used after revocation)
class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Foreign key → links this session to a user.
    # ON DELETE CASCADE: if the user is deleted, all their sessions are too.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # We store the HASH of the refresh token, not the token itself.
    # If this table leaks, attackers can't use the hashes — same principle as passwords.
    refresh_token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    # Device/browser info — shown in "active sessions" list in UI.
    # Optional because mobile apps or automated clients may not send these.
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))   # IPv6 max = 45 chars
    user_agent: Mapped[Optional[str]] = mapped_column(Text)          # e.g. "Mozilla/5.0 ..."

    # When this refresh token expires. After this, the session is dead even if
    # it was never explicitly revoked.
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Set when the user logs out or an admin revokes the session.
    # NULL = still active. Non-NULL = revoked at that time.
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Back-reference to the User. Lets you do `session.user` to get the User object.
    user: Mapped["User"] = relationship("User", back_populates="sessions")

    @property
    def is_valid(self) -> bool:
        """Returns True if the session is not revoked and not expired."""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        return self.revoked_at is None and self.expires_at > now

    def __repr__(self) -> str:
        return f"<Session id={self.id} user_id={self.user_id} valid={self.is_valid}>"
