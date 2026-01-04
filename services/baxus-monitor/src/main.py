"""Main entry point for the Baxus Monitor service."""

import os
import time
from datetime import UTC, datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread

from .activity_repository import ActivityRepository
from .blockchain_processor import BlockchainProcessor
from .listing_processor import ListingProcessor
from .utils.config import config
from .utils.db import Database
from .utils.log import get_logger

logger = get_logger()


class HealthHandler(BaseHTTPRequestHandler):
    """HTTP request handler for health check endpoints."""

    def do_GET(self):
        """Handle GET requests by returning a 200 OK status."""
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

    def log_message(self, format, *args):
        """Suppress default HTTP request logging."""
        pass


def monitor_activity():
    """Monitor Baxus listings by polling the API and processing new/updated assets.

    This function runs an infinite loop that:
    1. Performs an initial import of all assets
    2. Continuously polls for new listings
    3. Processes and persists discovered assets
    4. Publishes notifications for new listings
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

    # Loop activity
    while True:
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
        except KeyboardInterrupt:
            logger.info("\nStopped by user")
            break
        except Exception as e:
            logger.error(f"Error in blockchain poll cycle: {e}", exc_info=True)
            time.sleep(60)  # Wait before retrying on error

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
                if stats.get("total_processed") == stats.get("new_listings"):
                    logger.info(
                        f"Poll cycle complete in {elapsed_secs:.2f}s - "
                        f"Processed: {stats['total_processed']}, "
                        f"New Listings: {stats['new_listings']}, "
                        f"New Assets: {stats['new_assets']}, "
                        f"Errors: {stats['errors']}, "
                    )
                    time.sleep(10)

            sleep_time = config.poll_interval_sec - elapsed_secs
            logger.info(
                f"Poll cycle complete in {elapsed_secs:.2f}s - "
                f"Processed: {stats['total_processed']}, "
                f"New Listings: {stats['new_listings']}, "
                f"New Assets: {stats['new_assets']}, "
                f"Errors: {stats['errors']}, "
                f"Sleep Time {sleep_time:.2f}s"
            )
            time.sleep(sleep_time)

        except KeyboardInterrupt:
            logger.info("\nStopped by user")
            listing_processor.close()
            break
        except Exception as e:
            logger.error(f"Error in poll cycle: {e}", exc_info=True)
            time.sleep(60)  # Wait before retrying on error


def run():
    """Main entry point for the Baxus Monitor service.

    Starts the health check HTTP server and runs the appropriate
    monitor based on the configured instance type (listings or blockchain).
    """
    port = int(os.environ.get("PORT", "8080"))
    logger.info(f"Starting health server on port {port}")

    server = HTTPServer(("0.0.0.0", port), HealthHandler)
    logger.info(f"Health server ready on 0.0.0.0:{port}")

    Thread(target=server.serve_forever, daemon=True).start()

    monitor_activity()


if __name__ == "__main__":
    run()
