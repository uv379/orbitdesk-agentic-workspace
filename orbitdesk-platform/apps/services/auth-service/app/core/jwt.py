# ==============================================================================
# app/core/jwt.py — JWT token creation and verification
# ==============================================================================
#
# WHAT IS A JWT?
#   A JSON Web Token is a self-contained string with 3 parts, separated by dots:
#     header.payload.signature
#
#   - Header:    algorithm used (HS256)
#   - Payload:   the data you embed (user id, role, expiry time)
#   - Signature: HMAC of header+payload using your JWT_SECRET
#
#   Anyone can BASE64-decode the payload and READ it — don't put secrets there.
#   But they can't FORGE a valid signature without knowing JWT_SECRET.
#
# TWO TOKEN TYPES:
#   Access Token  (short-lived, 15min default)
#     → sent in Authorization header on every request
#     → used by the API Gateway to verify identity
#     → if stolen, expires quickly
#
#   Refresh Token (long-lived, 7 days default)
#     → stored securely by the client (httpOnly cookie or secure storage)
#     → only sent to POST /auth/refresh to get a new access token
#     → we store a HASH of it in the DB so we can revoke it
#
# FLOW:
#   Login → create both tokens → return to client
#   Client request → send access_token in header → gateway decodes it
#   Access expired → client sends refresh_token to /auth/refresh → get new access_token
#   Logout → mark refresh_token as revoked in DB → both tokens dead
# ==============================================================================

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.core.config import settings


# ── Token type identifiers ─────────────────────────────────────────────────────
# Stored in the JWT payload as `type`. We check this on decode to prevent
# using a refresh token where an access token is expected (and vice versa).
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def _parse_duration(duration_str: str) -> timedelta:
    """
    Parse a duration string like "15m", "1h", "7d" into a timedelta.
    Used to convert JWT_ACCESS_EXPIRES and JWT_REFRESH_EXPIRES env vars.
    """
    unit = duration_str[-1]   # last character: 'm', 'h', or 'd'
    value = int(duration_str[:-1])  # everything before the last char
    if unit == "m":
        return timedelta(minutes=value)
    elif unit == "h":
        return timedelta(hours=value)
    elif unit == "d":
        return timedelta(days=value)
    raise ValueError(f"Unknown duration unit '{unit}' in '{duration_str}'. Use m/h/d.")


def create_access_token(
    user_id: uuid.UUID,
    role: str,
    email: str,
    workspace_name: str,
) -> tuple[str, int]:
    """
    Create a short-lived JWT access token.

    Args:
        user_id:        The user's UUID (stored as `sub` — standard JWT "subject" claim).
        role:           The user's role string ("admin" or "member").
        email:          The user's email — the API gateway reads this from the token
                        and forwards it as x-user-email to downstream services.
        workspace_name: The user's workspace name — the gateway forwards this as
                        x-workspace-id. IMPORTANT: this must match what the gateway
                        expects in its JwtPayload interface (field name: workspaceId).

    Returns:
        Tuple of (token_string, expires_in_seconds).
        expires_in_seconds is returned so the client knows when to refresh.
    """
    duration = _parse_duration(settings.jwt_access_expires)
    expire = datetime.now(timezone.utc) + duration

    # The payload (called "claims" in JWT terminology).
    # `sub`         = subject (standard JWT claim — who this token is about)
    # `exp`         = expiration time (standard JWT claim — jose validates this automatically)
    # `iat`         = issued at (standard JWT claim — when the token was created)
    # `email`       = required by the API gateway's AuthMiddleware (auth.middleware.ts:40)
    # `workspaceId` = required by the API gateway — must use camelCase to match the
    #                 TypeScript interface in apps/api-gateway/src/middleware/auth.middleware.ts
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "workspaceId": workspace_name,  # camelCase matches the gateway's JwtPayload interface
        "type": ACCESS_TOKEN_TYPE,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }

    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    expires_in = int(duration.total_seconds())
    return token, expires_in


def create_refresh_token() -> tuple[str, str, datetime]:
    """
    Create a long-lived refresh token.

    Unlike the access token, the refresh token is NOT a JWT — it's a random
    opaque string. This is intentional: refresh tokens should be treated like
    passwords (validated against the DB), not self-contained like JWTs.

    Returns:
        Tuple of:
          - raw_token:   the token string to give to the client
          - token_hash:  SHA-256 hash to store in the database
          - expires_at:  datetime when this token expires
    """
    # secrets.token_urlsafe generates a cryptographically random URL-safe string.
    # 64 bytes → 86-character base64 string. Sufficient entropy to be unguessable.
    raw_token = secrets.token_urlsafe(64)

    # Hash the token before storing — if the DB leaks, attackers get useless hashes.
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    duration = _parse_duration(settings.jwt_refresh_expires)
    expires_at = datetime.now(timezone.utc) + duration

    return raw_token, token_hash, expires_at


def hash_refresh_token(raw_token: str) -> str:
    """
    Hash a raw refresh token for DB lookup.
    Used when validating a /refresh request — we hash the incoming token
    and look it up in the sessions table.
    """
    return hashlib.sha256(raw_token.encode()).hexdigest()


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.

    Returns the payload dict if valid, or None if:
      - Token is expired
      - Signature is invalid (tampered or wrong secret)
      - Token is a refresh token (wrong type)

    The caller decides what to do with None (usually: return 401 Unauthorized).
    """
    try:
        # jwt.decode verifies the signature AND checks exp automatically.
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])

        # Reject refresh tokens presented as access tokens.
        if payload.get("type") != ACCESS_TOKEN_TYPE:
            return None

        return payload

    except JWTError:
        # JWTError covers: expired, invalid signature, malformed token, etc.
        return None
