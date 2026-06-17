"""
Django Admin configuration for TruckLog ELD models.
"""

from django.contrib import admin
from .models import Trip, TripStop, DailyLog, DutyStatusEntry


class TripStopInline(admin.TabularInline):
    model = TripStop
    extra = 0
    readonly_fields = ("sequence",)
    ordering = ("sequence",)


class DailyLogInline(admin.TabularInline):
    model = DailyLog
    extra = 0
    readonly_fields = ("day_number",)
    ordering = ("day_number",)


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "current_location",
        "pickup_location",
        "dropoff_location",
        "total_distance",
        "total_days",
        "created_at",
    )
    list_filter = ("created_at",)
    search_fields = (
        "current_location",
        "pickup_location",
        "dropoff_location",
    )
    readonly_fields = (
        "total_distance",
        "total_duration",
        "total_driving_hours",
        "total_days",
        "route_geometry",
        "created_at",
    )
    inlines = [TripStopInline, DailyLogInline]


@admin.register(TripStop)
class TripStopAdmin(admin.ModelAdmin):
    list_display = (
        "trip",
        "sequence",
        "stop_type",
        "location_name",
        "arrival_time",
        "duration_hours",
    )
    list_filter = ("stop_type",)


class DutyStatusEntryInline(admin.TabularInline):
    model = DutyStatusEntry
    extra = 0
    ordering = ("start_time",)


@admin.register(DailyLog)
class DailyLogAdmin(admin.ModelAdmin):
    list_display = (
        "trip",
        "day_number",
        "date",
        "total_miles_driving",
        "total_hours_driving",
    )
    inlines = [DutyStatusEntryInline]


@admin.register(DutyStatusEntry)
class DutyStatusEntryAdmin(admin.ModelAdmin):
    list_display = (
        "daily_log",
        "status",
        "start_time",
        "end_time",
        "location",
    )
    list_filter = ("status",)
