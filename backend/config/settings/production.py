"""
Production-specific Django settings.
Extends base settings with production security and database config.
"""

import os
import dj_database_url
from .base import *  # noqa: F401, F403

DEBUG = False

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").lower() in ("true", "1")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Database — use DATABASE_URL from environment (e.g., Render PostgreSQL)
if os.getenv("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.config(
            default=os.getenv("DATABASE_URL"),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }

# Static files
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
