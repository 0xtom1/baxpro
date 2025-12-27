"""
Alert Sender Cloud Function.

Triggered by Pub/Sub messages from alert-processor.
Sends email notifications to users when their alerts match listings.

NOTE: This file MUST remain at the root level (not inside src/).
Google Cloud Functions requires the entry point to be in a file called
"main.py" at the root of the source package. The runtime does not support
specifying a subdirectory for the entry module. All implementation code
lives in src/ - this file is just a thin entry point that imports from there.
"""

import base64
import json
from typing import Optional

import functions_framework
from cloudevents.http import CloudEvent
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from sqlalchemy import text

from src.config import config
from src.db import Database
from src.log import get_logger

logger = get_logger()

db = Database(config)


def log_email(
    match_idx: Optional[int],
    user_id: str,
    asset_idx: Optional[int],
    email_address: str,
    subject: str,
    body: str,
    response_code: Optional[int],
) -> None:
    """
    Log an email to the email_logs table.
    """
    try:
        with db.get_session() as session:
            session.execute(
                text(
                    """
                    INSERT INTO email_logs
                    (match_idx, user_id, asset_idx, email_address, subject, body, response_code)
                    VALUES (:match_idx, :user_id, :asset_idx, :email_address, :subject, :body, :response_code)
                """
                ),
                {
                    "match_idx": match_idx,
                    "user_id": user_id,
                    "asset_idx": asset_idx,
                    "email_address": email_address,
                    "subject": subject,
                    "body": body,
                    "response_code": response_code,
                },
            )
            session.commit()
            logger.info(
                f"Email logged: match_idx={match_idx}, user_id={user_id}, response_code={response_code}"
            )
    except Exception as e:
        logger.error(f"Failed to log email: {e}")


@functions_framework.cloud_event
def send_alert(cloud_event: CloudEvent):
    """
    Process a Pub/Sub CloudEvent from alert-processor.

    event_types = "baxus_listing_alert" OR "user_example"
    Expected message format for baxus_listing_alert:
    {
        "match_idx": int,
        "alert_id": "uuid-string",  # Used to look up alert name from database
        "user_id": "uuid-string",
        "asset_idx": int,
        "asset_name": "string",
        "asset_price": 18.18,
        "asset_url": "string",
        "user_email": "string",
        "alert_name": "string
    }

    Expected message format for user_example:
    {
        "user_id": "uuid-string",
        "user_email": "string"
    }
    Note: alert_name is retrieved from the alerts table using alert_id,
    not from the payload.
    """
    pubsub_message_id = cloud_event["id"]
    logger.info(f"Received CloudEvent ID: {pubsub_message_id}")

    # Extract the Pub/Sub message
    pubsub_message = cloud_event.data["message"]

    # 1. Decode the base64 data
    payload_bytes = base64.b64decode(pubsub_message["data"])
    payload = json.loads(payload_bytes.decode("utf-8"))

    # 2. Extract attributes (these come from your publish() call)
    attributes = pubsub_message.get("attributes", {})
    event_type = attributes.get("event_type", "alert_match")

    # Extract payload data
    to_email = payload.get("user_email", None)
    user_id = payload.get("user_id")

    if event_type == "user_example":
        match_idx = 0
        alert_id = "00000000-0000-0000-0000-000000000000"
        # asset_id = "CC1zkxdATiHftXYNr3VQcoy5k8d4BNnETxVAXpLsFQKK"
        asset_idx = 5795
        alert_name = "Test Alert"
        asset_name = "Very Very Old Fitzgerald 1955 12 Year Bottled In Bond"
        price = 4800
        if config.environment == "dev":
            asset_url = (
                "https://dev.baxpro.xyz/asset/5795"
            )
        else:
            asset_url = (
                "https://baxpro.xyz/asset/5795"
            )
    else:
        match_idx = payload.get("match_idx")
        alert_id = payload.get("alert_id")
        asset_idx = payload.get("asset_idx")
        alert_name = payload.get("alert_name", "Your Alert")
        asset_name = payload.get("asset_name", "Unknown Product")
        price = payload.get("asset_price")
        asset_url = payload.get("asset_url", "https://baxpro.xyz/dashboard")

    logger.info(
        f"Processing: event_type={event_type}, match_idx={match_idx}, user_id={user_id}, alert_id={alert_id}, asset_idx={asset_idx}"
    )

    if not to_email:
        logger.info(
            f"User {user_id} has no email or email_consent=false, skipping notification"
        )
        return

    logger.info(f"Sending alert email to {to_email} for match_idx={match_idx}")

    # Format price for display
    price_display = f"${price:,.2f}" if price else "Price not available"

    if config.environment == "dev":
        unsubscribe_link = f"https://dev.baxpro.xyz/unsubscribe?uid={user_id}"
        notification_link = "https://dev.baxpro.xyz/notification-settings"
    else:
        unsubscribe_link = f"https://baxpro.xyz/unsubscribe?uid={user_id}"
        notification_link = "https://baxpro.xyz/notification-settings"

    # Build email content
    subject = f"BaxPro Alert: {alert_name}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Match for Your Alert</h2>
        <p>Your alert <strong>"{alert_name}"</strong> matched a new listing:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">{asset_name}</h3>
            <p style="font-size: 24px; color: #2563eb; margin: 10px 0;"><strong>{price_display}</strong></p>
            <a href="{asset_url}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View on BaxPro</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
            You're receiving this because you have alerts set up on BaxPro.xyz<br>
            <a href="{notification_link}">Manage your notification preferences</a> | 
            <a href="{unsubscribe_link}">Unsubscribe</a>
        </p>
    </div>
    """

    message = Mail(
        from_email="alerts@baxpro.xyz",
        to_emails=to_email,
        subject=subject,
        html_content=html_content,
    )

    response_code = None
    try:
        sg = SendGridAPIClient(config.sendgrid_api_key)
        response = sg.send(message)
        response_code = response.status_code
        logger.info(f"Email sent successfully: status_code={response_code}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        # Log the failed attempt with no response code
        log_email(
            match_idx=match_idx,
            user_id=user_id,
            asset_idx=asset_idx,
            email_address=to_email,
            subject=subject,
            body=html_content,
            response_code=None,
        )
        raise

    # Log the successful email
    log_email(
        match_idx=match_idx,
        user_id=user_id,
        asset_idx=asset_idx,
        email_address=to_email,
        subject=subject,
        body=html_content,
        response_code=response_code,
    )

    return
