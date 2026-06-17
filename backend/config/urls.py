"""
URL configuration for TruckLog ELD project.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def api_root(request):
    """API root endpoint — health check & info."""
    return JsonResponse({
        "status": "ok",
        "app": "TruckLog ELD",
        "version": "1.0.0",
        "endpoints": {
            "trips": "/api/trips/",
            "geocode": "/api/geocode/",
            "admin": "/admin/",
        }
    })


urlpatterns = [
    path("", api_root, name="api-root"),
    path("admin/", admin.site.urls),
    path("api/", include("trips.urls")),
]
