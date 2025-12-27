"""Main entry point for the Baxus Monitor service."""

import os
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread

from .processor import BlockchainProcessor, ListingProcessor
from .utils.config import config
from .utils.log import get_logger

logger = get_logger()


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

    def log_message(self, format, *args):
        pass


def monitor_listings():
    logger.info("Starting Baxus Monitor service...")
    logger.info(config)

    processor = ListingProcessor(config)


    start_time = datetime.now(timezone.utc)
    # initial asset_details population if table empty
    stats = processor.process_import()
    elapsed_secs = (datetime.now(timezone.utc) -
                                start_time).total_seconds()
    logger.info(
        f"Poll cycle complete in {elapsed_secs:.2f}s - "
        f"Processed: {stats['total_processed']}, "
        f"New Assets: {stats['new_assets']}, "
        f"Updated Assets: {stats['updated_assets']}, "
        f"Inserted Activity: {stats['activity_inserted']}, "
        f"Errors: {stats['errors']}, "
    )
    
    elapsed_secs = 0
    start_time = datetime.now(timezone.utc)
    # Loop new listings
    while True:
        stats = {
            "total_processed": 0,
            "new_assets": 0,
            "new_listings": 0,
            "errors": 0,
        }
        query_size = 24
        start_from = 0
        try:
            while stats.get('total_processed') == stats.get('new_listings'):
                start_time = datetime.now(timezone.utc)
                logger.info("Starting poll cycle...")
                stats = processor.process_listings(
                    query_size=query_size, query_from=start_from)
                elapsed_secs = (datetime.now(timezone.utc) -
                                start_time).total_seconds()
                start_from += query_size
                if stats.get('total_processed') == stats.get('new_listings'):
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
            processor.close()
            break
        except Exception as e:
            logger.error(f"Error in poll cycle: {e}", exc_info=True)
            time.sleep(60)  # Wait before retrying on error


def monitor_blockchain():
    logger.info("Starting Baxus Monitor service...")
    logger.info(config)
    B = BlockchainProcessor(config=config)
    B.test()


def run():
    port = int(os.environ.get("PORT", "8080"))
    logger.info(f"Starting health server on port {port}")

    server = HTTPServer(("0.0.0.0", port), HealthHandler)
    logger.info(f"Health server ready on 0.0.0.0:{port}")

    Thread(target=server.serve_forever, daemon=True).start()

    if config.instance_type != "blockchain_monitor":
        monitor_listings()
    else:
        monitor_blockchain()


if __name__ == "__main__":
    run()
