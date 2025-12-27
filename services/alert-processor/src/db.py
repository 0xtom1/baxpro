"""Database connection and session management."""

from sqlalchemy import create_engine
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import QueuePool

from .config import Config
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
