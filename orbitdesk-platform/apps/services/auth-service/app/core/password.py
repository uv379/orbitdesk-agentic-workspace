# ==============================================================================
# app/core/password.py — Password hashing and verification using bcrypt
# ==============================================================================
#
# WHY BCRYPT?
#   Bcrypt is deliberately slow. It runs thousands of rounds of computation,
#   making brute-force and rainbow-table attacks impractical even if an attacker
#   steals your database.
#
#   NEVER use MD5, SHA1, or plain SHA256 for passwords — those are fast hashes
#   designed for checksums, not security. bcrypt (or argon2) is the standard.
#
# HOW IT WORKS:
#   hash_password("secret123") → "$2b$12$randomsalt...hashedvalue"
#     - $2b$    = bcrypt algorithm
#     - $12$    = cost factor (2^12 = 4096 rounds, ~100ms on modern hardware)
#     - next 22 chars = random salt (auto-generated, different every time!)
#     - rest    = the actual hash
#
#   Because the salt is random, hashing the same password twice gives DIFFERENT
#   results — that's by design. verify_password() uses the stored salt to
#   reproduce the hash and compare.
#
# USAGE:
#   from app.core.password import hash_password, verify_password
#   stored = hash_password("mypassword")      # on signup
#   ok = verify_password("mypassword", stored) # on login → True
#   ok = verify_password("wrongpass", stored)  # → False
# ==============================================================================

import bcrypt

# bcrypt is used directly here instead of passlib because passlib 1.7.4
# is incompatible with bcrypt 4.x+ (it crashes on a 72-byte internal test).
# Using bcrypt directly is simpler and has no compatibility issues.


def hash_password(plain_password: str) -> str:
    """
    Hash a plain-text password using bcrypt.
    Call this ONCE on signup before saving to the database.

    .encode('utf-8') converts the string to bytes — bcrypt works on bytes.
    gensalt() generates a random salt automatically (different each call).
    .decode('utf-8') converts the result back to a string for DB storage.
    """
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Check if a plain-text password matches the stored bcrypt hash.
    Returns True if match, False otherwise.
    Call this on every login attempt.
    """
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
