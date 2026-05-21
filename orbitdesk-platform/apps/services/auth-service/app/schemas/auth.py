# ==============================================================================
# app/schemas/auth.py — Pydantic request/response schemas
# ==============================================================================
#
# WHAT ARE SCHEMAS?
#   Schemas are "blueprints" for the data that flows IN and OUT of your API.
#
#   - REQUEST schemas:  validate & parse what the client sends (POST body, etc.)
#   - RESPONSE schemas: define exactly what JSON your API returns.
#
# WHY SEPARATE SCHEMAS FROM MODELS?
#   Your database model (User) contains sensitive fields like `password_hash`.
#   You NEVER want to accidentally return that in an API response.
#   Schemas act as a filter — you explicitly choose what to expose.
#
# PYDANTIC VALIDATION:
#   When FastAPI receives a request, it automatically validates the body against
#   the schema. If `email` is missing or `password` is too short, FastAPI returns
#   a 422 error with a clear message — you don't write any validation logic.
#
# NAMING CONVENTION used here:
#   *Request  → what the client sends TO the API
#   *Response → what the API sends BACK to the client
# ==============================================================================

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


# ── Signup ─────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    """
    Body for POST /auth/signup.
    Fields match the "Create your account" form in your UI.
    """
    # Field(...) means "required, no default". The description shows in /docs.
    full_name: str = Field(..., min_length=1, max_length=255, description="User's full name")
    email: EmailStr = Field(..., description="Must be a valid email address")

    # min_length=8 enforces the "Min. 8 characters" hint shown in your UI.
    password: str = Field(..., min_length=8, description="Plain text password (hashed before storage)")
    confirm_password: str = Field(..., min_length=8, description="Must match password")

    workspace_name: str = Field(..., min_length=1, max_length=255, description="e.g. Acme Corp")
    timezone: str = Field(default="UTC", max_length=100, description="e.g. Asia/Calcutta")

    # Whether the user ticked "I agree to the Terms of Service and Privacy Policy"
    agreed_to_terms: bool = Field(..., description="Must be True to create account")

    # @field_validator runs after Pydantic parses the fields.
    # `mode="after"` means we validate the whole model, not a single field.
    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, confirm_password: str, info) -> str:
        """Raise an error if confirm_password doesn't match password."""
        if "password" in info.data and confirm_password != info.data["password"]:
            raise ValueError("Passwords do not match")
        return confirm_password

    @field_validator("agreed_to_terms")
    @classmethod
    def must_agree_to_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must agree to the Terms of Service")
        return v


# ── Login ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """
    Body for POST /auth/login.
    Matches the "Welcome back" login form in your UI.
    """
    email: EmailStr
    password: str = Field(..., min_length=1)

    # From the "Remember me" checkbox in your login UI.
    # When True, refresh token TTL is extended (not yet implemented but field is here).
    remember_me: bool = Field(default=False)


# ── Token responses ────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    """
    Returned after successful login or signup.
    The client stores these tokens and sends `access_token` in every request.
    """
    access_token: str   # Short-lived JWT — send in Authorization: Bearer <token>
    refresh_token: str  # Long-lived — use POST /auth/refresh to get a new access_token
    token_type: str = "bearer"  # OAuth2 standard — always "bearer"
    expires_in: int     # Access token lifetime in seconds (e.g., 900 = 15 min)


class RefreshRequest(BaseModel):
    """Body for POST /auth/refresh."""
    refresh_token: str = Field(..., description="The refresh token from your last login")


# ── User info ──────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    """
    Safe representation of a User — never includes password_hash.
    Returned alongside tokens after signup/login, and by GET /auth/me.
    """
    id: uuid.UUID
    full_name: str
    email: str
    workspace_name: str
    timezone: str
    role: UserRole
    is_active: bool
    email_verified: bool
    created_at: datetime

    # `model_config` with `from_attributes=True` tells Pydantic it can read
    # fields directly from a SQLAlchemy model object (not just a dict).
    # Without this, `UserResponse.model_validate(user_db_object)` would fail.
    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    """
    Combined response after signup or login.
    Contains both token info and user profile in one response.
    """
    tokens: TokenResponse
    user: UserResponse


# ── Sessions ───────────────────────────────────────────────────────────────────

class SessionResponse(BaseModel):
    """
    One active session — shown in a "your active logins" list.
    """
    id: uuid.UUID
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    expires_at: datetime
    is_current: bool = False  # Set to True for the session making this request

    model_config = {"from_attributes": True}


# ── Generic responses ──────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    """Simple success/info message response."""
    message: str
