"""Pub/Sub publisher for new listing notifications."""

import json

from google.cloud import pubsub_v1

from .models import AssetDetails
from .utils.config import Config
from .utils.log import get_logger

logger = get_logger()


class PubSubPublisher:
    """Publisher for sending new listing notifications to Pub/Sub."""

    def __init__(self, config: Config):
        self.config = config
        self.publisher = pubsub_v1.PublisherClient()
        self.topic_path = self.publisher.topic_path(
            config.gcp_project_id,
            config.pubsub_topic,
        )

    def publish_new_listing(self, asset_data: AssetDetails, activity_idx: int) -> str:
        """
        Publish a message for a new listing.

        Returns the message ID.
        """

        data_to_send = {'asset_idx': asset_data.asset_idx,
                        'asset_id': asset_data.asset_id,
                        'name': asset_data.name,
                        'price': asset_data.price,
                        'bottled_year': asset_data.bottled_year,
                        'age': asset_data.age
                        }
        data = json.dumps(data_to_send).encode("utf-8")

        future = self.publisher.publish(
            self.topic_path,
            data,
            event_type="new_baxus_listing",
            external_id=str(activity_idx),
        )

        message_id = future.result(timeout=30)
        logger.info(
            f"Published message {message_id}: activity_idx={activity_idx} | asset_idx= {asset_data.asset_idx}")
        return message_id
