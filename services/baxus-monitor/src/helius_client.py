"""Client for interacting with the Helius RPC API for Solana blockchain data."""


import requests
from heliuspy import HeliusAPI
from solana.rpc.api import Client

from .utils.config import Config
from .utils.log import get_logger

logger = get_logger()


class HeliusClient:
    """Client for interacting with the Helius RPC API for Solana blockchain data."""

    def __init__(self, config: Config):
        self.config = config
        self.helius_api_key = config.helius_api_key
        self.RPC_ENDPOINT = f"https://mainnet.helius-rpc.com/?api-key={self.helius_api_key}"
        self.Helius = HeliusAPI(api_key=self.helius_api_key)
        self.COMMITMENT = "confirmed"  # Commitment level for RPC calls
        self.base_rpc_url = "https://mainnet.helius-rpc.com"
        self.api_key_query = f"?api-key={self.helius_api_key}"
        # Initialize Solana client
        try:
            self.client = Client(self.RPC_ENDPOINT, commitment=self.COMMITMENT)
        except Exception as e:
            raise Exception(f"Failed to connect to Helius RPC: {e}")
        self.pub_key = 'BAXUz8YJsRtZVZuMaespnrDPMapvu83USD6PXh4GgHjg'
        """
        burn and mint ? BAXUz8YJsRtZVZuMaespnrDPMapvu83USD6PXh4GgHjg
        recieves usd? 
        signer? BAXDZX8gHKByCrcxNoR2udxQwDAM4UYKTFbfDawgDHwR
        """

    def get_parsed_transactions(self, until_signature: str = None, before_signature: str = None, response_size: int = 100):
        """Get parsed transactions for a Solana wallet address.

        Fetches and prints the most recent transactions for the configured
        Baxus public key.

        before_signature = starting point for pagination

        until = end point for pagination

        results in reverse chronological order

        Args:
            pub_key: The public key to query. Uses default Baxus key if not provided.
        """
        try:
            transactions = self.Helius.get_parsed_transactions(
                address=self.pub_key, limit=response_size, until=until_signature, before=before_signature, commitment="confirmed")
            return transactions
        except Exception as e:
            logger.error(f"Error fetching parsed transactions: {e}")
            return []

    def get_asset(self, id: str = None):
        """Fetch asset metadata from the Helius DAS API.

        Args:
            id: The Solana token mint address to query.

        Returns:
            dict: Asset metadata including content, ownership, and mint extensions.
        """
        try:
            asset_info = self.Helius.get_asset(id=id)
            return asset_info
        except Exception as e:
            logger.error(f"Error fetching asset: {e}")
            return None

    def _send_request(self, url, headers=None, params=None, postdict=None, verb=None):
        """Send an HTTP request to the specified endpoint.

        Args:
            url: The URL endpoint to send the request to.
            headers: Optional HTTP headers dict. Defaults to JSON content type.
            params: Optional query parameters for GET requests.
            postdict: Optional JSON body for POST requests.
            verb: HTTP method (GET or POST). Auto-detected if not provided.

        Returns:
            dict[str, any]: The JSON-parsed API response.
        """
        if not verb:
            verb = "POST" if postdict else "GET"

        if not headers:
            headers = {"Content-Type": "application/json"}

        # Make the request
        if verb == "POST":
            response = requests.post(url, json=postdict, headers=headers)
        else:
            response = requests.get(url, params=params, headers=headers)

        return response.json()


if __name__ == "__main__":
    from .utils.config import config
    W = HeliusClient(config=config
                     )
    W.get_asset()
    