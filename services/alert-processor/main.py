"""
Alert Processor Cloud Function.

Triggered by Pub/Sub messages from baxus-monitor.
Matches incoming assets against user alerts and publishes matches.

NOTE: This file MUST remain at the root level (not inside src/).
Google Cloud Functions requires the entry point to be in a file called
"main.py" at the root of the source package. The runtime does not support
specifying a subdirectory for the entry module. All implementation code
lives in src/ - this file is just a thin entry point that imports from there.
"""

import base64
import json

import functions_framework
from cloudevents.http import CloudEvent

from src.config import config
from src.log import get_logger
from src.matcher import find_matching_alerts
from src import models
from src.pubsub import publish_match
from src.repository import get_alerts, insert_alert_match
logger = get_logger()


@functions_framework.cloud_event
def process_listing(cloud_event: CloudEvent):
    """
    Process a Pub/Sub CloudEvent from baxus-monitor.

    Expected message format:
    {
        "event_type": "new_listing" | "price_change",
        "asset_id": "...",
        "record_id": 123,
        "name": "...",
        "price": 123.45,
        "bottled_year": 2020,
        "age": 12,
        "asset_json": {...}
    }
    """
    logger.info(config)
    pubsub_message_id = cloud_event["id"]
    logger.info(f"Received CloudEvent ID: {pubsub_message_id}")

    # Extract the Pub/Sub message
    pubsub_message = cloud_event.data["message"]

    # 1. Decode the base64 data
    payload_bytes = base64.b64decode(pubsub_message["data"])
    payload = json.loads(payload_bytes.decode("utf-8"))

    # 2. Extract attributes (these come from your publish() call)
    attributes = pubsub_message.get("attributes", {})
    event_type = attributes.get("event_type")
    activity_idx = int(attributes.get("external_id"))

    logger.info(f"Processing {event_type} for record {activity_idx}")

    asset_idx = payload.get("asset_idx", 0)
    name = payload.get("name", "")
    price = payload.get("price", 0.0)
    bottled_year = payload.get("bottled_year", None)
    age = payload.get("age", None)


    logger.info(
        f"Processing: event_type={event_type}, asset_idx={asset_idx} message_id={pubsub_message_id}")

    # # Parse asset from message
    asset = models.get_asset(asset_idx=asset_idx, name=name, price=price, bottled_year=bottled_year, age=age, activity_idx=activity_idx)
    logger.info(asset)

    # Fetch alerts and find matches
    try:
        alerts = get_alerts()
        logger.info(f"Loaded {len(alerts)} alerts")
    except Exception as e:
        logger.warning(f"Failed to fetch alerts: {e}")
        raise

    matching_alerts = find_matching_alerts(alerts, asset)
    logger.info(f"Found {len(matching_alerts)} matches for asset: {asset.name[:50]}")
    for a in matching_alerts:
        logger.info(a)

    # Process each match
    for alert in matching_alerts:
        try:
            match_idx = insert_alert_match(
                alert_id=alert.id,
                listing_source="baxus",
                activity_idx=asset.activity_idx,
                asset_idx=asset.asset_idx
            )
            logger.info(f"Inserted match id={match_idx} for alert={alert.id}")

            if match_idx:
                publish_match(
                    alert_id=alert.id,
                    user_id=alert.user_id,
                    asset=asset,
                    match_idx=match_idx,
                    user_email=alert.user_email,
                    alert_name=alert.name
                )
        except Exception as e:
            logger.warning(f"Error processing match for alert {alert.id}: {e}")
            continue

    logger.info(f"Done. Matched {len(matching_alerts)} alerts.")
