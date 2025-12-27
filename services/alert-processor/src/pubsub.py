"""Pub/Sub publishing for alert matches."""

import json

from google.cloud import pubsub_v1

from .config import config
from .log import get_logger
from .models import Asset

logger = get_logger()


def publish_match(alert_id: int, user_id: int, asset: Asset, match_idx: int, alert_name: str, user_email: str) -> None:
    """Publish a match to the alert-matches topic."""
    if not config.gcp_project_id:
        logger.warning("No GCP_PROJECT_ID configured, skipping publish")
        return

    publisher = pubsub_v1.PublisherClient()
    topic_path = publisher.topic_path(
        config.gcp_project_id, config.pubsub_topic)

    message = {
        "match_idx": match_idx,
        "alert_id": alert_id,
        "user_id": user_id,
        "asset_idx": asset.asset_idx,
        "asset_name": asset.name,
        "asset_price": asset.price,
        "asset_url": asset.url,
        "alert_name": alert_name,
        "user_email": user_email
    }

    data = json.dumps(message).encode("utf-8")
    future = publisher.publish(
        topic_path, data, event_type="baxus_listing_alert")
    future.result()  # Wait for publish to complete

    logger.info(
        f"Published match to {config.pubsub_topic}: alert={alert_id}, asset_idx={asset.asset_idx}"
    )
