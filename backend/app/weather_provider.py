"""
backend/app/weather_provider.py
===============================
Weather Provider Interface and Concrete Implementations for SIH 2026.
Fetches authentic meteorological observations and multi-day numerical weather
predictions for Meghalaya / Northeast India using Open-Meteo API.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
import json
import logging
from typing import Dict, Any, Optional
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

# WMO Weather Interpretation Codes (WW) mapping to human-readable descriptions
WMO_CODE_MAP = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    62: "Moderate rain",
    63: "Heavy rain",
    65: "Very heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm (slight/moderate)",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}


class WeatherProviderInterface(ABC):
    """Abstract Base Class defining the contract for all weather providers."""

    @abstractmethod
    def get_provider_name(self) -> str:
        """Returns the canonical name of the weather provider."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Checks connection health and availability of the provider."""
        pass

    @abstractmethod
    def get_weather_and_forecast(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Retrieves current conditions, past 30 days antecedent precipitation,
        and up to 7-day numerical weather predictions.
        """
        pass


class OpenMeteoWeatherProvider(WeatherProviderInterface):
    """
    Open-Meteo Weather Provider for Meghalaya & Northeast India.
    No API key required; utilizes open scientific meteorological data (ECMWF, GFS, DWD).
    """

    def __init__(self, timeout_seconds: float = 8.0):
        self.provider_name = "Open-Meteo"
        self.base_url = "https://api.open-meteo.com/v1/forecast"
        self.timeout_seconds = timeout_seconds

    def get_provider_name(self) -> str:
        return self.provider_name

    def get_status(self) -> Dict[str, Any]:
        """Verifies Open-Meteo availability via a lightweight health query."""
        try:
            # Query Shillong coordinates (25.5788, 91.8933)
            test_url = (
                f"{self.base_url}?latitude=25.5788&longitude=91.8933"
                f"&current=temperature_2m,precipitation&forecast_days=1"
            )
            req = urllib.request.Request(
                test_url,
                headers={"User-Agent": "GEOALERT-SIH-2026/1.0 (Disaster-Risk-Platform)"}
            )
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as response:
                if response.status == 200:
                    return {
                        "provider_name": self.provider_name,
                        "status": "HEALTHY",
                        "is_live": True,
                        "message": "Connected to Open-Meteo Global NWP & Reanalysis API",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                else:
                    return {
                        "provider_name": self.provider_name,
                        "status": "DEGRADED",
                        "is_live": False,
                        "message": f"Unexpected HTTP response: {response.status}",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
        except Exception as err:
            logger.warning(f"Open-Meteo status check failed: {err}")
            return {
                "provider_name": self.provider_name,
                "status": "UNREACHABLE",
                "is_live": False,
                "message": f"Connection error: {str(err)}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

    def get_weather_and_forecast(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Fetches:
        - Current conditions: temperature, humidity, precipitation, weather_code
        - Daily historical series: past 31 days precipitation_sum
        - Daily forecast series: next 7 days precipitation_sum, max/min temps, weather_code
        """
        url = (
            f"{self.base_url}?latitude={latitude:.4f}&longitude={longitude:.4f}"
            f"&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
            f"&hourly=precipitation,weather_code,temperature_2m,wind_speed_10m"
            f"&daily=precipitation_sum,weather_code,temperature_2m_max,temperature_2m_min"
            f"&past_days=31&forecast_days=8&timezone=auto"
        )
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "GEOALERT-SIH-2026/1.0 (Disaster-Risk-Platform)"}
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            current_raw = data.get("current", {})
            hourly_raw = data.get("hourly", {})
            daily_raw = data.get("daily", {})

            # Daily series parsing
            time_series = daily_raw.get("time", [])
            precip_series = daily_raw.get("precipitation_sum", [])
            code_series = daily_raw.get("weather_code", [])
            temp_max_series = daily_raw.get("temperature_2m_max", [])
            temp_min_series = daily_raw.get("temperature_2m_min", [])

            # Hourly series for short-term intervals (next 6h, 12h, 24h)
            h_times = hourly_raw.get("time", [])
            h_precip = hourly_raw.get("precipitation", [])
            curr_time_str = current_raw.get("time", "")

            # Find starting index in hourly series matching current hour
            h_start = 0
            if curr_time_str and curr_time_str in h_times:
                h_start = h_times.index(curr_time_str)
            elif h_times:
                # Approximate start index based on past 31 days (31 * 24 hours = 744 hours)
                h_start = min(len(h_times) - 24, max(0, 31 * 24))

            # Compute interval precipitation accumulation
            next_6h_precip = float(sum(h_precip[h_start : h_start + 6])) if h_precip else 0.0
            next_12h_precip = float(sum(h_precip[h_start : h_start + 12])) if h_precip else 0.0
            next_24h_precip = float(sum(h_precip[h_start : h_start + 24])) if h_precip else 0.0

            # Daily multi-day forecast intervals
            # Forecast days are the last 7 items in daily precipitation
            f_slice = precip_series[-7:] if len(precip_series) >= 7 else precip_series
            next_3d_precip = float(sum(f_slice[:3])) if f_slice else 0.0
            next_7d_precip = float(sum(f_slice[:7])) if f_slice else 0.0

            # Current condition description
            wcode = current_raw.get("weather_code", 0)
            current_desc = WMO_CODE_MAP.get(wcode, "Variable precipitation")
            fetch_iso = datetime.now(timezone.utc).isoformat()

            return {
                "latitude": latitude,
                "longitude": longitude,
                "elevation_m": data.get("elevation", 0.0),
                "timezone": data.get("timezone", "UTC"),
                "provider": self.provider_name,
                "data_mode": "LIVE",
                "is_live": True,
                "source_timestamp": current_raw.get("time", fetch_iso),
                "retrieved_at": fetch_iso,
                "data_quality": "HIGH_CONFIDENCE",
                "feature_completeness": "FEATURE_DATA_COMPLETE",
                "location": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "elevation_m": data.get("elevation", 0.0),
                    "timezone": data.get("timezone", "UTC")
                },
                "current": {
                    "temperature_2m_c": current_raw.get("temperature_2m", 20.0),
                    "relative_humidity_2m_pct": current_raw.get("relative_humidity_2m", 80.0),
                    "precipitation_mm": current_raw.get("precipitation", 0.0),
                    "wind_speed_10m_kmh": current_raw.get("wind_speed_10m", 12.0),
                    "weather_code": wcode,
                    "weather_description": current_desc,
                    "time": current_raw.get("time", fetch_iso)
                },
                "intervals": {
                    "now_mm": round(float(current_raw.get("precipitation", 0.0)), 2),
                    "next_6h_mm": round(next_6h_precip, 2),
                    "next_12h_mm": round(next_12h_precip, 2),
                    "next_24h_mm": round(next_24h_precip, 2),
                    "next_3d_mm": round(next_3d_precip, 2),
                    "next_7d_mm": round(next_7d_precip, 2)
                },
                "daily": {
                    "time": time_series,
                    "precipitation_sum": precip_series,
                    "weather_code": code_series,
                    "weather_descriptions": [WMO_CODE_MAP.get(c, "Variable") for c in code_series],
                    "temperature_2m_max": temp_max_series,
                    "temperature_2m_min": temp_min_series
                }
            }
        except Exception as exc:
            logger.error(f"Open-Meteo data fetch error for ({latitude}, {longitude}): {exc}")
            raise RuntimeError(f"Open-Meteo query failed: {str(exc)}") from exc

