"""Client for fetching listings from the Baxus API."""
import requests
from heliuspy import HeliusAPI
from solana.rpc.api import Client

from .utils.config import Config
from .utils.log import get_logger

logger = get_logger()


class HeliusClient:
    """HTTP client for the Baxus API with retry logic."""

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

    def get_parsed_transactions(self, pub_key: str = None):
        """Get parsed transactions for a Solana wallet address.

        Fetches and prints the most recent transactions for the configured
        Baxus public key.

        Args:
            pub_key: The public key to query. Uses default Baxus key if not provided.
        """
        transactions = self.Helius.get_parsed_transactions(
            address=self.pub_key, limit=10, before='3wXGMBHHxgsGckKF7H8HCywb7vb6o38bYz46v6nUZvPohhSrLhBYyKS7K9aabEYA8YXTt5Rtrh3ektpeQbrmiPr7')
        print(transactions)
        for each in transactions:
            # print(each)
            print('-----------------')

    def get_transactions(self, pub_key: str = None):
        """Get raw transactions for a Solana wallet address.

        Fetches successful transactions for the Baxus public key using
        the Helius RPC endpoint.

        Args:
            pub_key: The public key to query. Uses default Baxus key if not provided.
        """
        params = {
            "transactionDetails": 'full',
            "sortOrder": 'desc',
            "limit": 10,
            "filters": {
                "status": 'succeeded'
            }
        }

        payload = [self.pub_key, {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTransactionsForAddress",
            "params": params,
        }]

        payload = {
            "jsonrpc": '2.0',
            "id": 1,
            "method": 'getTransactionsForAddress',
            "params": [
                'BAXUz8YJsRtZVZuMaespnrDPMapvu83USD6PXh4GgHjg',
                {
                    "transactionDetails": 'full',
                    "sortOrder": 'desc',
                    "limit": 5,
                    "filters": {
                        "status": 'succeeded'
                    }
                }
            ]
        }
        transactions = self._send_request(
            url=self.RPC_ENDPOINT, postdict=payload)
        for each in transactions['result'].get('data'):
            print(each)
            print('-----------------')

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
    W.get_transactions()
