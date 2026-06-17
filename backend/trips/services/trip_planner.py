"""
Trip Planner — Orchestrates the full trip planning pipeline.

Flow:
  1. Geocode all 3 locations
  2. Get route from ORS (two legs)
  3. Run HOS simulation
  4. Reverse-geocode stop positions
  5. Save Trip + Stops + Logs to DB
  6. Return serialized trip data
"""

import logging
from datetime import datetime, timezone

from ..models import Trip, TripStop, DailyLog, DutyStatusEntry
from .geocoding import geocode_location, reverse_geocode, GeocodingError
from .routing import get_directions, RoutingError
from .hos_engine import DriverState, HOSEngine, AVG_SPEED_MPH
from .route_utils import compute_cumulative_distances, simplify_geometry

logger = logging.getLogger(__name__)


class TripPlanningError(Exception):
    """Raised when trip planning fails."""
    pass


def plan_trip(current_location, pickup_location, dropoff_location, current_cycle_used):
    """
    Main entry point: plans a full trip with HOS compliance.

    Args:
        current_location: str — driver's current location
        pickup_location: str — cargo pickup location
        dropoff_location: str — cargo dropoff location
        current_cycle_used: float — hours used in 70-hr cycle

    Returns:
        Trip model instance (saved, with all related objects).
    """

    # ── Step 1: Geocode all locations ──────────────────────────
    try:
        current_geo = _geocode_first(current_location)
        pickup_geo = _geocode_first(pickup_location)
        dropoff_geo = _geocode_first(dropoff_location)
    except GeocodingError as e:
        raise TripPlanningError(f"Geocoding failed: {e}")

    # ── Step 2: Get routes from ORS ────────────────────────────
    try:
        leg1 = get_directions(
            [current_geo['lng'], current_geo['lat']],
            [pickup_geo['lng'], pickup_geo['lat']],
        )
        leg2 = get_directions(
            [pickup_geo['lng'], pickup_geo['lat']],
            [dropoff_geo['lng'], dropoff_geo['lat']],
        )
    except RoutingError as e:
        raise TripPlanningError(f"Routing failed: {e}")

    total_distance = leg1['distance_miles'] + leg2['distance_miles']

    # ── Step 3: Prepare route geometry for interpolation ───────
    leg1_cum = compute_cumulative_distances(leg1['geometry'])
    leg2_cum = compute_cumulative_distances(leg2['geometry'])

    # Combined geometry for map display
    full_geometry = simplify_geometry(
        leg1['geometry'] + leg2['geometry'], max_points=800
    )

    # ── Step 4: Run HOS simulation ─────────────────────────────
    start_time = datetime.now(timezone.utc)
    state = DriverState(current_cycle_used, start_time)
    engine = HOSEngine(state)

    # Record start stop
    state.stops.append(_make_stop_event(
        'start', current_geo['label'], current_geo['lat'], current_geo['lng'],
        start_time, start_time, 0.0, 0.0,
    ))

    # Leg 1: Current → Pickup
    engine.simulate_leg(
        leg1['distance_miles'], leg1['geometry'], leg1_cum,
        current_geo['label'], pickup_geo['label'],
        (current_geo['lng'], current_geo['lat']),
        (pickup_geo['lng'], pickup_geo['lat']),
    )

    # Pickup stop (1 hour on-duty not driving)
    engine.add_pickup(
        pickup_geo['lat'], pickup_geo['lng'],
        pickup_geo['label'], leg1['distance_miles'],
    )

    # Leg 2: Pickup → Dropoff
    engine.simulate_leg(
        leg2['distance_miles'], leg2['geometry'], leg2_cum,
        pickup_geo['label'], dropoff_geo['label'],
        (pickup_geo['lng'], pickup_geo['lat']),
        (dropoff_geo['lng'], dropoff_geo['lat']),
    )

    # Dropoff stop (1 hour on-duty not driving)
    engine.add_dropoff(
        dropoff_geo['lat'], dropoff_geo['lng'],
        dropoff_geo['label'], total_distance,
    )

    # ── Step 5: Generate daily logs ────────────────────────────
    daily_logs_data = engine.generate_daily_logs()

    # ── Step 6: Reverse-geocode stop locations ─────────────────
    _enrich_stop_locations(state.stops)

    # ── Step 7: Calculate summary stats ────────────────────────
    total_driving_hrs = sum(
        ev.hours for ev in state.events if ev.status == 'driving'
    )
    total_duration_hrs = (
        (state.current_time - start_time).total_seconds() / 3600
    )

    # ── Step 8: Save to database ───────────────────────────────
    trip = Trip.objects.create(
        current_location=current_geo['label'],
        current_lat=current_geo['lat'],
        current_lng=current_geo['lng'],
        pickup_location=pickup_geo['label'],
        pickup_lat=pickup_geo['lat'],
        pickup_lng=pickup_geo['lng'],
        dropoff_location=dropoff_geo['label'],
        dropoff_lat=dropoff_geo['lat'],
        dropoff_lng=dropoff_geo['lng'],
        current_cycle_used=current_cycle_used,
        total_distance=round(total_distance, 1),
        total_duration=round(total_duration_hrs, 1),
        total_driving_hours=round(total_driving_hrs, 1),
        total_days=len(daily_logs_data),
        route_geometry=full_geometry,
    )

    # Save stops
    for idx, stop in enumerate(state.stops):
        TripStop.objects.create(
            trip=trip,
            stop_type=stop.stop_type,
            location_name=stop.location,
            lat=stop.lat,
            lng=stop.lng,
            arrival_time=stop.arrival,
            departure_time=stop.departure,
            duration_hours=stop.duration_hours,
            sequence=idx,
            cumulative_miles=round(stop.cumulative_miles, 1),
        )

    # Save daily logs + duty status entries
    for log_data in daily_logs_data:
        daily_log = DailyLog.objects.create(
            trip=trip,
            date=log_data['date'],
            day_number=log_data['day_number'],
            total_miles_driving=log_data['total_miles_driving'],
            total_hours_driving=log_data['total_hours_driving'],
            total_hours_on_duty=log_data['total_hours_on_duty'],
            total_hours_off_duty=log_data['total_hours_off_duty'],
            total_hours_sleeper=log_data['total_hours_sleeper'],
            from_location=log_data['from_location'],
            to_location=log_data['to_location'],
            cycle_hours_available=max(0, 70 - current_cycle_used),
        )

        for entry in log_data['entries']:
            DutyStatusEntry.objects.create(
                daily_log=daily_log,
                status=entry['status'],
                start_time=entry['start_time'],
                end_time=entry['end_time'],
                location=entry.get('location', ''),
                remarks=entry.get('remarks', ''),
            )

    return trip


# ── Private Helpers ────────────────────────────────────────────

def _geocode_first(location_text):
    """Geocode a location and return the first (best) result."""
    results = geocode_location(location_text, limit=1)
    if not results:
        raise TripPlanningError(f"Could not geocode location: '{location_text}'")
    return results[0]


def _make_stop_event(stop_type, location, lat, lng, arrival, departure, duration, miles):
    """Create a StopEvent without importing the class (avoids circular)."""
    from .hos_engine import StopEvent
    return StopEvent(stop_type, location, lat, lng, arrival, departure, duration, miles)


def _enrich_stop_locations(stops):
    """
    Reverse-geocode stop positions to get real city/state names.
    Only enriches stops that have generic 'Mile X' names.
    """
    for stop in stops:
        if stop.location.startswith('Mile ') and stop.stop_type not in ('start',):
            try:
                name = reverse_geocode(stop.lat, stop.lng)
                if name and not name[0].isdigit():
                    stop.location = name
            except Exception:
                pass  # Keep the 'Mile X' name
