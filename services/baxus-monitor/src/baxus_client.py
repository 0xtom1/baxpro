"""Client for fetching listings from the Baxus API."""

from datetime import datetime, timezone
from time import sleep

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .utils.config import Config
from .utils.log import get_logger

logger = get_logger()


class BaxusClient:
    """HTTP client for the Baxus API with retry logic."""

    def __init__(self, config: Config):
        self.config = config
        self.base_url = config.baxus_api_base
        self.api_key = config.baxus_api_key
        self.DEFAULT_DELAY_SECONDS = 1
        self.session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    def _get_headers(self) -> dict:
        """Build request headers."""
        headers = {
            "Accept": "application/json",
            "User-Agent": "BaxPro-Monitor/1.0",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def fetch_assets(
        self, from_index: int = 0, size: int = 50, spirit_type: str = None, payload: dict = None, listed: bool = None
    ) -> dict:
        """
        Fetch a page of assets from Baxus API.

        """
        url = f"{self.base_url}/search/assets"
        params = {
            "from": from_index,
            "size": size,
        }
        if spirit_type:
            params["spiritTypes"] = spirit_type
        if listed:
            params["listed"] = "true"
        try:
            start_time = datetime.now(timezone.utc)
            if payload:
                params.pop("from", None)
                params.pop("types", None)
                response = self.session.post(
                    url,
                    headers=self._get_headers(),
                    params=params,
                    timeout=30,
                    json=payload
                )
            else:
                response = self.session.get(
                    url,
                    headers=self._get_headers(),
                    params=params,
                    timeout=30
                )
            response.raise_for_status()
            elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.info(f"{url} - " f"{params} - " f"Elapsed {elapsed:.2f}s")
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching assets: {e}")
            raise

    def get_new_listings(self, size: int = 24, from_index: int = 0) -> list[dict]:
        """
        Iterate through all listing pages.

        Yields individual listing dictionaries.

        url = f"{self.base_url}/"
        params = {
            "sortBy": "listed_date:desc",
            "from": 0,
            "size": size,
            "_data": "routes/index"
        }
        """
        url = f"{self.base_url}/search/assets"
        params = {"from": from_index, "size": size,
                  "listed": "true", "sort": "listed_date:desc"}
        try:
            start_time = datetime.now(timezone.utc)
            response = self.session.get(
                url,
                headers=self._get_headers(),
                params=params,
                timeout=30,
            )
            response.raise_for_status()
            elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.info(f"{url} - " f"{params} - " f"Elapsed {elapsed:.2f}s")
            sleep(self.DEFAULT_DELAY_SECONDS)
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching listings: {e}")
            raise

    def get_asset_metadata(self, baxus_idx: int = None) -> dict:
        """
        Iterate through all listing pages.

        Yields individual listing dictionaries.

        url = f"{self.base_url}/"
        params = {
            "sortBy": "listedDate:desc",
            "from": 0,
            "size": size,
            "_data": "routes/index"
        }
        """
        url = f"https://assets.baxus.co/{baxus_idx}/solana-nft-metadata.json"

        try:
            start_time = datetime.now(timezone.utc)
            response = self.session.get(
                url,
                headers=self._get_headers(),
                timeout=30,
            )
            response.raise_for_status()
            elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.info(f"{url} -  " f"Elapsed {elapsed:.2f}s")
            sleep(self.DEFAULT_DELAY_SECONDS)
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching asset metadata: {e}")
            return None
