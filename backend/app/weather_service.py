"""
backend/app/weather_service.py
==============================
High-Level Weather Intelligence & Forecast Risk Service for SIH 2026.
Integrates Open-Meteo Provider, In-Memory TTL Cache, CHIRPS Feature Engine,
and Frozen Model B Inference Pipeline.
"""

from datetime import datetime, timezone
import math
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd

from backend.app.config import CSV_SURFACE_PATH
from backend.app.model_service import model_service
from backend.app.risk_engine import risk_engine
from backend.app.weather_provider import OpenMeteoWeatherProvider, WeatherProviderInterface
from backend.app.weather_cache import weather_cache, WeatherCache
from backend.app.weather_feature_engine import weather_feature_engine, WeatherFeatureEngine
from backend.app.schemas import (
    AlertTierEnum,
    DynamicFeaturesInput,
    CurrentWeatherCondition,
    DailyWeatherPoint,
    WeatherStatusResponse,
    WeatherCurrentResponse,
    WeatherForecastResponse,
    WeatherHistoryResponse,
    RiskForecastPoint,
    RiskForecastResponse,
    ExplainabilityBreakdown
)

logger = logging.getLogger(__name__)


class WeatherService:
    """
    Central orchestration service for real-time weather ingestion,
    caching, dynamic feature derivation, and 7-day forward risk forecasting.
    """

    def __init__(
        self,
        provider: Optional[WeatherProviderInterface] = None,
        cache: Optional[WeatherCache] = None,
        feature_engine: Optional[WeatherFeatureEngine] = None
    ):
        self.provider = provider or OpenMeteoWeatherProvider()
        self.cache = cache or weather_cache
        self.feature_engine = feature_engine or weather_feature_engine
        self._cached_grid_df: Optional[pd.DataFrame] = None

    def get_grid_df(self) -> pd.DataFrame:
        """Loads and caches the Section 34 regional CSV surface for spatial lookups."""
        if self._cached_grid_df is None:
            if not CSV_SURFACE_PATH.exists():
                raise FileNotFoundError(f"Section 34 CSV not found at {CSV_SURFACE_PATH}")
            self._cached_grid_df = pd.read_csv(CSV_SURFACE_PATH)
        return self._cached_grid_df

    def lookup_cell_terrain(
        self,
        latitude: float,
        longitude: float,
        cell_id: Optional[str] = None,
        p_s: Optional[float] = None
    ) -> Tuple[Optional[str], float, float, str]:
        """
        Resolves static terrain susceptibility P(S), slope, and cell identifier.
        Returns: (cell_id, p_s, slope_deg, location_label)
        """
        df = self.get_grid_df()

        # 1. Direct cell_id match
        if cell_id:
            match = df[df["grid_cell_id"] == cell_id]
            if not match.empty:
                row = match.iloc[0]
                return (
                    str(row["grid_cell_id"]),
                    float(row["static_susceptibility_P_S"]),
                    float(row["slope_deg"]),
                    f"{row['spatial_block_name']} (Cell {cell_id})"
                )

        # 2. If P(S) is given directly without cell_id
        if p_s is not None:
            return (None, float(p_s), 25.0, f"Custom Location ({latitude:.4f}, {longitude:.4f})")

        # 3. Spatial nearest-cell Haversine lookup
        lat_rad = math.radians(latitude)
        lon_rad = math.radians(longitude)
        df_lat_rad = np.radians(df["latitude"].values)
        df_lon_rad = np.radians(df["longitude"].values)

        dlat = df_lat_rad - lat_rad
        dlon = df_lon_rad - lon_rad
        a = np.sin(dlat / 2.0)**2 + np.cos(lat_rad) * np.cos(df_lat_rad) * np.sin(dlon / 2.0)**2
        c = 2.0 * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))
        dist_km = 6371.0 * c

        min_idx = int(np.argmin(dist_km))
        nearest_row = df.iloc[min_idx]

        return (
            str(nearest_row["grid_cell_id"]),
            float(nearest_row["static_susceptibility_P_S"]),
            float(nearest_row["slope_deg"]),
            f"{nearest_row['spatial_block_name']} (~{dist_km[min_idx]:.1f}km)"
        )

    def get_status(self) -> WeatherStatusResponse:
        """
        Returns honest ingestion status regarding the live weather provider and cache state.
        """
        health = self.provider.get_status()
        is_live = health.get("is_live", False)
        status_code = health.get("status", "UNKNOWN")

        mode = "LIVE" if is_live else "DEMO_SCENARIO"
        msg = (
            f"Active live telemetry feed from {self.provider.get_provider_name()}"
            if is_live
            else f"Live weather provider unreachable ({status_code}). Operating in calibrated DEMO / SCENARIO mode."
        )

        return WeatherStatusResponse(
            mode=mode,
            is_live=is_live,
            provider_name=self.provider.get_provider_name(),
            cache_status="ACTIVE",
            status_message=msg,
            timestamp=datetime.now(timezone.utc).isoformat(),
            cache_stats=self.cache.get_stats()
        )

    def fetch_weather_data(self, latitude: float, longitude: float) -> Tuple[Dict[str, Any], str]:
        """
        Fetches full weather series (31 past days + today + 7 forecast days).
        Checks in-memory cache first; falls back to stale cache or calibrated scenario.
        Returns: (weather_dict, cache_status_string)
        """
        cached_data, cache_state = self.cache.get(latitude, longitude)
        if cache_state == "HIT_FRESH" and cached_data is not None:
            return cached_data, "CACHED_FRESH"

        # Attempt live provider query
        try:
            live_data = self.provider.get_weather_and_forecast(latitude, longitude)
            self.cache.set(latitude, longitude, live_data)
            return live_data, "LIVE"
        except Exception as exc:
            logger.warning(f"Live weather fetch failed: {exc}")
            if cached_data is not None:
                return cached_data, "STALE_CACHE"

            # Graceful deterministic fallback (calibrated Monsoon Surge baseline)
            fallback = self._generate_calibrated_fallback_data(latitude, longitude)
            return fallback, "DEMO_FALLBACK"

    def _generate_calibrated_fallback_data(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Generates realistic calibrated fallback data when external network is unavailable."""
        now = datetime.now(timezone.utc)
        time_series = [
            (now - pd.Timedelta(days=31 - i)).strftime("%Y-%m-%d") for i in range(39)
        ]
        # Realistic monsoon precipitation series with a peak around event day
        precip_series = [
            12.0, 15.0, 8.0, 20.0, 35.0, 40.0, 18.0, 22.0, 30.0, 15.0,
            18.0, 25.0, 10.0, 14.0, 28.0, 32.0, 45.0, 22.0, 18.0, 26.0,
            30.0, 15.0, 20.0, 35.0, 42.0, 18.0, 25.0, 38.0, 42.0, 48.0,
            45.0,  # Day 31 (Today)
            52.0, 60.0, 45.0, 30.0, 20.0, 15.0, 10.0  # 7 forecast days
        ]
        return {
            "latitude": latitude,
            "longitude": longitude,
            "elevation_m": 1496.0,
            "timezone": "Asia/Kolkata",
            "provider": "Calibrated Scenario (Offline Fallback)",
            "fetched_at": now.isoformat(),
            "current": {
                "temperature_2m_c": 21.5,
                "relative_humidity_2m_pct": 88.0,
                "precipitation_mm": 45.0,
                "weather_code": 63,
                "weather_description": "Heavy rain (Calibrated)",
                "time": now.isoformat()
            },
            "daily": {
                "time": time_series,
                "precipitation_sum": precip_series,
                "weather_code": [63] * len(time_series),
                "weather_descriptions": ["Moderate to heavy rain"] * len(time_series),
                "temperature_2m_max": [24.0] * len(time_series),
                "temperature_2m_min": [18.0] * len(time_series)
            }
        }

    def get_current_weather(self, latitude: float, longitude: float) -> WeatherCurrentResponse:
        """
        Retrieves current conditions, derives 10 Model B features,
        and computes the real-time dynamic trigger hazard P(D).
        """
        data, cache_status = self.fetch_weather_data(latitude, longitude)
        daily = data.get("daily", {})
        times = daily.get("time", [])
        precip = daily.get("precipitation_sum", [])

        feats_dict = self.feature_engine.extract_current_and_forecast_features(times, precip)
        current_feats = feats_dict["current_features"]
        p_d = model_service.predict_dynamic_trigger(current_feats)

        current_raw = data.get("current", {})
        curr_cond = CurrentWeatherCondition(
            temperature_c=float(current_raw.get("temperature_2m_c", 20.0)),
            relative_humidity_pct=float(current_raw.get("relative_humidity_2m_pct", 80.0)),
            precipitation_mm=float(current_raw.get("precipitation_mm", 0.0)),
            weather_code=int(current_raw.get("weather_code", 0)),
            weather_description=str(current_raw.get("weather_description", "Fair")),
            time=str(current_raw.get("time", datetime.now(timezone.utc).isoformat()))
        )

        return WeatherCurrentResponse(
            latitude=latitude,
            longitude=longitude,
            elevation_m=float(data.get("elevation_m", 0.0)),
            provider=str(data.get("provider", self.provider.get_provider_name())),
            cache_status=cache_status,
            timestamp=datetime.now(timezone.utc).isoformat(),
            current=curr_cond,
            features=DynamicFeaturesInput(**current_feats),
            dynamic_trigger_p_d=round(p_d, 4)
        )

    def get_weather_forecast(self, latitude: float, longitude: float, days: int = 7) -> WeatherForecastResponse:
        """Retrieves multi-day numerical weather predictions for the next 7 days."""
        data, cache_status = self.fetch_weather_data(latitude, longitude)
        daily = data.get("daily", {})
        times = daily.get("time", [])
        precip = daily.get("precipitation_sum", [])
        codes = daily.get("weather_code", [])
        descs = daily.get("weather_descriptions", [])
        tmax = daily.get("temperature_2m_max", [])
        tmin = daily.get("temperature_2m_min", [])

        # The forecast days correspond to the last `days` points
        n = len(times)
        start_idx = max(0, n - days)

        forecast_points = []
        for i in range(start_idx, n):
            forecast_points.append(
                DailyWeatherPoint(
                    date=times[i] if i < len(times) else f"Day {i}",
                    precipitation_sum_mm=round(float(precip[i]), 2) if i < len(precip) else 0.0,
                    weather_code=int(codes[i]) if i < len(codes) else 0,
                    weather_description=str(descs[i]) if i < len(descs) else "Clear",
                    temperature_max_c=float(tmax[i]) if (tmax and i < len(tmax)) else None,
                    temperature_min_c=float(tmin[i]) if (tmin and i < len(tmin)) else None
                )
            )

        return WeatherForecastResponse(
            latitude=latitude,
            longitude=longitude,
            elevation_m=float(data.get("elevation_m", 0.0)),
            provider=str(data.get("provider", self.provider.get_provider_name())),
            cache_status=cache_status,
            timestamp=datetime.now(timezone.utc).isoformat(),
            daily_forecast=forecast_points
        )

    def get_weather_history(self, latitude: float, longitude: float, days: int = 14) -> WeatherHistoryResponse:
        """Retrieves historical antecedent precipitation observations for the past 14 days."""
        data, cache_status = self.fetch_weather_data(latitude, longitude)
        daily = data.get("daily", {})
        times = daily.get("time", [])
        precip = daily.get("precipitation_sum", [])
        codes = daily.get("weather_code", [])
        descs = daily.get("weather_descriptions", [])
        tmax = daily.get("temperature_2m_max", [])
        tmin = daily.get("temperature_2m_min", [])

        # Today is at index n - 8 (since 7 forecast days follow)
        n = len(times)
        today_idx = max(0, n - 8)
        start_idx = max(0, today_idx - days + 1)

        history_points = []
        for i in range(start_idx, today_idx + 1):
            history_points.append(
                DailyWeatherPoint(
                    date=times[i] if i < len(times) else f"Day {i}",
                    precipitation_sum_mm=round(float(precip[i]), 2) if i < len(precip) else 0.0,
                    weather_code=int(codes[i]) if i < len(codes) else 0,
                    weather_description=str(descs[i]) if i < len(descs) else "Historical",
                    temperature_max_c=float(tmax[i]) if (tmax and i < len(tmax)) else None,
                    temperature_min_c=float(tmin[i]) if (tmin and i < len(tmin)) else None
                )
            )

        return WeatherHistoryResponse(
            latitude=latitude,
            longitude=longitude,
            elevation_m=float(data.get("elevation_m", 0.0)),
            provider=str(data.get("provider", self.provider.get_provider_name())),
            cache_status=cache_status,
            timestamp=datetime.now(timezone.utc).isoformat(),
            daily_history=history_points
        )

    def evaluate_risk_forecast(
        self,
        latitude: float,
        longitude: float,
        cell_id: Optional[str] = None,
        p_s: Optional[float] = None,
        location_name: Optional[str] = None
    ) -> RiskForecastResponse:
        """
        Evaluates the full 7-day forward risk trajectory:
        1. Resolves static terrain susceptibility P(S).
        2. Derives today's dynamic trigger P(D)_0 and current coupled risk.
        3. Computes projected dynamic features for Day +1 to Day +7.
        4. Runs Model B on each projected day to get P(D)_{t+k}.
        5. Couples P(S) * P(D)_{t+k} to produce 7-day alert tier trajectory and trend.
        """
        res_cell_id, resolved_p_s, slope, loc_label = self.lookup_cell_terrain(
            latitude, longitude, cell_id=cell_id, p_s=p_s
        )
        display_name = location_name or loc_label

        # Fetch weather time series
        data, cache_status = self.fetch_weather_data(latitude, longitude)
        daily = data.get("daily", {})
        times = daily.get("time", [])
        precip = daily.get("precipitation_sum", [])

        feats_dict = self.feature_engine.extract_current_and_forecast_features(times, precip)
        current_feats = feats_dict["current_features"]
        forecast_timeline = feats_dict["forecast_timeline"]

        # Current risk evaluation
        curr_p_d = model_service.predict_dynamic_trigger(current_feats)
        curr_risk = risk_engine.compute_coupled_risk(resolved_p_s, curr_p_d)
        curr_tier, curr_tier_name, curr_hex, curr_act = risk_engine.classify_alert_tier(
            resolved_p_s, curr_p_d, curr_risk
        )

        # Build 7-day forecast points
        timeline_points: List[RiskForecastPoint] = []
        peak_risk = curr_risk
        peak_day_str = "Today"
        peak_offset = 0
        peak_tier_name = curr_tier_name

        for item in forecast_timeline:
            offset = item["day_offset"]
            date_str = item["date"]
            f_rain = item["forecast_rain_mm"]
            day_feats = item["features"]

            # Run Model B on projected features
            day_p_d = model_service.predict_dynamic_trigger(day_feats)
            day_risk = risk_engine.compute_coupled_risk(resolved_p_s, day_p_d)
            d_tier, d_tier_name, d_hex, d_act = risk_engine.classify_alert_tier(
                resolved_p_s, day_p_d, day_risk
            )

            # Friendly day name
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                day_name = dt.strftime("%a, %b %d")
            except Exception:
                day_name = f"+{offset}d"

            summary = f"{day_name}: {f_rain:.1f}mm forecast | Risk {day_risk:.3f} ({d_tier_name})"

            if day_risk > peak_risk:
                peak_risk = day_risk
                peak_day_str = day_name
                peak_offset = offset
                peak_tier_name = d_tier_name

            timeline_points.append(
                RiskForecastPoint(
                    date=date_str,
                    day_offset=offset,
                    day_name=day_name,
                    forecast_rain_mm=f_rain,
                    dynamic_trigger_p_d=round(day_p_d, 4),
                    coupled_risk_score=round(day_risk, 4),
                    alert_tier_code=d_tier,
                    alert_tier_name=d_tier_name,
                    alert_color_hex=d_hex,
                    warning_summary=summary,
                    dynamic_features=DynamicFeaturesInput(**day_feats)
                )
            )

        # Compute overall trend
        if peak_risk >= 0.35 and curr_risk < 0.35:
            overall_trend = f"ELEVATING TO CRITICAL HAZARD: Peak Risk {peak_risk:.3f} expected on {peak_day_str} (+{peak_offset}d)."
        elif peak_risk > curr_risk + 0.05:
            overall_trend = f"ESCALATING RISK: Peak hazard {peak_risk:.3f} on {peak_day_str} (+{peak_offset}d)."
        elif peak_risk < curr_risk - 0.05:
            overall_trend = "SUBSIDING RISK: Rainfall easing; landslide hazard abating over next 7 days."
        elif peak_risk >= 0.35:
            overall_trend = "PERSISTENT CRITICAL RISK: Ground remains near maximum saturation across forecast window."
        elif peak_risk >= 0.0502:
            overall_trend = "STEADY ADVISORY: Sustained moderate soil moisture with persistent watch conditions."
        else:
            overall_trend = "STABLE BASELINE: Dry conditions; low risk across entire 7-day outlook."

        explainability = risk_engine.generate_explainability(
            resolved_p_s, curr_p_d, curr_risk, slope
        )

        return RiskForecastResponse(
            query_latitude=latitude,
            query_longitude=longitude,
            nearest_cell_id=res_cell_id,
            location_name=display_name,
            static_susceptibility_p_s=round(resolved_p_s, 4),
            current_dynamic_trigger_p_d=round(curr_p_d, 4),
            current_coupled_risk_score=round(curr_risk, 4),
            current_alert_tier_code=curr_tier,
            current_alert_tier_name=curr_tier_name,
            current_alert_color_hex=curr_hex,
            timeline=timeline_points,
            peak_day=peak_day_str,
            peak_day_offset=peak_offset,
            peak_risk_score=round(peak_risk, 4),
            peak_alert_tier=peak_tier_name,
            overall_trend=overall_trend,
            explainability=explainability,
            weather_provider=str(data.get("provider", self.provider.get_provider_name())),
            cache_status=cache_status,
            timestamp=datetime.now(timezone.utc).isoformat()
        )


weather_service = WeatherService()
