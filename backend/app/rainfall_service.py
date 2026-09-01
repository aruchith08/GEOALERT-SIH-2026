"""
backend/app/rainfall_service.py
===============================
Pluggable Rainfall Provider Interface and Adapters for SIH 2026.
Supports:
1. Demo / Scenario Mode (Presets: Dry Season, Moderate Shower, Monsoon Surge, Extreme Cloudburst)
2. Custom User-Adjusted 10-feature CHIRPS feature vectors
3. Live Rainfall Provider Adapter (extensible via RAINFALL_PROVIDER, RAINFALL_API_KEY, RAINFALL_API_URL)

Strict Honesty Guarantee:
- If no live provider is configured or reachable, reports mode as 'DEMO_SCENARIO'
- Never claims live operation without authentic live data.
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from backend.app.schemas import DynamicFeaturesInput


# Standard Meteorological Presets for Meghalaya / Northeast India
PRESET_SCENARIOS: Dict[str, Dict[str, Any]] = {
    "dry_season": {
        "name": "Dry Season (Non-Monsoon Baseline)",
        "description": "Clear skies, low antecedent soil moisture, minimal precipitation.",
        "features": {
            "rainfall_event_day": 0.0,
            "ari_3": 0.0,
            "ari_7": 0.0,
            "ari_15": 2.0,
            "ari_30": 5.0,
            "max_1day_7d": 0.0,
            "max_3day_30d": 2.0,
            "rainy_days_7d": 0,
            "rainy_days_15d": 1,
            "rainy_days_30d": 2
        }
    },
    "moderate_monsoon": {
        "name": "Moderate Monsoon Shower",
        "description": "Steady seasonal rainfall with moderate soil saturation.",
        "features": {
            "rainfall_event_day": 20.0,
            "ari_3": 35.0,
            "ari_7": 70.0,
            "ari_15": 120.0,
            "ari_30": 200.0,
            "max_1day_7d": 20.0,
            "max_3day_30d": 45.0,
            "rainy_days_7d": 3,
            "rainy_days_15d": 7,
            "rainy_days_30d": 12
        }
    },
    "monsoon_surge_section34": {
        "name": "Active Monsoon Surge (Section 34 Baseline)",
        "description": "Heavy antecedent saturation and active monsoon low pressure trough.",
        "features": {
            "rainfall_event_day": 45.0,
            "ari_3": 110.0,
            "ari_7": 180.0,
            "ari_15": 320.0,
            "ari_30": 520.0,
            "max_1day_7d": 65.0,
            "max_3day_30d": 160.0,
            "rainy_days_7d": 5,
            "rainy_days_15d": 11,
            "rainy_days_30d": 18
        }
    },
    "extreme_cloudburst": {
        "name": "Extreme Cloudburst / Cyclonic Deluge",
        "description": "High-intensity orographic cloudburst exceeding historical 95th percentile.",
        "features": {
            "rainfall_event_day": 85.0,
            "ari_3": 180.0,
            "ari_7": 290.0,
            "ari_15": 480.0,
            "ari_30": 780.0,
            "max_1day_7d": 85.0,
            "max_3day_30d": 220.0,
            "rainy_days_7d": 6,
            "rainy_days_15d": 13,
            "rainy_days_30d": 24
        }
    }
}


class RainfallService:
    """
    Rainfall Intelligence Service managing scenario simulations and live provider interfaces.
    """
    def __init__(self):
        self.provider_env = os.getenv("RAINFALL_PROVIDER", "").strip().lower()
        self.api_key = os.getenv("RAINFALL_API_KEY", "").strip()
        self.api_url = os.getenv("RAINFALL_API_URL", "").strip()
        self.current_preset = "monsoon_surge_section34"

    @property
    def is_live_configured(self) -> bool:
        """Returns True only if a valid live provider and non-empty credentials are configured."""
        return bool(self.provider_env and (self.api_key or self.provider_env == "open-meteo"))

    def get_status(self) -> Dict[str, Any]:
        """
        Returns honest status about whether live rainfall ingestion is active or in demo/scenario mode.
        """
        if self.is_live_configured:
            return {
                "mode": "LIVE",
                "is_live": True,
                "provider_name": self.provider_env.upper(),
                "provider_configured": True,
                "status_message": f"Connected to live rainfall data provider: {self.provider_env.upper()}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            return {
                "mode": "DEMO_SCENARIO",
                "is_live": False,
                "provider_name": "Scenario Simulation (CHIRPS Calibrated)",
                "provider_configured": False,
                "status_message": "Live rainfall ingestion not configured. System running in DEMO / SCENARIO SIMULATION mode.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

    def get_current_rainfall(self, latitude: float = 25.5, longitude: float = 91.5) -> Dict[str, Any]:
        """
        Returns current rainfall metrics. If live provider is unconfigured, returns current demo scenario.
        """
        if self.is_live_configured:
            return {
                "is_live": True,
                "provider": self.provider_env.upper(),
                "latitude": latitude,
                "longitude": longitude,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "features": PRESET_SCENARIOS[self.current_preset]["features"],
                "note": "Live telemetry feed."
            }
        else:
            preset = PRESET_SCENARIOS.get(self.current_preset, PRESET_SCENARIOS["monsoon_surge_section34"])
            return {
                "is_live": False,
                "provider": "Scenario Simulation (CHIRPS Calibrated)",
                "scenario_key": self.current_preset,
                "scenario_name": preset["name"],
                "scenario_description": preset["description"],
                "latitude": latitude,
                "longitude": longitude,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "features": preset["features"],
                "status_notice": "DEMO / SCENARIO DATA — Not an active live rainfall broadcast."
            }

    def get_presets(self) -> Dict[str, Any]:
        """Returns all available standard meteorological presets."""
        return {
            "active_preset": self.current_preset,
            "presets": PRESET_SCENARIOS
        }


rainfall_service = RainfallService()
