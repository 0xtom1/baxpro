import logging
import google.cloud.logging
import os

# Initialize Cloud Logging client at module level (once per instance)
_client = None
_initialized = False


def _initialize_cloud_logging():
    """Initialize Google Cloud Logging once at module level."""
    global _client, _initialized
    if not _initialized:
        if os.getenv("LOCAL_DEVELOPMENT") or os.getenv("RUN_LOCALLY"):
            logging.basicConfig(
                level=logging.INFO,
                format="%(asctime)s %(levelname)s %(name)s: %(message)s",
            )
            logging.info("LOCAL_DEVELOPMENT mode → forcing local stdout logging")
            _initialized = True
            return

        try:
            _client = google.cloud.logging.Client()
            _client.setup_logging(log_level=logging.INFO)
            _initialized = True
        except Exception as e:
            # Fallback to standard logging if Cloud Logging fails
            logging.basicConfig(
                level=logging.INFO,
                format="%(asctime)s %(levelname)s %(name)s: %(message)s",
            )
            logging.warning(f"Failed to initialize Cloud Logging: {e}")
            _initialized = True


def get_logger(name: str = "alert-sender") -> logging.Logger:
    """
    Creates and configures a logger for GCP Cloud Functions.

    Uses google-cloud-logging which automatically handles
    structured logging for Cloud Functions/Cloud Run.

    Args:
        name (str): Name of the logger.

    Returns:
        logging.Logger: Configured logger instance.
    """
    # Initialize Cloud Logging (only happens once)
    _initialize_cloud_logging()

    # Return a named logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    return logger


# Example usage (for testing)
if __name__ == "__main__":
    logger = get_logger()

    def test_function():
        logger.info("This is an info message")
        logger.warning("This is a warning message")
        logger.error("This is an error message")

    test_function()
