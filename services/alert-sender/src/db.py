"""Database connection and session management."""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import QueuePool
from sqlalchemy.engine import Connection
from .config import Config, config
from .log import get_logger

logger = get_logger()


class Database:
    """Database connection manager."""

    def __init__(self, config: Config):
        self.config = config
        self.engine = create_engine(
            config.get_db_connection_string(),
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            echo=False,  # set to True only for debugging
        )
        self.SessionLocal = sessionmaker(bind=self.engine)

    def get_session(self) -> Session:
        """Get a new database session."""
        return self.SessionLocal()

    def get_connection(self) -> Connection:
        """
        Get a raw SQLAlchemy Core connection (supports .cursor() for psycopg2/pg8000).
        Must be used with try/finally or context manager.
        """
        return self.engine.connect()

    def close(self):
        """Close the database engine."""
        self.engine.dispose()


if __name__ == "__main__":
    print("Testing database connection...")
    db = Database(config)

    try:
        # Simple "SELECT 1" test
        with db.engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            value = result.scalar()
            print("Connection successful! SELECT 1 →", value)

        # Test reading last_seen from current_index table
        with db.engine.connect() as conn:
            result = conn.execute(text("SELECT last_seen FROM baxus.current_index"))
            last_seen = result.scalar()
            print(f"Current last_seen index = {last_seen}")

        print("Everything works perfectly!")

    except Exception as e:
        print("Connection failed:", e)
        raise
