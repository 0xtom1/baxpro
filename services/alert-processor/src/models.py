"""Data models for Alert Processor."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from .config import config
from .log import get_logger

logger = get_logger()


def _fmt_dt(dt):
    return dt.strftime('%Y-%m-%d %H:%M') if dt else "—"


def _fmt_price(p):
    return f"${p:,.0f}" if p is not None else "—"


def _fmt_int(i):
    return str(i) if i is not None else "—"


@dataclass
class Alert:
    """User alert configuration."""

    id: int
    user_id: int
    user_email: str
    name: str
    match_strings: list[str]
    match_all: bool
    max_price: float | None
    bottled_year_min: int | None
    bottled_year_max: int | None
    age_min: int | None
    age_max: int | None

    @classmethod
    def from_row(cls, row: tuple, columns: list[str]) -> "Alert":
        """Create Alert from database row."""
        data = dict(zip(columns, row))
        match_strings = data.get("match_strings")
        clean_match_strings = list()
        if match_strings:
            for each in match_strings:
                clean_match_strings.append(each.replace("'", ""))
        return cls(
            id=data["id"],
            user_id=data["user_id"],
            user_email=data["user_email"],
            name=data["name"],
            match_strings=clean_match_strings,
            match_all=data.get("match_all", False),
            max_price=data.get("max_price"),
            bottled_year_min=data.get("bottled_year_min"),
            bottled_year_max=data.get("bottled_year_max"),
            age_min=data.get("age_min"),
            age_max=data.get("age_max"),
        )


@dataclass
class Asset:
    """Asset/listing data from Pub/Sub message."""

    asset_idx: int
    activity_idx: int | None
    name: str
    price: float | None
    bottled_year: int | None
    age: int | None
    url: str | None
    asset_id: str | None = None
    asset_json: dict[str, Any] | None = None

    def __str__(self):
        name_display = self.name
        if len(self.name) > 60:
            name_display = self.name[:57] + "..."

        age_str = f" age={self.age}" if self.age else ""
        bottled_str = f"bottledyear={self.bottled_year}" if self.bottled_year else ""
        price_str = _fmt_price(self.price) if self.price is not None else "—"

        lines = [
            "<Asset>",
            f"  asset_idx   : {self.asset_idx or '—'}",
            f"  activity_idx: {self.activity_idx or '—'}",
            f"  name        : {name_display}",
            f"  details     : {bottled_str} {age_str}",
            f"  price       : {price_str}",
            f"  url         : {self.url}",
            "</Asset>",
        ]
        return "\n".join(lines)


@dataclass
class AlertMatch:
    """A match between an alert and an asset."""

    id: int | None
    alert_id: int
    user_id: int
    listing_source: str
    record_id: int | None
    asset_id: str


def _parse_int(key_name: str, value_raw=None) -> int:
    """_summary_

    Args:
        key_name (str): _description_
        asset_data (dict): _description_
        is_attribute (bool, optional): _description_. Defaults to False.

    Returns:
        int: _description_
    """
    if value_raw == "" or value_raw is None:
        value = None
    else:
        try:
            value = int(value_raw)
        except (ValueError, TypeError):
            logger.warning(
                f"Invalid {key_name} value: {value_raw!r} treating as None")
            value = None
    return value


def _parse_float(key_name: str = None, value_raw=None) -> float:
    """_summary_

    Args:
        key_name (str): _description_
        asset_data (dict): _description_
        is_attribute (bool, optional): _description_. Defaults to False.

    Returns:
        int: _description_
    """
    if value_raw == "" or value_raw is None:
        value = None
    else:
        try:
            value = float(value_raw)
            if value == 0:
                return None
        except (ValueError, TypeError):
            logger.warning(
                f"Invalid {key_name} value: {value_raw!r} treating as None")
            value = None
    return value


def _parse_bool(key_name: str = None, value_raw=None) -> bool:
    """_summary_

    Args:
        key_name (str): _description_
        asset_data (dict): _description_
        is_attribute (bool, optional): _description_. Defaults to False.

    Returns:
        int: _description_
    """

    value = bool(value_raw) and value_raw is not False

    return value


def _parse_datetime(key_name: str = None, value_raw=None) -> bool:
    """_summary_

    Args:
        key_name (str): _description_
        asset_data (dict): _description_
        is_attribute (bool, optional): _description_. Defaults to False.

    Returns:
        int: _description_
    """
    value = None
    if value_raw:
        try:
            value = datetime.fromisoformat(
                value_raw.replace("Z", "+00:00")
            )
        except Exception as e:
            logger.warning(
                f"Bad datetime '{value_raw}' for {key_name} → {e}")

    return value


def get_asset(asset_idx, name, price, bottled_year, age, activity_idx: int) -> Asset:
    """
    Insert or update a listing. 
    Returns is_new bool where is_new indicates if this was a new asset.
    """
    # Safely extract values → None if missing or empty string
    asset_idx = int(asset_idx)
    price = _parse_float(key_name='price', value_raw=price)
    bottled_year = _parse_int(key_name='bottled_year', value_raw=bottled_year)
    age = _parse_int(key_name="age", value_raw=age)

    name = name.replace("'", "")

    if config.environment == "dev":
        url = f"https://dev.baxpro.xyz/asset/{asset_idx}"
    else:
        url = f"https://baxpro.xyz/asset/{asset_idx}"

    return Asset(asset_idx=asset_idx,
                 activity_idx=activity_idx,
                 name=name,
                 price=price,
                 bottled_year=bottled_year,
                 age=age,
                 url=url
                 )
