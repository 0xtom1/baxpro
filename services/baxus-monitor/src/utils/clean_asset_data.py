import re
from datetime import datetime

from .log import get_logger

logger = get_logger()


def camel_to_snake(name: str) -> str:
    """Convert a camelCase or PascalCase string to snake_case.

    Args:
        name: The string to convert.

    Returns:
        str: The converted snake_case string.
    """
    name = name.replace(" ", "_")
    name = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    name = re.sub("([a-z0-9])([A-Z])", r"\1_\2", name).lower().replace("__", "_")
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", name).lower().replace("__", "_")


def update_if_changed(instance, new_instance, ignore_keys=None, check_only_keys=None) -> bool:
    """Update a SQLAlchemy instance with new values if they differ.

    Args:
        instance: The existing SQLAlchemy model instance to update.
        new_instance: The new instance containing updated values.
        ignore_keys: Set of attribute names to skip during comparison.
        check_only_keys: If provided, only compare these specific keys.

    Returns:
        bool: True if any values were updated, False otherwise.
    """
    if ignore_keys is None:
        ignore_keys = set()

    ignore_keys.update(["_sa_instance_state", "added_date", "created_at"])

    if check_only_keys:
        new_data = {k: v for k, v in new_instance.__dict__.items() if k not in ignore_keys and k in check_only_keys}
    else:
        new_data = {k: v for k, v in new_instance.__dict__.items() if k not in ignore_keys}

    changed = False
    for key, value in new_data.items():
        if getattr(instance, key, None) != value:
            logger.info("----")
            logger.info(f"Value changed for key: {key}")
            if key != "asset_json":
                logger.info(f"Old Value: {getattr(instance, key, None)}")
            setattr(instance, key, value)
            if key != "asset_json":
                logger.info(f"New Value: {value}")
            changed = True
    return changed


def _parse_int(is_attribute: bool = False, key_name: str = None, asset_data: dict = None) -> int:
    """Parse an integer value from asset data.

    Args:
        is_attribute: If True, look for value in bottle_release sub-dict.
        key_name: The key to extract from the asset data.
        asset_data: The asset data dictionary.

    Returns:
        int: The parsed integer value, or None if parsing fails.
    """
    if is_attribute:
        bottle_release = asset_data.get("bottle_release") or {}
        value_raw = bottle_release.get(key_name)
    else:
        value_raw = asset_data.get(key_name)

    if value_raw == "" or value_raw is None:
        value = None
    else:
        try:
            value = int(value_raw)
        except (ValueError, TypeError):
            logger.warning(f"Invalid {key_name} value: {value_raw!r} treating as None")
            value = None
    return value


def _parse_str(is_attribute: bool = False, key_name: str = None, asset_data: dict = None) -> str:
    """Parse a string value from asset data.

    Args:
        is_attribute: If True, look for value in bottle_release sub-dict.
        key_name: The key to extract from the asset data.
        asset_data: The asset data dictionary.

    Returns:
        str: The parsed string value, or None if empty or missing.
    """
    if is_attribute:
        bottle_release = asset_data.get("bottle_release") or {}
        value_raw = bottle_release.get(key_name)
    else:
        value_raw = asset_data.get(key_name)

    if value_raw == "" or value_raw is None:
        value = None
    else:
        try:
            value = str(value_raw)
        except (ValueError, TypeError):
            logger.warning(f"Invalid {key_name} value: {value_raw!r} treating as None")
            value = None
    return value


def _parse_float(
    is_attribute: bool = False, key_name: str = None, asset_data: dict = None, return_none_if_zero: bool = False
) -> float:
    """Parse a float value from asset data.

    Args:
        is_attribute: If True, look for value in bottle_release sub-dict.
        key_name: The key to extract from the asset data.
        asset_data: The asset data dictionary.
        return_none_if_zero: If True, return None when value is 0.

    Returns:
        float: The parsed float value, or None if parsing fails or value is zero.
    """
    if is_attribute:
        bottle_release = asset_data.get("bottle_release") or {}
        value_raw = bottle_release.get(key_name)
    else:
        value_raw = asset_data.get(key_name)

    if value_raw == "" or value_raw is None:
        value = None
    else:
        try:
            value = float(value_raw)
            if value == 0:
                return None
        except (ValueError, TypeError):
            logger.warning(f"Invalid {key_name} value: {value_raw!r} treating as None")
            value = None
    return value


def _parse_bool(is_attribute: bool = False, key_name: str = None, asset_data: dict = None) -> bool:
    """Parse a boolean value from asset data.

    Args:
        is_attribute: If True, look for value in bottle_release sub-dict.
        key_name: The key to extract from the asset data.
        asset_data: The asset data dictionary.

    Returns:
        bool: The parsed boolean value.
    """
    if is_attribute:
        bottle_release = asset_data.get("bottle_release") or {}
        value_raw = bottle_release.get(key_name)
    else:
        value_raw = asset_data.get(key_name)

    value = bool(value_raw) and value_raw is not False

    return value


def _parse_datetime(is_attribute: bool = False, key_name: str = None, asset_data: dict = None) -> datetime:
    """Parse a datetime value from asset data.

    Handles ISO format strings with optional 'Z' timezone suffix.

    Args:
        is_attribute: If True, look for value in bottle_release sub-dict.
        key_name: The key to extract from the asset data.
        asset_data: The asset data dictionary.

    Returns:
        datetime: The parsed datetime value, or None if parsing fails.
    """
    if is_attribute:
        bottle_release = asset_data.get("bottle_release") or {}
        value_raw = bottle_release.get(key_name)
    else:
        value_raw = asset_data.get(key_name)

    value = None
    if value_raw:
        try:
            value = datetime.fromisoformat(value_raw.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception as e:
            logger.warning(f"Bad datetime '{value_raw}' for {key_name} → {e}")

    return value


def get_spirit_types():
    """Get a list of all supported spirit type categories.

    Returns:
        list[str]: List of spirit type names used for filtering assets.
    """
    return [
        "Whisky",
        "Whiskey",
        "Scotch",
        "American Whiskey",
        "Canadian Whisky",
        "Blended Japanese Whisky",
        "Blended Rye",
        "Blended Scotch Whisky",
        "Blended Whiskey",
        "Blended Whisky",
        "Bourbon",
        "English Malt Whisky",
        "Irish Whiskey",
        "Rye",
        "Single Grain Whisky",
        "Single Malt American Whiskey",
        "Single Malt Japanese Whisky",
        "Single Malt Scotch Whisky",
        "Single Malt Swedish Whisky",
        "Single Malt Taiwanese Whisky",
        "Single Malt Australian Whisky",
        "Taiwanese Malt Whisky",
        "Single Pot Still",
        "Sour Mash",
        "Wine",
        "American Rum",
        "Rum",
        "Tequila",
        "Mezcal",
        "Vodka",
        "Armagnac",
        "Cognac",
        "Gin",
        "Brandy",
        "Baijiu",
        "Whisky Cask",
        "Liqueur",
    ]
