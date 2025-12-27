"""Alert matching logic."""

from .models import Alert, Asset
from .log import get_logger

logger = get_logger()

def matches_alert(alert: Alert, asset: Asset) -> bool:
    """Check if an asset matches an alert's criteria."""

    # Check match strings (case-insensitive substring match)
    if alert.match_strings:
        name_lower = asset.name.lower()
        required_terms = [s.strip().lower() for s in alert.match_strings if s and s.strip()]
        if required_terms:
            if alert.match_all:
                # All terms must match
                if not all(term in name_lower for term in required_terms):
                    return False
            else:
                # Any one term matching is sufficient
                if not any(term in name_lower for term in required_terms):
                    return False

    # Check max price
    if alert.max_price is not None and asset.price is not None:
        if asset.price > alert.max_price:
            return False

    # Check bottled year range
    if alert.bottled_year_min is not None:
        if asset.bottled_year is None:
            return False
        elif asset.bottled_year < alert.bottled_year_min:
            return False
    if alert.bottled_year_max is not None:
        if asset.bottled_year is None:
            return False
        elif asset.bottled_year > alert.bottled_year_max:
            return False

    # Check age range
    if alert.age_min is not None:
        if asset.age is None:
            return False
        elif asset.age < alert.age_min:
            return False
    if alert.age_max is not None:
        if asset.age is None:
            return False
        elif asset.age > alert.age_max:
            return False

    return True


def find_matching_alerts(alerts: list[Alert], asset: Asset) -> list[Alert]:
    """Find all alerts that match the given asset."""
    return [alert for alert in alerts if matches_alert(alert, asset)]
