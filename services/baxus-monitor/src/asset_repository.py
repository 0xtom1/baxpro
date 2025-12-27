"""Repository for managing baxus_listings in the database."""

from typing import Optional

from sqlalchemy import null, text
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session

from .models import AssetDetails, AssetJsonFeed
from .utils.clean_asset_data import (
    _parse_datetime,
    _parse_float,
    _parse_int,
    update_if_changed,
)
from .utils.log import get_logger

logger = get_logger()


class AssetRepository:
    """Repository for CRUD operations on AssetDetails."""

    def __init__(self, session: Session = None, conn: Connection = None):
        self.session = session
        self.conn = conn

    def is_table_empty(self) -> bool:
        """Check if the asset_details table contains any records.

        Returns:
            bool: True if the table is empty, False otherwise.
        """
        record = self.session.query(AssetDetails).first()
        if not record:
            logger.info("Table is empty")
        return record is None

    def should_process_all_assets(self) -> bool:
        """Determine if a full asset import should be performed.

        Returns True if the table has 10 or fewer records, indicating
        that a complete re-import is needed.

        Returns:
            bool: True if full import should be performed.
        """
        record = self.session.query(AssetDetails).count()
        if not record:
            logger.info("Table is empty")
        if record > 10:
            return False
        else:
            return True

    def get_by_key(self, record: AssetDetails) -> Optional[AssetDetails]:
        """Fetch an existing asset by its unique asset_id.

        Args:
            record: An AssetDetails instance containing the asset_id to look up.

        Returns:
            Optional[AssetDetails]: The matching record, or None if not found.
        """
        return (
            self.session.query(AssetDetails)
            .filter(
                AssetDetails.asset_id == record.asset_id,
            )
            .first()
        )

    def is_nullish(self, value):
        """Check if a value represents a null or empty state.

        Args:
            value: The value to check.

        Returns:
            bool: True for None, "null", "NULL", empty string, etc.
        """
        if value is None:
            print('here')
            return True
        if isinstance(value, str):
            print(value.strip().lower())
            return value.strip().lower() in {"", "null", "none", "nil"}
        return False

    def upsert(self, asset_data: dict) -> tuple[AssetDetails, bool, bool]:
        """Insert a new asset or update an existing one.

        Parses the asset data, checks for existing records, and either
        inserts a new record or updates the existing one if changed.

        Args:
            asset_data: Dictionary containing asset data from the Baxus API.

        Returns:
            tuple[AssetDetails, bool, bool]: A tuple containing:
                - The AssetDetails record (new or existing)
                - is_new: True if a new record was inserted
                - is_updated: True if any changes were made
        """

        # Safely extract values → None if missing or empty string
        bottled_date = _parse_datetime(
            is_attribute=True, key_name="bottled_on", asset_data=asset_data
        )
        if bottled_date:
            bottled_year = bottled_date.year
        else:
            bottled_year = None

        age = _parse_int(is_attribute=True, key_name="age",
                         asset_data=asset_data)

        baxus_idx = _parse_int(is_attribute=False, key_name="id",
                               asset_data=asset_data)

        price = _parse_float(
            is_attribute=False,
            key_name="listed_price",
            asset_data=asset_data,
            return_none_if_zero=True,
        )

        listed_date = _parse_datetime(
            is_attribute=False, key_name="listed_price_updated_at", asset_data=asset_data
        )
        if price and listed_date:
            is_listed = True
        else:
            is_listed = False

        asset_name = asset_data.get("name")

        if asset_name is None or asset_name == '':
            # Fall back to bottle release name
            asset_name = asset_data.get("bottle_release", {}).get("name")

        record = AssetDetails(
            asset_id=asset_data.get("token_asset_address"),
            baxus_idx=baxus_idx,
            name=asset_name,
            price=price,
            bottled_year=bottled_year,
            age=age,
            asset_json=asset_data,
            metadata_json=null(),
            is_listed=is_listed,
            listed_date=listed_date
        )
        existing = self.get_by_key(record=record)
        if not existing:
            # Insert new
            self.session.add(record)
            self.session.commit()
            logger.info("Inserting new {f}".format(f=record))
            return record, True, True
        elif update_if_changed(instance=existing, new_instance=record, ignore_keys={'added_date', 'asset_id', 'metadata_json'}):
            # Update the existing record with new data
            self.session.commit()
            logger.info("Updating Existing {f}".format(f=existing))
            return existing, False, True
        else:
            # No update, retrun existing
            return existing, False, False

    def insert_asset_json(self, asset_json: AssetJsonFeed):
        """Insert an AssetJsonFeed record and update the related asset.

        Args:
            asset_json: The AssetJsonFeed instance containing metadata to insert.
        """
        self.session.add(asset_json)
        self.session.commit()
        self.session.query(AssetDetails)\
            .filter(AssetDetails.asset_idx == asset_json.asset_idx)\
            .update({"metadata_json": asset_json.metadata_json}, synchronize_session=False)
        self.session.commit()

    def get_all_attributes(self):
        """Fetch all attributes JSON from stored assets.

        Returns:
            list: List of tuples containing attributes JSON for each asset.
        """
        result = self.conn.execute(
            text(
                """
                    SELECT 
                        asset_json -> 'attributes' AS attributes_json
                    FROM "baxus"."asset_details"
                    WHERE asset_json ? 'attributes'
                    ORDER BY asset_id

        """
            )
        )
        rows = result.fetchall()
        return rows

    def get_all_json_data(self):
        """Fetch all asset JSON data from the database.

        Returns:
            list: List of tuples containing full asset_json for each asset.
        """
        result = self.conn.execute(
            text(
                """
                    SELECT 
                        asset_json
                    FROM "baxus"."asset_details"
                    ORDER BY asset_id

        """
            )
        )
        rows = result.fetchall()
        return rows
