"""
OpenRouteService Routing Integration.

Fetches driving directions between coordinates using ORS's
heavy-goods-vehicle (HGV/truck) profile for accurate truck routing.
"""

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

METERS_TO_MILES = 0.000621371


class RoutingError(Exception):
    """Raised when the routing service fails."""
    pass


def get_directions(start_coords, end_coords):
    """
    Get driving directions between two points using ORS HGV profile.

    Args:
        start_coords: [longitude, latitude]
        end_coords: [longitude, latitude]

    Returns:
        dict with keys:
            - distance_miles: float
            - duration_hours: float
            - geometry: list of [lng, lat] coordinate pairs
            - steps: list of instruction dicts
    """
    if not settings.ORS_API_KEY:
        raise RoutingError("ORS_API_KEY is not configured.")

    url = f"{settings.ORS_BASE_URL}/v2/directions/driving-hgv/geojson"
    headers = {
        "Authorization": settings.ORS_API_KEY,
        "Content-Type": "application/json",
    }
    body = {
        "coordinates": [
            list(start_coords),
            list(end_coords),
        ],
        "instructions": True,
        "units": "mi",
    }

    try:
        response = requests.post(url, json=body, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.HTTPError as e:
        error_body = ""
        try:
            error_body = e.response.json().get("error", {}).get("message", str(e))
        except Exception:
            error_body = str(e)
        logger.error(f"ORS routing HTTP error: {error_body}")
        raise RoutingError(f"Routing failed: {error_body}")
    except requests.exceptions.RequestException as e:
        logger.error(f"ORS routing request failed: {e}")
        raise RoutingError(f"Routing service unavailable: {e}")

    # Parse GeoJSON response
    features = data.get("features", [])
    if not features:
        raise RoutingError("No route found between the specified locations.")

    feature = features[0]
    properties = feature["properties"]
    summary = properties.get("summary", {})
    geometry_coords = feature["geometry"]["coordinates"]
    segments = properties.get("segments", [])

    # Extract turn-by-turn steps
    steps = []
    for segment in segments:
        for step in segment.get("steps", []):
            steps.append({
                "instruction": step.get("instruction", ""),
                "distance_miles": step.get("distance", 0),
                "duration_seconds": step.get("duration", 0),
                "type": step.get("type", 0),
            })

    return {
        "distance_miles": summary.get("distance", 0),
        "duration_hours": summary.get("duration", 0) / 3600,
        "geometry": geometry_coords,
        "steps": steps,
    }


def get_full_route(current_coords, pickup_coords, dropoff_coords):
    """
    Get the full two-leg route: current → pickup → dropoff.

    Returns:
        dict with legs, totals, and combined geometry.
    """
    leg1 = get_directions(current_coords, pickup_coords)
    leg2 = get_directions(pickup_coords, dropoff_coords)

    return {
        "leg1": leg1,
        "leg2": leg2,
        "total_distance_miles": leg1["distance_miles"] + leg2["distance_miles"],
        "total_driving_hours": leg1["duration_hours"] + leg2["duration_hours"],
        "full_geometry": leg1["geometry"] + leg2["geometry"],
    }
