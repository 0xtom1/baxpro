"""Main entry point for the Baxus Monitor service."""

from datetime import UTC, datetime

from .activity_repository import ActivityRepository
from .blockchain_processor import BlockchainProcessor
from .listing_processor import ListingProcessor
from .utils.config import config
from .utils.db import Database
from .utils.log import get_logger

logger = get_logger()


def monitor_activity():
    """Monitor Baxus listings by polling the API and processing new/updated assets.

    Runs once per invocation (triggered by Cloud Scheduler every 5 minutes):
    1. Processes incomplete assets (daily at 4am UTC)
    2. Processes blockchain transactions (mints, burns, purchases)
    3. Polls for new listings and persists discovered assets
    """
    logger.info("Starting Baxus Monitor service...")
    logger.info(config)

    db = Database(config)
    session = db.get_session()
    with ActivityRepository(session=session) as activity_repo:
        activity_types_map = activity_repo.get_activity_type_map()
        logger.info(f"Activity Types: {activity_types_map}")
    session.close()
    db.close()

    listing_processor = ListingProcessor(config, listing_activity_idx=activity_types_map["NEW_LISTING"])

    loop_time = datetime.now(UTC)
    if loop_time.hour == 9 and loop_time.minute < 5:
        # Process incomplete assets
        try:
            start_time = datetime.now(UTC)
            logger.info("Starting process of incomplete assets...")
            stats = listing_processor.process_incomplete_assets()
            elapsed_secs = (datetime.now(UTC) - start_time).total_seconds()
            logger.info(
                f"Processed incomplete assets in {elapsed_secs:.2f}s - "
                f"Processed: {stats['total_processed']}, "
                f"Updated Assets: {stats['updated_assets']}, "
                f"Errors: {stats['errors']}, "
            )
            if stats["updated_assets"] > 0:
                listing_processor.refresh_materialized_views()

        except Exception as e:
            logger.error(f"Error in processing incomplete assets: {e}", exc_info=True)
            raise

    # Get blockchain activities
    try:
        start_time = datetime.now(UTC)
        with BlockchainProcessor(config=config, activity_types_map=activity_types_map) as blockchain_processor:
            logger.info("Starting blockchain processing...")
            stats = blockchain_processor.process_transactions()
            elapsed_secs = (datetime.now(UTC) - start_time).total_seconds()
            logger.info(
                f"Poll cycle complete in {elapsed_secs:.2f}s - "
                f"Parsed Mints: {stats['parsed_mints']}, "
                f"Parsed Burns: {stats['parsed_burns']}, "
                f"Parsed Purchases: {stats['parsed_purchases']}, "
                f"Total Processed: {stats['total_processed']}, "
                f"Inserted Activities: {stats['inserted_activities']}, "
                f"Errors: {stats['errors']}, "
            )
    except Exception as e:
        logger.error(f"Error in blockchain poll cycle: {e}", exc_info=True)
        raise

    # Get new listings, Loop until new listings != query size
    stats = {
        "total_processed": 0,
        "new_assets": 0,
        "new_listings": 0,
        "errors": 0,
    }
    query_size = 24
    start_from = 0
    try:
        while stats.get("total_processed") == stats.get("new_listings"):
            start_time = datetime.now(UTC)
            logger.info("Starting poll cycle...")
            stats = listing_processor.process_listings(query_size=query_size, query_from=start_from)
            elapsed_secs = (datetime.now(UTC) - start_time).total_seconds()
            start_from += query_size
            if stats.get("new_assets") > 0 or stats.get("new_listings") > 0:
                listing_processor.refresh_materialized_views()
            if stats.get("total_processed") == stats.get("new_listings"):
                logger.info(
                    f"Poll cycle complete in {elapsed_secs:.2f}s - "
                    f"Processed: {stats['total_processed']}, "
                    f"New Listings: {stats['new_listings']}, "
                    f"New Assets: {stats['new_assets']}, "
                    f"Errors: {stats['errors']}, "
                )
        logger.info(
            f"Poll cycle complete in {elapsed_secs:.2f}s - "
            f"Processed: {stats['total_processed']}, "
            f"New Listings: {stats['new_listings']}, "
            f"New Assets: {stats['new_assets']}, "
            f"Errors: {stats['errors']}, "
        )

    except Exception as e:
        logger.error(f"Error in poll cycle: {e}", exc_info=True)
        raise
    finally:
        listing_processor.close()


def run():
    """Main entry point for the Baxus Monitor job."""
    monitor_activity()


if __name__ == "__main__":
    run()
