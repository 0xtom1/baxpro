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
        """Fetch a listing by its external Baxus ID."""
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
        """
        Insert or update a listing. 
        Returns (listing, is_new) tuple where is_new indicates if this was a new listing.
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
        """
            Check if a matching activity record exists where activity_date is within 1 minute of listed_date.
            Returns True if such a record exists, False otherwise.
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
        """
        Insert or update a listing.
        Returns is_new bool where is_new indicates if this was a new asset.
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
