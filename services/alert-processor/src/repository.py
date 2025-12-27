"""Database repository for alerts and matches."""
from sqlalchemy import text

from .config import config
from .db import Database
from .log import get_logger
from .models import Alert

logger = get_logger()

# Column names for alerts query
ALERT_COLUMNS = [
    "id",
    "user_id",
    "name",
    "match_strings",
    "match_all",
    "max_price",
    "bottled_year_min",
    "bottled_year_max",
    "age_min",
    "age_max",
    "user_email"
]


def get_alerts() -> list[Alert]:
    """Fetch all active alerts from the database."""
    db = Database(config=config)
    conn = db.get_connection()
    try:
        result = conn.execute(
            text("""
            SELECT id, user_id, name, match_strings, match_all, max_price, 
                   bottled_year_min, bottled_year_max, age_min, age_max,
                   user_email
            FROM alerts_with_email_consent
        """)
        )
        rows = result.fetchall()
        return [Alert.from_row(row, ALERT_COLUMNS) for row in rows]
    finally:
        conn.close()
        db.close()


def insert_alert_match(
    alert_id: int,
    listing_source: str,
    activity_idx: int | None,
    asset_idx: int,
) -> int | None:
    """Insert a match into the alert_matches table and return the new row id."""
    db = Database(config=config)
    conn = db.get_connection()
    try:
        result = conn.execute(
            text("""
                INSERT INTO alert_matches 
                    (alert_id, listing_source, activity_idx, asset_idx)
                VALUES 
                    (:alert_id, :listing_source, :activity_idx, :asset_idx)
                RETURNING match_idx
            """),
            {
                "alert_id": alert_id,
                "listing_source": listing_source,
                "activity_idx": activity_idx,
                "asset_idx": asset_idx,
            },
        )
        match_idx = result.scalar()          # fetchone()[0] works too
        conn.commit()
        return match_idx
    finally:
        conn.close()
        db.close()
