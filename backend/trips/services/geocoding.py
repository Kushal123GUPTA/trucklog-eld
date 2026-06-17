"""
OpenRouteService Geocoding Integration.

Converts location strings (addresses, cities) to coordinates
and provides autocomplete suggestions for the frontend.
"""

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class GeocodingError(Exception):
    """Raised when geocoding fails."""
    pass


def geocode_location(query, limit=5):
    """
    Geocode a location string to coordinates using ORS Pelias.

    Args:
        query: Location string (e.g., "Chicago, IL")
        limit: Max number of results

    Returns:
        list of dicts with keys:
            - name: str (formatted address)
            - lat: float
            - lng: float
            - label: str (full display label)
    """
    if not settings.ORS_API_KEY:
        raise GeocodingError("ORS_API_KEY is not configured.")

    url = f"{settings.ORS_BASE_URL}/geocode/search"
    params = {
        "api_key": settings.ORS_API_KEY,
        "text": query,
        "size": limit,
    }

    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"ORS geocoding request failed: {e}")
        raise GeocodingError(f"Geocoding service unavailable: {e}")

    results = []
    for feature in data.get("features", []):
        coords = feature["geometry"]["coordinates"]  # [lng, lat]
        props = feature["properties"]
        results.append({
            "name": props.get("name", ""),
            "label": props.get("label", ""),
            "lat": coords[1],
            "lng": coords[0],
            "region": props.get("region", ""),
            "country": props.get("country", ""),
        })

    return results


def reverse_geocode(lat, lng):
    """
    Reverse geocode coordinates to a location name.

    Args:
        lat: Latitude
        lng: Longitude

    Returns:
        str: Location name (e.g., "Chicago, IL")
    """
    if not settings.ORS_API_KEY:
        raise GeocodingError("ORS_API_KEY is not configured.")

    url = f"{settings.ORS_BASE_URL}/geocode/reverse"
    params = {
        "api_key": settings.ORS_API_KEY,
        "point.lat": lat,
        "point.lon": lng,
        "size": 1,
    }

    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"ORS reverse geocoding failed: {e}")
        return f"{lat:.4f}, {lng:.4f}"

    features = data.get("features", [])
    if features:
        props = features[0]["properties"]
        city = props.get("locality", props.get("name", ""))
        state = props.get("region_a", props.get("region", ""))
        if city and state:
            return f"{city}, {state}"
        return props.get("label", f"{lat:.4f}, {lng:.4f}")

    return f"{lat:.4f}, {lng:.4f}"
