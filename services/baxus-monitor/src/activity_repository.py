"""Repository for managing baxus_listings in the database."""

from datetime import datetime, timedelta

from sqlalchemy import func
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
        record = self.session.query(ActivityTypes).filter(
            ActivityTypes.activity_type_code == activity_type_code,
        ).first()

        return record.activity_type_idx

    def get_max_activity_idx(self, asset_idx: int, activity_type_idx: int) -> int | None:
        """
        Returns the highest activity_idx for the given asset_idx and activity_type_idx.

        Returns None if no activities exist for this combination.
        """
        max_idx = self.session.query(
            func.max(ActivityFeed.activity_idx)
        ).filter(
            ActivityFeed.asset_idx == asset_idx,
            ActivityFeed.activity_type_idx == activity_type_idx
        ).scalar()

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
        record = self.session.query(ActivityFeed).filter(
            ActivityFeed.activity_date >= listed_date,
            ActivityFeed.asset_idx == asset_idx,
            ActivityFeed.price == price,
            ActivityFeed.activity_date == listed_date,
            ActivityFeed.activity_type_idx == activity_type_idx
        ).first()
        if record is not None:
            return True
        else:
            return False

    def record_exists_with_threshold(self, asset_idx: int, price: float, listed_date: datetime, activity_type_idx: int, threshold_secs: int) -> bool:
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
        
        record = self.session.query(ActivityFeed).filter(
            ActivityFeed.asset_idx == asset_idx,
            ActivityFeed.price == price,
            ActivityFeed.activity_type_idx == activity_type_idx,
            ActivityFeed.activity_date >= (listed_date - delta),
            ActivityFeed.activity_date <= (listed_date + delta)
        ).first()
        
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
            activity_type_idx=activity_type_idx,
            asset_idx=asset_idx,
            price=price,
            activity_date=activity_date
        )

        self.session.add(record)
        self.session.commit()
        logger.info("Added Record {r}".format(r=record))
        return record.activity_idx
