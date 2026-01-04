"""Processor for tracking Solana blockchain activity via the Helius API."""

from datetime import datetime
from itertools import groupby
from operator import attrgetter

from tqdm import tqdm

from .activity_repository import ActivityRepository
from .asset_repository import AssetRepository
from .baxus_client import BaxusClient
from .helius_client import HeliusClient
from .models import ActivityFeed, AssetJsonFeed
from .utils.config import Config
from .utils.db import Database
from .utils.log import get_logger
from .utils.transactions_helper import TransactionsHelper

logger = get_logger()


class BlockchainProcessor:
    """Processes Solana blockchain transactions to track on-chain activity.
    
    Fetches parsed transactions from Helius, identifies mint/burn/purchase events,
    resolves asset metadata, and persists activity records to the database.
    """

    def __init__(self, config: Config, activity_types_map: dict = None):
        self.config = config
        self.db = Database(config)
        self.helius = HeliusClient(config=config)
        self.baxus_client = BaxusClient(config)
        self.activity_types_map = activity_types_map or {}
        self.USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        self.transaction_helper = TransactionsHelper(activity_types_map=self.activity_types_map)

    def get_latest_processed_signature(self) -> str | None:
        """Get the latest processed transaction signature from the database.

        Returns:
            str | None: The latest processed signature, or None if not found.
        """
        conn = self.db.get_connection()
        try:
            activity_repo = ActivityRepository(conn=conn)
            latest_signature = activity_repo.get_latest_processed_signature()
        finally:
            conn.close()

        logger.info(f"Latest processed signature: {latest_signature}")
        return latest_signature

    def process_transactions(self) -> dict:
        """Process blockchain transactions from Helius and persist relevant activities.

        Fetches transactions from the Helius API starting from the last processed
        signature, parses mint/burn/purchase events, resolves asset metadata,
        and inserts activity records into the database.

        Returns:
            dict: Statistics including parsed_mints, parsed_burns, parsed_purchases,
                  total_processed, inserted_activities, and errors count.
        """

        search_until_signature = self.get_latest_processed_signature()
        results = self.get_transactions(until_signature=search_until_signature)

        # Process oldest 500 per batch
        results = sorted(results, key=attrgetter("activity_date"))[:500]

        mint_activity_count = len([x for x in results if x.activity_type_idx == self.activity_types_map["MINT"]])
        burn_activity_count = len([x for x in results if x.activity_type_idx == self.activity_types_map["BURN"]])
        purchase_activity_count = len(
            [x for x in results if x.activity_type_idx == self.activity_types_map["PURCHASE"]]
        )

        sorted_activities = sorted(results, key=attrgetter("mint", "activity_date"))

        max_dates_per_asset = {
            mint: max(activity.activity_date for activity in group)
            for mint, group in groupby(sorted_activities, attrgetter("mint"))
        }
        asset_id_to_idx_map = {}
        for mint in tqdm(max_dates_per_asset, desc="Processing assets"):
            asset_idx = self.process_asset(asset_id=mint, max_activity_date=max_dates_per_asset[mint])
            asset_id_to_idx_map[mint] = asset_idx

        for activity in results:
            activity.asset_idx = asset_id_to_idx_map.get(activity.mint)

        error_count = 0
        valid_activities = []
        for activity in results:
            if not activity.asset_idx:
                logger.warning(f"Skipping activity with missing asset_idx for mint: {activity.mint}")
                logger.warning(activity)
                error_count += 1
            else:
                valid_activities.append(activity)

        session = self.db.get_session()
        conn = self.db.get_connection()
        activity_repo = ActivityRepository(session=session, conn=conn)
        inserted = activity_repo.insert_many(activity_feeds=valid_activities)
        # Update latest processed signature in metadata
        if len(inserted) > 0:
            activity_repo.update_latest_processed_signature()

        session.close()
        conn.close()
        return {
            "parsed_mints": mint_activity_count,
            "parsed_burns": burn_activity_count,
            "parsed_purchases": purchase_activity_count,
            "total_processed": len(results),
            "inserted_activities": len(inserted),
            "errors": error_count,
        }

    def get_transactions(self, until_signature: str = None, response_size: int = 100) -> list[ActivityFeed]:
        """Fetch and parse transactions from the Helius API.

        Paginates through transaction history in reverse chronological order,
        parsing each transaction into ActivityFeed objects for mint, burn, and
        purchase events.

        Args:
            until_signature: Stop pagination when this signature is reached.
            response_size: Number of transactions to fetch per API call.

        Returns:
            list[ActivityFeed]: Parsed activity feed objects from transactions.
        """
        before_signature = None
        transactions = []
        results = []
        while before_signature is None or len(transactions) == response_size:
            transactions = self.helius.get_parsed_transactions(
                before_signature=before_signature, until_signature=until_signature, response_size=response_size
            )
            for each in transactions:
                before_signature = each["signature"]
                activity_feed = self.transaction_helper.create_activity_feed_object(transaction=each)

                if activity_feed:
                    results.append(activity_feed)

            if len(transactions) > 0:
                dt = datetime.fromtimestamp(transactions[-1]["timestamp"])
                logger.info(dt.strftime("%Y-%m-%d %H:%M:%S"))
                logger.info(before_signature)
        return results

    def process_asset(self, asset_id: str, max_activity_date: datetime) -> int:
        """Fetch or update asset details and return the asset index.

        Checks if the asset already exists and is up-to-date. If not, fetches
        asset data from the Baxus API or on-chain metadata and upserts it.

        Args:
            asset_id: The Solana token mint address of the asset.
            max_activity_date: The latest activity date for cache invalidation.

        Returns:
            int: The database asset_idx for the asset.
        """
        # asset_id = "9pdjyHBGgsVEMMrEjoqFPZvZeeMaj3F8QEvWyRBcAqQn"
        session = self.db.get_session()
        asset_repo = AssetRepository(session=session)
        asset_idx = asset_repo.get_asset_idx_by_key_and_last_updated(asset_id=asset_id, last_updated=max_activity_date)
        if asset_idx:
            logger.info(f"Asset already up to date: {asset_id}")
            session.close()
            return asset_idx

        # get asset
        assets = self.baxus_client.fetch_assets(size=1, payload={"assetAddresses": [asset_id]})

        asset = assets.get("assets")
        if len(asset) == 0:
            source_data = self.get_asset_data_from_onchain(asset_id=asset_id, asset_repo=asset_repo)
        else:
            source_data = asset[0].get("_source")

        asset_idx = self.insert_asset_details(source_data=source_data, asset_repo=asset_repo)
        session.close()
        return asset_idx

    def insert_asset_details(self, source_data: dict, asset_repo: AssetRepository) -> int:
        """Insert or update asset details in the database.

        Upserts the asset record and fetches additional metadata from Baxus
        if the asset has a baxus_idx.

        Args:
            source_data: Asset data dict containing token_asset_address and name.
            asset_repo: Repository instance for asset database operations.

        Returns:
            int: The database asset_idx, or None if insertion failed.
        """
        if source_data is None:
            return None
        try:
            # Get / Update asset
            record, is_new, is_updated = asset_repo.upsert(asset_data=source_data)

            # if this insert is from onchain data, dont attempt to get metadata
            if not record.baxus_idx:
                return record.asset_idx

            asset_idx = record.asset_idx
            # Prepare JsonFeed object
            asset_json = AssetJsonFeed(asset_idx=record.asset_idx, asset_json=record.asset_json)
            asset_json.baxus_idx = record.baxus_idx

            metadata_json = self.baxus_client.get_asset_metadata(baxus_idx=asset_json.baxus_idx)
            asset_json.metadata_json = metadata_json
            asset_repo.insert_asset_json(asset_json=asset_json)

            return asset_idx

        except Exception as e:
            logger.error(f"Error inserting asset: {e}")
            return None

    def get_asset_data_from_onchain(self, asset_id: str, asset_repo: AssetRepository) -> dict:
        """Fetch asset metadata directly from on-chain data via Helius.

        Used as a fallback when the asset is not found in the Baxus API.
        Extracts the asset name from token metadata extensions.

        Args:
            asset_id: The Solana token mint address.
            asset_repo: Repository instance (unused, kept for interface consistency).

        Returns:
            dict: Asset data with token_asset_address and name, or None on error.
        """
        try:
            # Get / Update asset
            asset_info = self.helius.get_asset(id=asset_id)
            asset_result = asset_info.get("result")
            baxus_name = asset_result.get("mint_extensions", {}).get("metadata", {}).get("name", "")
            if baxus_name == "":
                baxus_name = asset_result.get("content", {}).get("metadata", {}).get("name", "")
            return {"token_asset_address": asset_id, "name": baxus_name}

        except Exception as e:
            logger.error(f"Error inserting asset: {e}")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def close(self):
        """Clean up resources."""
        self.db.close()
