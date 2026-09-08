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
            f"&hourly=precipitation,rain,weather_code,temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure"
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

            # Hourly series for short-term intervals (next 6h, 12h, 24h) and 24h past/future
            h_times = hourly_raw.get("time", [])
            h_precip = hourly_raw.get("precipitation", [])
            h_rain = hourly_raw.get("rain", h_precip)
            h_codes = hourly_raw.get("weather_code", [])
            h_temps = hourly_raw.get("temperature_2m", [])
            h_rhs = hourly_raw.get("relative_humidity_2m", [])
            h_winds = hourly_raw.get("wind_speed_10m", [])
            h_wdirs = hourly_raw.get("wind_direction_10m", [])
            h_press = hourly_raw.get("surface_pressure", [])
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

            # Past 24h analysis [h_start - 24 : h_start]
            p_start = max(0, h_start - 24)
            p_slice_precip = h_precip[p_start:h_start] if h_precip else []
            p_slice_temp = h_temps[p_start:h_start] if h_temps else []
            p_slice_rh = h_rhs[p_start:h_start] if h_rhs else []
            p_slice_wind = h_winds[p_start:h_start] if h_winds else []

            past_24h_rain_total = float(sum(p_slice_precip)) if p_slice_precip else 0.0
            past_24h_peak_hourly = float(max(p_slice_precip)) if p_slice_precip else 0.0
            past_24h_rainy_hours = sum(1 for p in p_slice_precip if p >= 0.1)
            past_24h_temp_min = float(min(p_slice_temp)) if p_slice_temp else 18.0
            past_24h_temp_max = float(max(p_slice_temp)) if p_slice_temp else 24.0
            past_24h_rh_avg = float(sum(p_slice_rh) / len(p_slice_rh)) if p_slice_rh else 80.0
            past_24h_rh_max = float(max(p_slice_rh)) if p_slice_rh else 85.0
            past_24h_wind_max = float(max(p_slice_wind)) if p_slice_wind else 10.0

            past_24h_hourly = []
            for idx in range(p_start, h_start):
                w_code = int(h_codes[idx]) if idx < len(h_codes) else 0
                past_24h_hourly.append({
                    "time": h_times[idx] if idx < len(h_times) else "",
                    "precipitation_mm": round(float(h_precip[idx]), 2) if idx < len(h_precip) else 0.0,
                    "rain_mm": round(float(h_rain[idx]), 2) if idx < len(h_rain) else 0.0,
                    "temperature_c": round(float(h_temps[idx]), 1) if idx < len(h_temps) else 20.0,
                    "relative_humidity_pct": round(float(h_rhs[idx]), 1) if idx < len(h_rhs) else 80.0,
                    "wind_speed_kmh": round(float(h_winds[idx]), 1) if idx < len(h_winds) else 10.0,
                    "wind_direction_deg": round(float(h_wdirs[idx]), 1) if idx < len(h_wdirs) and h_wdirs[idx] is not None else 0.0,
                    "surface_pressure_hpa": round(float(h_press[idx]), 1) if idx < len(h_press) and h_press[idx] is not None else 1013.0,
                    "weather_code": w_code,
                    "weather_description": WMO_CODE_MAP.get(w_code, "Variable")
                })

            # Next 24h forecast analysis [h_start : h_start + 24]
            f_end = min(len(h_times), h_start + 24)
            f_slice_precip = h_precip[h_start:f_end] if h_precip else []
            forecast_24h_rain_total = float(sum(f_slice_precip)) if f_slice_precip else 0.0
            forecast_24h_peak_hourly = float(max(f_slice_precip)) if f_slice_precip else 0.0

            forecast_24h_hourly = []
            for idx in range(h_start, f_end):
                w_code = int(h_codes[idx]) if idx < len(h_codes) else 0
                forecast_24h_hourly.append({
                    "time": h_times[idx] if idx < len(h_times) else "",
                    "precipitation_mm": round(float(h_precip[idx]), 2) if idx < len(h_precip) else 0.0,
                    "rain_mm": round(float(h_rain[idx]), 2) if idx < len(h_rain) else 0.0,
                    "temperature_c": round(float(h_temps[idx]), 1) if idx < len(h_temps) else 20.0,
                    "relative_humidity_pct": round(float(h_rhs[idx]), 1) if idx < len(h_rhs) else 80.0,
                    "wind_speed_kmh": round(float(h_winds[idx]), 1) if idx < len(h_winds) else 10.0,
                    "wind_direction_deg": round(float(h_wdirs[idx]), 1) if idx < len(h_wdirs) and h_wdirs[idx] is not None else 0.0,
                    "surface_pressure_hpa": round(float(h_press[idx]), 1) if idx < len(h_press) and h_press[idx] is not None else 1013.0,
                    "weather_code": w_code,
                    "weather_description": WMO_CODE_MAP.get(w_code, "Variable")
                })

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
                "past_24h": {
                    "total_rainfall_mm": round(past_24h_rain_total, 2),
                    "peak_hourly_rainfall_mm": round(past_24h_peak_hourly, 2),
                    "rainy_hours_count": past_24h_rainy_hours,
                    "temp_min_c": round(past_24h_temp_min, 1),
                    "temp_max_c": round(past_24h_temp_max, 1),
                    "relative_humidity_avg_pct": round(past_24h_rh_avg, 1),
                    "relative_humidity_max_pct": round(past_24h_rh_max, 1),
                    "wind_speed_max_kmh": round(past_24h_wind_max, 1),
                    "hourly": past_24h_hourly
                },
                "forecast_24h": {
                    "total_rainfall_mm": round(forecast_24h_rain_total, 2),
                    "peak_hourly_rainfall_mm": round(forecast_24h_peak_hourly, 2),
                    "hourly": forecast_24h_hourly
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

