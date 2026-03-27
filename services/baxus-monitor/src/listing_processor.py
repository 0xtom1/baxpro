"""Main processor that orchestrates polling, deduplication, and notifications."""

from datetime import datetime, timedelta
from time import sleep

from sqlalchemy import Null

from .activity_repository import ActivityRepository
from .asset_repository import AssetRepository
from .baxus_client import BaxusClient
from .models import AssetDetails, AssetJsonFeed
from .pubsub import PubSubPublisher
from .utils.config import Config
from .utils.db import Database
from .utils.log import get_logger

logger = get_logger()


class ListingProcessor:
    """Processes listings from Baxus API, persists them, and publishes notifications."""

    def __init__(self, config: Config, listing_activity_idx: int):
        self.config = config
        self.db = Database(config)
        self.baxus_client = BaxusClient(config)
        self.publisher = PubSubPublisher(config)
        self.listing_activity_idx = listing_activity_idx
        self.ignore_metadata_baxus_ids = []

    def process_incomplete_assets(self) -> dict:
        """Process imported activity feed records and sync assets.

        Fetches unprocessed import records from the database, retrieves
        corresponding asset data from Baxus API, and creates activity
        feed entries.

        Returns:
            dict: Statistics containing total_processed, new_assets,
                updated_assets, activity_inserted, and errors counts.
        """
        if self.config.environment == "dev":
            sleep_time_seconds = 2
        else:
            sleep_time_seconds = 2

        stats = {
            "total_processed": 0,
            "updated_assets": 0,
            "errors": 0,
        }

        session = self.db.get_session()
        records = (
            session.query(AssetDetails)
            .where(AssetDetails.metadata_json.is_(None))
            .all()
        )
        asset_records = [x.asset_id for x in records]
        logger.info(f"Records to Process: {len(asset_records)}")
        session.close()

        for each in asset_records:
            updated, errored = self.process_asset(each)
            stats["total_processed"] += 1
            stats["updated_assets"] += updated
            stats["errors"] += errored
            sleep(sleep_time_seconds)

        return stats

    def process_asset(self, asset_id: str) -> tuple[int, int]:
        """
        Fetch latest asset data for a given asset_id.

        Returns tuple[updated, errored]
        """
        return_tuple = [0, 0]
        session = self.db.get_session()

        try:
            asset_repo = AssetRepository(session=session)

            # updated assets go into this list for metadata processing
            updated_list: list[AssetJsonFeed] = []

            # get asset
            assets = self.baxus_client.fetch_assets(size=1, payload={"assetAddresses": [asset_id]})
            asset = assets.get("assets")
            if not asset or len(asset) < 1:
                return (0, 1)

            asset = asset[0]

            try:
                source_data = asset.get("_source")

                # Get / Update asset
                record, is_new, is_updated = asset_repo.upsert(asset_data=source_data)

                # Prepare JsonFeed object
                asset_json = AssetJsonFeed(asset_idx=record.asset_idx, asset_json=record.asset_json)
                asset_json.baxus_idx = record.baxus_idx

                if is_new or is_updated:
                    updated_list.append(asset_json)
                    return_tuple[0] = 1
                elif (
                    isinstance(record.metadata_json, Null) or record.metadata_json is None
                ) and asset_json.baxus_idx not in self.ignore_metadata_baxus_ids:
                    # not updated but no metadata, get metadata if not in ignore list
                    updated_list.append(asset_json)

                # Update metadata for each updated listing
                for json_asset in updated_list:
                    metadata_json = self.baxus_client.get_asset_metadata(baxus_idx=json_asset.baxus_idx)
                    json_asset.metadata_json = metadata_json
                    asset_repo.insert_asset_json(asset_json=json_asset)

            except Exception as e:
                logger.error(f"Error processing listing: {e}")

        finally:
            session.close()

        return tuple(return_tuple)

    def process_listings(self, query_size: int = 24, query_from: int = 0) -> dict:
        """
        Fetch all current listings, persist them, and publish notifications for new ones.

        Returns stats about the processing run.
        """
        stats = {
            "total_processed": 0,
            "new_assets": 0,
            "new_listings": 0,
            "errors": 0,
        }

        session = self.db.get_session()
        try:
            activity_repo = ActivityRepository(session=session)
            asset_repo = AssetRepository(session=session)
            updated_list: list[AssetJsonFeed] = []
            new_listings = self.baxus_client.get_new_listings(size=query_size, from_index=query_from)
            new_listings = new_listings.get("assets")

            # results are natively newest first, we want to process oldest to newest
            for raw_listing in reversed(new_listings):
                try:
                    source_data = raw_listing.get("_source")
                    stats["total_processed"] += 1

                    # Update assets table
                    record, is_new, is_updated = asset_repo.upsert(asset_data=source_data)

                    # Add to activity feed if not exists
                    activity_exists = activity_repo.record_exists(
                        asset_idx=record.asset_idx,
                        price=record.price,
                        listed_date=record.listed_date,
                        activity_type_idx=self.listing_activity_idx,
                    )
                    if not activity_exists:
                        activity_idx = activity_repo.insert(
                            activity_type_idx=self.listing_activity_idx,
                            asset_idx=record.asset_idx,
                            price=record.price,
                            activity_date=record.listed_date,
                        )
                        stats["new_listings"] += 1
                    else:
                        activity_idx = None

                    # publish if last 2 hours
                    if activity_idx and record.listed_date > datetime.now(None) - timedelta(hours=2):
                        self.publisher.publish_new_listing(asset_data=record, activity_idx=activity_idx)

                    # Set asset json feed object
                    asset_json = AssetJsonFeed(asset_idx=record.asset_idx, asset_json=record.asset_json)
                    asset_json.baxus_idx = record.baxus_idx

                    # If asset record was updated, create list for updating metadata json
                    if is_new or is_updated:
                        updated_list.append(asset_json)
                        if is_new:
                            stats["new_assets"] += 1
                    elif (
                        isinstance(record.metadata_json, Null) or record.metadata_json is None
                    ) and asset_json.baxus_idx not in self.ignore_metadata_baxus_ids:
                        # not updated but no metadata, get metadata if not in ignore list
                        updated_list.append(asset_json)

                except Exception as e:
                    logger.error(f"Error processing listing: {e}")
                    stats["errors"] += 1

            # Update metadata for each updated listing
            for json_asset in updated_list:
                metadata_json = self.baxus_client.get_asset_metadata(baxus_idx=json_asset.baxus_idx)
                json_asset.metadata_json = metadata_json
                asset_repo.insert_asset_json(asset_json=json_asset)
                if metadata_json is None:
                    self.ignore_metadata_baxus_ids.append(json_asset.baxus_idx)

        finally:
            session.close()

        self.clean_ignore_metadata_baxus_ids()
        return stats

    def get_all_attributes(self):
        """Retrieve and aggregate all unique attributes from stored assets.

        Returns:
            dict: Dictionary mapping attribute names to their counts and example values.
        """
        conn = self.db.get_connection()
        try:
            repo = AssetRepository(conn=conn)
            rows = repo.get_all_attributes()
            attributes_count = {}
            for row in rows:
                attributes = row[0]
                for each in attributes:
                    if each in attributes_count:
                        attributes_count[each]["count"] += 1
                        attributes_count[each]["examples"].append(attributes[each])
                    else:
                        attributes_count[each] = {}
                        attributes_count[each]["count"] = 1
                        attributes_count[each]["examples"] = []
                        attributes_count[each]["examples"].append(attributes[each])
        finally:
            conn.close()
        return attributes_count

    def get_all_json_keys(self):
        """Retrieve and aggregate all unique JSON keys from stored asset data.

        Returns:
            dict: Dictionary mapping JSON keys to their counts and example values.
        """
        conn = self.db.get_connection()
        try:
            repo = AssetRepository(conn=conn)
            rows = repo.get_all_json_data()
            keys_count = {}
            for row in rows:
                keys = row[0]
                for each in keys:
                    if each == "attributes":
                        continue
                    if each in keys_count:
                        keys_count[each]["count"] += 1
                        keys_count[each]["examples"].append(keys[each])
                    else:
                        keys_count[each] = {}
                        keys_count[each]["count"] = 1
                        keys_count[each]["examples"] = []
                        keys_count[each]["examples"].append(keys[each])
        finally:
            conn.close()
        return keys_count

    def refresh_materialized_views(self):
        """Refresh database materialized views."""
        conn = self.db.get_connection()
        try:
            repo = AssetRepository(conn=conn)
            repo.refresh_materialized_views()
        finally:
            conn.close()

    def close(self):
        """Clean up resources."""
        self.db.close()

    def clean_ignore_metadata_baxus_ids(self):
        if len(self.ignore_metadata_baxus_ids) > 500:
            self.ignore_metadata_baxus_ids = []
