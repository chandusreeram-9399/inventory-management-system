"""
Database connection and session management.

The connection string is read entirely from the DATABASE_URL environment
variable so that no credentials are ever hardcoded in source control.
Docker Compose / your hosting platform should inject this value.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL"
)

if DATABASE_URL.startswith("sqlite"):
    # Used by the test suite (in-memory SQLite). StaticPool keeps a single
    # shared connection alive so tables created at startup persist across
    # requests within the same process.
    from sqlalchemy import event
    from sqlalchemy.pool import StaticPool

    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    # pool_pre_ping avoids "server closed the connection unexpectedly"
    # errors after the DB has been idle (common on free-tier hosting).
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
