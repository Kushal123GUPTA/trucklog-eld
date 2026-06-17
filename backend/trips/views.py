"""
API Views for TruckLog ELD.

Endpoints:
  POST /api/trips/plan/   — Plan a new trip (geocode + route + HOS simulation)
  GET  /api/trips/{id}/   — Retrieve a planned trip with all stops and logs
  GET  /api/trips/        — List recent trips
  GET  /api/geocode/      — Geocode a location string (for autocomplete)
"""

import logging

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Trip
from .serializers import TripSerializer, TripInputSerializer
from .services.trip_planner import plan_trip as execute_trip_plan, TripPlanningError
from .services.geocoding import geocode_location, GeocodingError

logger = logging.getLogger(__name__)



@api_view(["POST"])
def plan_trip(request):
    """
    Plan a new trip.

    Accepts trip input, geocodes locations, fetches route,
    runs HOS simulation, and returns the full trip plan.

    Request body:
        {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Nashville, TN",
            "current_cycle_used": 10
        }
    """
    serializer = TripInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        trip = execute_trip_plan(
            current_location=data["current_location"],
            pickup_location=data["pickup_location"],
            dropoff_location=data["dropoff_location"],
            current_cycle_used=data["current_cycle_used"],
        )
    except TripPlanningError as e:
        logger.error(f"Trip planning failed: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        logger.exception(f"Unexpected error during trip planning: {e}")
        return Response(
            {"error": "An unexpected error occurred. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    result = TripSerializer(trip).data
    return Response(result, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def get_trip(request, trip_id):
    """Retrieve a planned trip by ID with all stops and daily logs."""
    try:
        trip = Trip.objects.get(id=trip_id)
    except Trip.DoesNotExist:
        return Response(
            {"error": "Trip not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = TripSerializer(trip)
    return Response(serializer.data)


@api_view(["GET"])
def list_trips(request):
    """List the 20 most recent planned trips."""
    trips = Trip.objects.all()[:20]
    serializer = TripSerializer(trips, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def geocode(request):
    """
    Geocode a location string to coordinates.
    Used by the frontend autocomplete.

    Query params:
        ?q=Chicago, IL
    """
    query = request.query_params.get("q", "").strip()
    if not query or len(query) < 2:
        return Response(
            {"results": []},
            status=status.HTTP_200_OK,
        )

    try:
        results = geocode_location(query, limit=5)
    except GeocodingError as e:
        logger.error(f"Geocoding failed: {e}")
        return Response(
            {"error": str(e), "results": []},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({"results": results})
