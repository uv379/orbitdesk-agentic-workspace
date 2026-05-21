# Import all models here so Alembic's env.py can discover them
# when it imports `from app.models import user`.
# Without this, --autogenerate would produce empty migrations.
from app.models.user import Session, User, UserRole  # noqa: F401
