"""
Data models for TruckLog ELD.

Models:
  - Trip: A planned trip with origin, pickup, dropoff, and cycle info
  - TripStop: Individual stops along the route (fuel, rest, break, pickup, dropoff)
  - DailyLog: One day's worth of ELD data
  - DutyStatusEntry: A single duty status period within a day
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Trip(models.Model):
    """
    Represents a planned trip from current location through pickup to dropoff.
    Stores both the input parameters and the computed results.
    """

    # --- Input fields ---
    current_location = models.CharField(
        max_length=255,
        help_text="Driver's current location (address or city, state)"
    )
    current_lat = models.FloatField(help_text="Current location latitude")
    current_lng = models.FloatField(help_text="Current location longitude")

    pickup_location = models.CharField(
        max_length=255,
        help_text="Cargo pickup location"
    )
    pickup_lat = models.FloatField(help_text="Pickup latitude")
    pickup_lng = models.FloatField(help_text="Pickup longitude")

    dropoff_location = models.CharField(
        max_length=255,
        help_text="Cargo dropoff location"
    )
    dropoff_lat = models.FloatField(help_text="Dropoff latitude")
    dropoff_lng = models.FloatField(help_text="Dropoff longitude")

    current_cycle_used = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(70)],
        help_text="Hours already used in the 70-hr/8-day cycle"
    )

    # --- Computed result fields ---
    total_distance = models.FloatField(
        null=True,
        blank=True,
        help_text="Total trip distance in miles"
    )
    total_duration = models.FloatField(
        null=True,
        blank=True,
        help_text="Total estimated trip duration in hours (including stops)"
    )
    total_driving_hours = models.FloatField(
        null=True,
        blank=True,
        help_text="Total driving time in hours"
    )
    total_days = models.IntegerField(
        null=True,
        blank=True,
        help_text="Number of days the trip spans"
    )

    # --- Route geometry ---
    route_geometry = models.JSONField(
        null=True,
        blank=True,
        help_text="Encoded route polyline coordinates for map rendering"
    )

    # --- Metadata ---
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Trip"
        verbose_name_plural = "Trips"

    def __str__(self):
        return (
            f"Trip: {self.current_location} → {self.pickup_location} → "
            f"{self.dropoff_location} ({self.created_at:%Y-%m-%d %H:%M})"
        )


class TripStop(models.Model):
    """
    A stop along the trip route — fuel, rest, break, pickup, or dropoff.
    Ordered by sequence number within a trip.
    """

    STOP_TYPE_CHOICES = [
        ("start", "Start Location"),
        ("pickup", "Pickup"),
        ("dropoff", "Dropoff"),
        ("fuel", "Fuel Stop"),
        ("rest", "Rest Stop (10-hr off-duty)"),
        ("break", "30-Min Break"),
    ]

    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name="stops"
    )
    stop_type = models.CharField(max_length=20, choices=STOP_TYPE_CHOICES)
    location_name = models.CharField(
        max_length=255,
        help_text="City, State or descriptive name of the stop location"
    )
    lat = models.FloatField()
    lng = models.FloatField()
    arrival_time = models.DateTimeField(
        help_text="When the driver arrives at this stop"
    )
    departure_time = models.DateTimeField(
        help_text="When the driver departs from this stop"
    )
    duration_hours = models.FloatField(
        help_text="Duration of the stop in hours"
    )
    sequence = models.IntegerField(
        help_text="Order of this stop in the trip (0-based)"
    )
    cumulative_miles = models.FloatField(
        default=0,
        help_text="Cumulative miles driven up to this stop"
    )

    class Meta:
        ordering = ["trip", "sequence"]
        verbose_name = "Trip Stop"
        verbose_name_plural = "Trip Stops"

    def __str__(self):
        return f"Stop #{self.sequence}: {self.get_stop_type_display()} @ {self.location_name}"


class DailyLog(models.Model):
    """
    One day's ELD daily log sheet data.
    A multi-day trip generates multiple DailyLog records.
    """

    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name="daily_logs"
    )
    date = models.DateField(help_text="The calendar date for this log")
    day_number = models.IntegerField(
        help_text="Day number within the trip (1-based)"
    )
    total_miles_driving = models.FloatField(
        default=0,
        help_text="Miles driven on this day"
    )
    total_hours_driving = models.FloatField(
        default=0,
        help_text="Hours spent driving on this day"
    )
    total_hours_on_duty = models.FloatField(
        default=0,
        help_text="Hours spent on-duty (not driving) on this day"
    )
    total_hours_off_duty = models.FloatField(
        default=0,
        help_text="Hours spent off-duty on this day"
    )
    total_hours_sleeper = models.FloatField(
        default=0,
        help_text="Hours spent in sleeper berth on this day"
    )

    # Log sheet header info
    from_location = models.CharField(
        max_length=255,
        blank=True,
        help_text="Starting location for this day"
    )
    to_location = models.CharField(
        max_length=255,
        blank=True,
        help_text="Ending location for this day"
    )

    # HOS recap tracking
    cycle_hours_available = models.FloatField(
        default=70,
        help_text="Hours available in the 70-hr/8-day cycle at start of day"
    )

    class Meta:
        ordering = ["trip", "day_number"]
        verbose_name = "Daily Log"
        verbose_name_plural = "Daily Logs"

    def __str__(self):
        return f"Day {self.day_number} Log ({self.date}) — {self.total_miles_driving:.0f} mi"


class DutyStatusEntry(models.Model):
    """
    A single duty status period within a daily log.
    These are the horizontal line segments drawn on the ELD grid.
    """

    STATUS_CHOICES = [
        ("off_duty", "Off Duty"),
        ("sleeper", "Sleeper Berth"),
        ("driving", "Driving"),
        ("on_duty", "On Duty (Not Driving)"),
    ]

    daily_log = models.ForeignKey(
        DailyLog,
        on_delete=models.CASCADE,
        related_name="entries"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    start_time = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(24)],
        help_text="Start hour of this status (0.0 = midnight, 12.0 = noon)"
    )
    end_time = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(24)],
        help_text="End hour of this status"
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        help_text="Location where this status change occurred"
    )
    remarks = models.CharField(
        max_length=255,
        blank=True,
        help_text="Remarks for this duty period (e.g., 'Pre-trip inspection')"
    )

    class Meta:
        ordering = ["daily_log", "start_time"]
        verbose_name = "Duty Status Entry"
        verbose_name_plural = "Duty Status Entries"

    def __str__(self):
        return (
            f"{self.get_status_display()}: "
            f"{self.start_time:.2f}–{self.end_time:.2f}"
        )

    @property
    def duration_hours(self):
        """Duration of this status period in hours."""
        return self.end_time - self.start_time
