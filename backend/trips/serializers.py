"""
DRF Serializers for TruckLog ELD.

Nested serialization: Trip → TripStops + DailyLogs → DutyStatusEntries.
"""

from rest_framework import serializers
from .models import Trip, TripStop, DailyLog, DutyStatusEntry


class DutyStatusEntrySerializer(serializers.ModelSerializer):
    """Serializes a single duty status line segment for the ELD grid."""

    duration_hours = serializers.ReadOnlyField()

    class Meta:
        model = DutyStatusEntry
        fields = [
            "id",
            "status",
            "start_time",
            "end_time",
            "duration_hours",
            "location",
            "remarks",
        ]


class DailyLogSerializer(serializers.ModelSerializer):
    """Serializes one day's ELD log with all duty status entries."""

    entries = DutyStatusEntrySerializer(many=True, read_only=True)

    class Meta:
        model = DailyLog
        fields = [
            "id",
            "date",
            "day_number",
            "total_miles_driving",
            "total_hours_driving",
            "total_hours_on_duty",
            "total_hours_off_duty",
            "total_hours_sleeper",
            "from_location",
            "to_location",
            "cycle_hours_available",
            "entries",
        ]


class TripStopSerializer(serializers.ModelSerializer):
    """Serializes a single stop along the route."""

    stop_type_display = serializers.CharField(
        source="get_stop_type_display",
        read_only=True
    )

    class Meta:
        model = TripStop
        fields = [
            "id",
            "stop_type",
            "stop_type_display",
            "location_name",
            "lat",
            "lng",
            "arrival_time",
            "departure_time",
            "duration_hours",
            "sequence",
            "cumulative_miles",
        ]


class TripSerializer(serializers.ModelSerializer):
    """
    Full trip serializer — includes nested stops and daily logs.
    Used for the GET /api/trips/{id}/ response.
    """

    stops = TripStopSerializer(many=True, read_only=True)
    daily_logs = DailyLogSerializer(many=True, read_only=True)

    class Meta:
        model = Trip
        fields = [
            "id",
            "current_location",
            "current_lat",
            "current_lng",
            "pickup_location",
            "pickup_lat",
            "pickup_lng",
            "dropoff_location",
            "dropoff_lat",
            "dropoff_lng",
            "current_cycle_used",
            "total_distance",
            "total_duration",
            "total_driving_hours",
            "total_days",
            "route_geometry",
            "stops",
            "daily_logs",
            "created_at",
        ]
        read_only_fields = [
            "total_distance",
            "total_duration",
            "total_driving_hours",
            "total_days",
            "route_geometry",
            "created_at",
        ]


class TripInputSerializer(serializers.Serializer):
    """
    Validates the trip planning input (used for POST /api/trips/plan/).
    Only requires location names and cycle hours — geocoding happens server-side.
    """

    current_location = serializers.CharField(max_length=255)
    pickup_location = serializers.CharField(max_length=255)
    dropoff_location = serializers.CharField(max_length=255)
    current_cycle_used = serializers.FloatField(
        min_value=0,
        max_value=70,
        help_text="Hours already used in 70-hr/8-day cycle"
    )
