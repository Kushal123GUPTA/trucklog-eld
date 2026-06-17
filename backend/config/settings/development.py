"""
Development-specific Django settings.
Extends base settings with development conveniences.
"""

from .base import *  # noqa: F401, F403

DEBUG = True

# Add browsable API renderer in development for easy debugging
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]

# Allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True
