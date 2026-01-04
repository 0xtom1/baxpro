"""Repository for managing baxus_listings in the database."""

from datetime import datetime, timedelta

from sqlalchemy import func, text
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session

from .models import ActivityFeed, ActivityTypes
from .utils.log import get_logger

logger = get_logger()


class ActivityRepository:
    """Repository for CRUD operations on AssetDetails."""

    def __init__(self, session: Session = None, conn: Connection = None):
        self.session = session
        self.conn = conn

    def get_activity_type_idx(self, activity_type_code: str) -> int:
        """Get the activity type index for a given activity code.

        Args:
            activity_type_code: The activity type code (e.g., "NEW_LISTING").

        Returns:
            int: The activity_type_idx for the matching record.
        """
        record = (
            self.session.query(ActivityTypes)
            .filter(
                ActivityTypes.activity_type_code == activity_type_code,
            )
            .first()
        )

        return record.activity_type_idx

    def get_activity_type_map(self) -> dict[int, str]:
        """Return a dictionary mapping activity_type_idx to activity_type_code.

        Returns:
            dict[int, str]: {activity_type_idx: activity_type_code, ...}
        """
        results = self.session.query(ActivityTypes.activity_type_code, ActivityTypes.activity_type_idx).all()

        return dict(results)

    def get_max_activity_idx(self, asset_idx: int, activity_type_idx: int) -> int | None:
        """
        Returns the highest activity_idx for the given asset_idx and activity_type_idx.

        Returns None if no activities exist for this combination.
        """
        max_idx = (
            self.session.query(func.max(ActivityFeed.activity_idx))
            .filter(ActivityFeed.asset_idx == asset_idx, ActivityFeed.activity_type_idx == activity_type_idx)
            .scalar()
        )

        return max_idx

    def record_exists(self, asset_idx: int, price: float, listed_date: datetime, activity_type_idx: int) -> bool:
        """Check if an activity record exists with exact matching criteria.

        Args:
            asset_idx: The asset index to check.
            price: The price to match.
            listed_date: The exact activity date to match.
            activity_type_idx: The activity type to match.

        Returns:
            bool: True if a matching record exists.
        """
        record = (
            self.session.query(ActivityFeed)
            .filter(
                ActivityFeed.activity_date >= listed_date,
                ActivityFeed.asset_idx == asset_idx,
                ActivityFeed.price == price,
                ActivityFeed.activity_date == listed_date,
                ActivityFeed.activity_type_idx == activity_type_idx,
            )
            .first()
        )
        if record is not None:
            return True
        else:
            return False

    def record_exists_with_threshold(
        self, asset_idx: int, price: float, listed_date: datetime, activity_type_idx: int, threshold_secs: int
    ) -> bool:
        """Check if an activity record exists within a time threshold.

        Args:
            asset_idx: The asset index to check.
            price: The price to match.
            listed_date: The reference activity date.
            activity_type_idx: The activity type to match.
            threshold_secs: Time window in seconds around listed_date.

        Returns:
            bool: True if a matching record exists within the threshold.
        """
        delta = timedelta(seconds=threshold_secs)

        record = (
            self.session.query(ActivityFeed)
            .filter(
                ActivityFeed.asset_idx == asset_idx,
                ActivityFeed.price == price,
                ActivityFeed.activity_type_idx == activity_type_idx,
                ActivityFeed.activity_date >= (listed_date - delta),
                ActivityFeed.activity_date <= (listed_date + delta),
            )
            .first()
        )

        return record is not None

    def insert(self, activity_type_idx: int, asset_idx: int, price: float, activity_date: datetime) -> int:
        """Insert a new activity feed record.

        Args:
            activity_type_idx: The type of activity being recorded.
            asset_idx: The asset this activity relates to.
            price: The price at the time of activity.
            activity_date: When the activity occurred.

        Returns:
            int: The activity_idx of the newly inserted record.
        """

        record = ActivityFeed(
            activity_type_idx=activity_type_idx, asset_idx=asset_idx, price=price, activity_date=activity_date
        )

        self.session.add(record)
        self.session.commit()
        logger.info(f"Added Record {record}")
        return record.activity_idx

    def insert_many(self, activity_feeds: list[ActivityFeed]) -> list[int]:
        """Insert multiple ActivityFeed records in a single transaction.

        Args:
            activity_feeds: List of ActivityFeed objects to insert.

        Returns:
            list[int]: The activity_idx values of the newly inserted records,
                    in the same order as the input list.
        """
        if not activity_feeds:
            return []

        self.session.add_all(activity_feeds)
        self.session.commit()

        # Return the primary keys in the order they were provided
        logger.info(f"Added {len(activity_feeds)} ActivityFeed records")
        return [af.activity_idx for af in activity_feeds]

    def get_latest_processed_signature(self):
        """Fetch all attributes JSON from stored assets.

        Returns:
            list: List of tuples containing attributes JSON for each asset.
        """
        result = self.conn.execute(
            text(
                """
                    SELECT
                        metadata_value
                    FROM "baxus"."sys_metadata"
                    WHERE metadata_key = 'MAX_SIGNATURE'
                    LIMIT 1

        """
            )
        )
        rows = result.fetchone()
        return rows

    def update_latest_processed_signature(self) -> None:
        """Update the MAX_SIGNATURE metadata value to the signature from the latest activity_date (where signature is not null)."""

        # Subquery to find the max activity_date with a non-null signature
        find_latest_sig_query = text(
            """
            SELECT signature
            FROM "baxus"."activity_feed"
            WHERE signature IS NOT NULL
            AND activity_date = (
                SELECT MAX(activity_date)
                FROM "baxus"."activity_feed"
                WHERE signature IS NOT NULL
            )
            LIMIT 1
        """
        )

        result = self.conn.execute(find_latest_sig_query)
        row = result.fetchone()

        if row is None or row[0] is None:
            # No activities with signature yet — maybe leave unchanged, or set to empty/null?
            # Here we'll skip updating (or you can set to None/'')
            return

        new_signature = row[0]

        # Now update the sys_metadata table
        update_query = text(
            """
            UPDATE "baxus"."sys_metadata"
            SET metadata_value = :new_signature
            WHERE metadata_key = 'MAX_SIGNATURE'
        """
        )

        update_result = self.conn.execute(update_query, {"new_signature": new_signature})
        if update_result.rowcount == 0:
            raise ValueError("No row found for metadata_key = 'MAX_SIGNATURE'. Cannot update.")

        self.conn.commit()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def close(self):
        """Clean up resources."""
        pass
