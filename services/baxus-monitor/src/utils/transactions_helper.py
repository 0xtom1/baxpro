"""Utilities for parsing Solana transactions into activity feed objects."""

from datetime import datetime

from src.models import ActivityFeed

from .log import get_logger

logger = get_logger()


class TransactionsHelper:
    """Helper class for parsing Solana transactions into activity feed objects."""

    def __init__(self, activity_types_map: dict = None):
        self.activity_types_map = activity_types_map
        self.USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

    def create_activity_feed_object(self, transaction: dict = None) -> ActivityFeed:
        """Create ActivityFeed object based on transaction type."""

        result = None

        if self.is_burn_transaction(transaction=transaction):
            result = self.parse_burn_transaction(transaction=transaction)
        elif self.is_purchase_transaction(transaction=transaction):
            result = self.parse_purchase_transaction(transaction=transaction)
        elif self.is_mint_transaction(transaction=transaction):
            result = self.parse_mint_transaction(transaction=transaction)

        return result

    def is_mint_transaction(self, transaction: dict) -> bool:
        """Determine if a transaction is a mint transaction.

            Logic:
                    1. No tokenTransfers
                    2. Instructions progamID = TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
                    3. Must have exactly 1 token balance change
                    4. Must have a mint and rawTokenAmount in that change
        Args:
            transaction: The transaction data.
        """
        # 1. No tokenTransfers
        if len(transaction.get("tokenTransfers", [])) > 1:
            return False

        # 2. Instructions progamID = TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
        instructions = transaction.get("instructions", [])
        if len(instructions) != 1:
            return False
        for instruction in instructions:
            if instruction.get("programId") != "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb":
                return False

        # 3. Must have exactly 1 token balance change
        account_data = transaction.get("accountData", [])
        token_balance_changes_count = len([x for x in account_data if len(x.get("tokenBalanceChanges")) > 0])

        if token_balance_changes_count != 1:
            return False

        for change in account_data:
            for token_change in change.get("tokenBalanceChanges", []):
                # 4. Must have a mint and rawTokenAmount in that change
                if token_change.get("mint") and token_change.get("rawTokenAmount", {}).get("tokenAmount"):
                    return True

        return False

    def parse_mint_transaction(self, transaction: dict) -> ActivityFeed:
        """Parse mint transaction to extract relevant details.

        Args:
            transaction: The transaction data.
        """
        activity_feed = None
        account_data = transaction.get("accountData", [])

        activity_date = datetime.fromtimestamp(transaction["timestamp"])

        for change in account_data:
            for token_change in change.get("tokenBalanceChanges", []):
                if token_change.get("mint") and token_change.get("rawTokenAmount", {}).get("tokenAmount") == "1":
                    activity_feed = ActivityFeed(
                        activity_date=activity_date,
                        signature=transaction.get("signature"),
                        from_user_account=None,
                        to_user_account=token_change.get("userAccount"),
                        activity_type_idx=self.activity_types_map["MINT"],
                        asset_idx=0,  # Placeholder, to be set later
                    )
                    activity_feed.mint = token_change.get("mint")

        return activity_feed

    def is_burn_transaction(self, transaction: dict) -> bool:
        """Determine if a transaction is a burn transaction.

        A burn transaction has exactly one mint with a net change of -1,
        indicating a token was destroyed.

        Args:
            transaction: The parsed transaction data from Helius.

        Returns:
            bool: True if the transaction is a burn event.
        """
        net_changes = self.get_net_mint_changes(transaction=transaction)
        if len(net_changes) == 1:
            return any(amount == -1 for amount in net_changes.values())

        return False

    def parse_burn_transaction(self, transaction: dict) -> ActivityFeed:
        """Parse burn transaction to extract relevant details.

        Args:
            transaction: The transaction data.
        """
        activity_feed = None
        account_data = transaction.get("accountData", [])

        activity_date = datetime.fromtimestamp(transaction["timestamp"])
        signature = transaction.get("signature")
        activity_type_idx = self.activity_types_map["BURN"]
        from_user_account = None
        mint = None

        for change in account_data:
            for token_change in change.get("tokenBalanceChanges", []):
                if token_change.get("mint") and token_change.get("rawTokenAmount", {}).get("tokenAmount") == "-1":
                    from_user_account = token_change.get("userAccount")
                    mint = token_change.get("mint")

        if from_user_account and mint:
            activity_feed = ActivityFeed(
                activity_date=activity_date,
                signature=signature,
                from_user_account=from_user_account,
                to_user_account=None,
                activity_type_idx=activity_type_idx,
                asset_idx=0,  # Placeholder, to be set later
            )
            activity_feed.mint = mint

        return activity_feed

    def get_net_mint_changes(self, transaction: dict) -> dict:
        """Get net mint changes from a transaction.

        Args:
            transaction: The transaction data.
        """
        net_changes = {}
        account_data = transaction.get("accountData", [])
        for change in account_data:
            for token_change in change.get("tokenBalanceChanges", []):
                mint = token_change.get("mint")
                try:
                    amount = int(token_change.get("rawTokenAmount", {}).get("tokenAmount", "0"))
                except ValueError:
                    amount = 0
                if mint not in net_changes:
                    net_changes[mint] = 0
                net_changes[mint] += amount
        return net_changes

    def get_net_mint_changes_per_user_account(self, transaction: dict) -> dict:
        """Get net token balance changes grouped by mint and user account.

        Args:
            transaction: The parsed transaction data from Helius.

        Returns:
            dict: Nested dict of {mint: {user_account: net_amount}}.
        """
        net_user_changes = {}
        account_data = transaction.get("accountData", [])
        for change in account_data:
            for token_change in change.get("tokenBalanceChanges", []):
                mint = token_change.get("mint")
                try:
                    amount = int(token_change.get("rawTokenAmount", {}).get("tokenAmount", "0"))
                except ValueError:
                    amount = 0
                if mint not in net_user_changes:
                    net_user_changes[mint] = {}
                user_account = token_change.get("userAccount")
                if user_account not in net_user_changes[mint]:
                    net_user_changes[mint][user_account] = 0
                net_user_changes[mint][user_account] += amount
        return net_user_changes

    def is_purchase_transaction(self, transaction: dict) -> bool:
        """Determine if a transaction is a purchase transaction.

        A purchase transaction involves USDC and an NFT token where:
        1. USDC net change is zero (transferred between accounts)
        2. Exactly two mints involved (USDC + the NFT)
        3. USDC is sent from exactly one account (the buyer)

        Args:
            transaction: The parsed transaction data from Helius.

        Returns:
            bool: True if the transaction is a purchase event.
        """
        net_changes = self.get_net_mint_changes(transaction=transaction)
        net_user_changes = self.get_net_mint_changes_per_user_account(transaction=transaction)

        if (
            self.USDC_MINT not in net_changes
            or net_changes[self.USDC_MINT] != 0
        ):
            return False

        if len(net_changes) != 2:
            return False

        usdc_sender_count = sum(1 for value in net_user_changes[self.USDC_MINT].values() if value < 0)
        if usdc_sender_count != 1:
            return False
        return True

    def parse_purchase_transaction(self, transaction: dict) -> ActivityFeed:
        """Parse a purchase transaction to extract buyer, seller, price, and asset.

        Args:
            transaction: The parsed transaction data from Helius.

        Returns:
            ActivityFeed: Activity record with from/to accounts and USDC price.
        """
        activity_feed = None
        net_user_changes = self.get_net_mint_changes_per_user_account(transaction=transaction)

        activity_date = datetime.fromtimestamp(transaction["timestamp"])
        signature = transaction.get("signature")
        activity_type_idx = self.activity_types_map["PURCHASE"]
        from_user_account = None
        to_user_account = None
        mint = None
        price = None

        for token in net_user_changes:
            for user_account, amount in net_user_changes[token].items():
                if token == self.USDC_MINT:
                    if amount < 0:
                        price = (amount * -1) // 1_000_000  # USDC has 6 decimals
                else:
                    if amount > 0:
                        to_user_account = user_account
                    elif amount < 0:
                        from_user_account = user_account
                    mint = token

        if to_user_account and from_user_account and mint and price:
            activity_feed = ActivityFeed(
                activity_date=activity_date,
                price=price,
                signature=signature,
                from_user_account=from_user_account,
                to_user_account=to_user_account,
                activity_type_idx=activity_type_idx,
                asset_idx=0,  # Placeholder, to be set later
            )
            activity_feed.mint = mint
        return activity_feed

    def close(self):
        """Clean up resources."""
        self.db.close()
