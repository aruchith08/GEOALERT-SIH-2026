"""
backend/app/config.py
=====================
Configuration, constants, frozen model paths, and cryptographic checksums
for GEOALERT Landslide Backend Risk API.
"""

import os
from pathlib import Path
from typing import List

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"
DATA_DIR = BASE_DIR / "data"

# Frozen Production Model Artifacts
MODEL_A_PATH = MODELS_DIR / "expC_random_forest.joblib"
MODEL_B_PATH = MODELS_DIR / "modelB_production_pipeline.joblib"

# Expected Cryptographic SHA-256 Checksums (FROZEN & IMMUTABLE)
EXPECTED_MODEL_A_SHA256 = "1691cd678c2a9184cf608a9db0e464daee1e9daf237fd2c387b6d936685d5631"
EXPECTED_MODEL_B_SHA256 = "e30aacc2f83eaca410a9a782089300ef1e920dd21051c042385d6159d97318f2"

# Spatial Deliverables from Section 34 (with fallback paths)
GEOJSON_SURFACE_PATH = (
    REPORTS_DIR / "phase4_section34_regional_risk_surface.geojson"
    if (REPORTS_DIR / "phase4_section34_regional_risk_surface.geojson").exists()
    else DATA_DIR / "phase4" / "section34_spatial_risk" / "phase4_section34_regional_risk_surface.geojson"
)
CSV_SURFACE_PATH = (
    REPORTS_DIR / "phase4_section34_regional_risk_surface.csv"
    if (REPORTS_DIR / "phase4_section34_regional_risk_surface.csv").exists()
    else DATA_DIR / "phase4" / "section34_spatial_risk" / "phase4_section34_regional_risk_surface.csv"
)
BLOCK_SUMMARY_PATH = (
    REPORTS_DIR / "phase4_section34_block_risk_summary.csv"
    if (REPORTS_DIR / "phase4_section34_block_risk_summary.csv").exists()
    else DATA_DIR / "phase4" / "section34_spatial_risk" / "phase4_section34_block_risk_summary.csv"
)
SECTION34_SUMMARY_PATH = (
    REPORTS_DIR / "phase4_section34_summary.json"
    if (REPORTS_DIR / "phase4_section34_summary.json").exists()
    else DATA_DIR / "phase4" / "section34_spatial_risk" / "phase4_section34_summary.json"
)

# Frozen Coupling & Alert Tier Parameters
FROZEN_COUPLING_THRESHOLD = 0.0502
STATIC_TERRAIN_SAFETY_FLOOR = 0.1500
THRESHOLD_YELLOW_ORANGE = 0.1500
THRESHOLD_ORANGE_RED = 0.3500

# Feature Definitions
STATIC_FEATURES: List[str] = [
    "elevation", "slope", "aspect", "plan_curvature", "profile_curvature",
    "twi", "spi", "ndvi_mean", "soil_clay_fraction", "soil_sand_fraction",
    "soil_bulk_density", "soil_ph", "distance_to_roads", "distance_to_streams",
    "landcover_code", "lithology_code"
]

DYNAMIC_FEATURES: List[str] = [
    "rainfall_event_day", "ari_3", "ari_7", "ari_15", "ari_30",
    "max_1day_7d", "max_3day_30d", "rainy_days_7d", "rainy_days_15d", "rainy_days_30d"
]

# API Metadata & Cloud Configuration
PROJECT_NAME = "GEOALERT — Landslide Risk Intelligence Platform"
API_VERSION = "1.0.0"
API_PREFIX = "/api/v1"

# Flexible CORS for Vercel, Render, Railway, Localhost, and custom domains
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "*").strip()
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"https?://.*"  # Default accepts all HTTPS origins (Vercel previews, Render, custom domains)
)

# ─── Real-Time Synchronization Configuration ──────────────────────────────────

# Interval (seconds) at which the WeatherSyncService refreshes regional mesh data.
# Default: 600s (10 minutes). Override via WEATHER_REFRESH_INTERVAL env var.
_refresh_raw = os.getenv("WEATHER_REFRESH_INTERVAL", "600").strip()
try:
    WEATHER_REFRESH_INTERVAL_SECONDS: int = int(_refresh_raw)
except ValueError:
    WEATHER_REFRESH_INTERVAL_SECONDS = 600

# Interval (seconds) at which the selected coordinate auto-refreshes.
# Default matches the regional refresh interval.
_coord_refresh_raw = os.getenv("COORDINATE_AUTO_REFRESH_INTERVAL", "600").strip()
try:
    COORDINATE_AUTO_REFRESH_INTERVAL_SECONDS: int = int(_coord_refresh_raw)
except ValueError:
    COORDINATE_AUTO_REFRESH_INTERVAL_SECONDS = 600

# Minutes after retrieval before CACHED_LIVE transitions to STALE.
_stale_raw = os.getenv("FRESHNESS_STALE_THRESHOLD_MINUTES", "20").strip()
try:
    FRESHNESS_STALE_THRESHOLD_MINUTES: int = int(_stale_raw)
except ValueError:
    FRESHNESS_STALE_THRESHOLD_MINUTES = 20

# Minimum absolute risk change to classify as RISING or FALLING (not STABLE).
_epsilon_raw = os.getenv("RISK_TREND_EPSILON", "0.005").strip()
try:
    RISK_TREND_EPSILON: float = float(_epsilon_raw)
except ValueError:
    RISK_TREND_EPSILON = 0.005

# Maximum risk history entries stored per coordinate (ring buffer depth).
RISK_HISTORY_MAX_ENTRIES: int = 24

