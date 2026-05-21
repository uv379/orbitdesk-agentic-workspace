# ==============================================================================
# app/core/rbac.py — Role-Based Access Control (RBAC) dependencies
# ==============================================================================
#
# WHAT IS RBAC?
#   Role-Based Access Control means users have a "role" and certain API endpoints
#   are only accessible to users with the right role.
#
#   OrbitDesk has two roles:
#     admin  → workspace creator, can manage members, billing, settings
#     member → regular user, can use the workspace but not manage it
#
# HOW FASTAPI DEPENDENCIES WORK:
#   A "dependency" in FastAPI is a function you declare as a parameter using
#   `Depends(some_function)`. FastAPI calls that function automatically and
#   injects its return value into your route handler.
#
#   This file provides TWO types of dependencies:
#
#   1. `get_current_user`  — extracts the user from the JWT access token.
#      Use this on ANY route that requires a logged-in user.
#
#   2. `require_role(role)` — factory that returns a dependency requiring
#      a specific role. Use this on admin-only routes.
#
# USAGE EXAMPLES:
#
#   # Any authenticated user:
#   @router.get("/sessions")
#   async def list_sessions(user = Depends(get_current_user)):
#       ...
#
#   # Admin only:
#   @router.delete("/workspace")
#   async def delete_workspace(user = Depends(require_role(UserRole.ADMIN))):
#       ...
# ==============================================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.jwt import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserRole

# HTTPBearer extracts the token from the "Authorization: Bearer <token>" header.
# auto_error=False means FastAPI won't auto-reject missing headers — we handle
# that ourselves below with a cleaner error message.
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency: extract and validate the current user from the JWT.

    Flow:
      1. Extract the Bearer token from the Authorization header.
      2. Decode and verify the JWT signature + expiry.
      3. Look up the user in the database (ensures the user still exists + is active).
      4. Return the User object — route handlers can use it directly.

    Raises HTTP 401 if anything is wrong (missing token, expired, user not found).
    """
    # Define the 401 error we'll raise if auth fails.
    # WWW-Authenticate: Bearer is an HTTP standard header that tells clients
    # how to authenticate (used by browsers and HTTP clients).
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Check if the Authorization header was present at all.
    if not credentials:
        raise unauthorized

    # Decode the JWT — returns None if invalid/expired.
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise unauthorized

    # `sub` claim contains the user's UUID (set in jwt.py create_access_token).
    user_id = payload.get("sub")
    if not user_id:
        raise unauthorized

    # Verify the user still exists in the DB and is active.
    # This catches cases like: account deleted after token was issued.
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()

    if not user:
        raise unauthorized

    return user


def require_role(required_role: UserRole):
    """
    Dependency factory: returns a FastAPI dependency that enforces a minimum role.

    This is a function that RETURNS another function — the inner function
    is what FastAPI calls as a dependency. This pattern is called a
    "dependency factory" or "parameterized dependency".

    Args:
        required_role: The UserRole that the endpoint requires.

    Returns:
        An async function that FastAPI can use as a `Depends()` argument.
    """
    async def _check_role(current_user: User = Depends(get_current_user)) -> User:
        """Inner dependency: checks the role of the already-authenticated user."""
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires the '{required_role.value}' role.",
            )
        return current_user

    return _check_role
