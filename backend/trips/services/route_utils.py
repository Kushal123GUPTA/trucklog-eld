"""
Route Geometry Utilities.

Provides helper functions for working with route coordinates:
  - Haversine distance calculation
  - Cumulative distance computation along a polyline
  - Position interpolation at a given distance along a route
"""

import math
from typing import List, Tuple

# Earth's radius in miles
EARTH_RADIUS_MILES = 3958.8


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance in miles between two points
    specified by latitude/longitude using the Haversine formula.
    """
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    return EARTH_RADIUS_MILES * c


def compute_cumulative_distances(geometry: List[List[float]]) -> List[float]:
    """
    Compute cumulative distances along a route geometry.

    Args:
        geometry: List of [lng, lat] coordinate pairs from ORS.

    Returns:
        List of cumulative distances in miles.
        First element is 0.0, last element is the total route length.
        Length = len(geometry).
    """
    if not geometry:
        return []

    cumulative = [0.0]
    for i in range(1, len(geometry)):
        segment_dist = haversine_miles(
            geometry[i - 1][1], geometry[i - 1][0],
            geometry[i][1], geometry[i][0],
        )
        cumulative.append(cumulative[-1] + segment_dist)

    return cumulative


def interpolate_position(
    geometry: List[List[float]],
    cumulative: List[float],
    target_distance: float,
) -> Tuple[float, float]:
    """
    Find the [lng, lat] coordinates at a given distance along the route.

    Uses binary search on the precomputed cumulative distances, then
    linearly interpolates within the matching segment.

    Args:
        geometry: Route coordinate list ([lng, lat] pairs).
        cumulative: Precomputed cumulative distances from compute_cumulative_distances().
        target_distance: Distance in miles from the route start.

    Returns:
        (lng, lat) tuple at the target distance.
    """
    if not geometry or not cumulative:
        return (0.0, 0.0)

    total = cumulative[-1]

    # Clamp to route bounds
    if target_distance <= 0:
        return (geometry[0][0], geometry[0][1])
    if target_distance >= total:
        return (geometry[-1][0], geometry[-1][1])

    # Binary search for the correct segment
    lo, hi = 0, len(cumulative) - 1
    while lo < hi - 1:
        mid = (lo + hi) // 2
        if cumulative[mid] <= target_distance:
            lo = mid
        else:
            hi = mid

    # Interpolate within segment [lo, hi]
    seg_start = cumulative[lo]
    seg_end = cumulative[hi]
    seg_length = seg_end - seg_start

    if seg_length < 1e-10:
        ratio = 0.0
    else:
        ratio = (target_distance - seg_start) / seg_length

    lng = geometry[lo][0] + ratio * (geometry[hi][0] - geometry[lo][0])
    lat = geometry[lo][1] + ratio * (geometry[hi][1] - geometry[lo][1])

    return (lng, lat)


def simplify_geometry(geometry: List[List[float]], max_points: int = 500) -> List[List[float]]:
    """
    Reduce the number of points in a route geometry for efficient
    storage and frontend rendering by taking every Nth point.

    Args:
        geometry: Full route coordinate list.
        max_points: Maximum number of output points.

    Returns:
        Simplified coordinate list (always includes first and last points).
    """
    if len(geometry) <= max_points:
        return geometry

    step = len(geometry) / max_points
    indices = [int(i * step) for i in range(max_points)]

    # Always include the last point
    if indices[-1] != len(geometry) - 1:
        indices[-1] = len(geometry) - 1

    return [geometry[i] for i in indices]
