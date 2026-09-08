"""
backend/app/weather_feature_engine.py
=====================================
Meteorological Feature Extraction Engine for Model B Dynamic Trigger Hazard.
Implements the exact CHIRPS antecedent precipitation formulas verified from
Section 20-30 training pipeline (src/extract_chirps_rainfall.py).
"""

import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# IMD standard rainfall threshold for a "rainy day"
RAINY_DAY_THRESHOLD_MM = 2.5


class WeatherFeatureEngine:
    """
    Transforms daily precipitation series into Model B's 10 dynamic CHIRPS features.
    Computes both current state (Day 0) and projected future states (Day +1 to Day +7).
    """

    @staticmethod
    def compute_10_features(thirty_day_series: List[float]) -> Dict[str, Any]:
        """
        Computes the exact 10 CHIRPS dynamic rainfall features from a 30-day series
        where index 29 represents target day T.

        Features:
        1. rainfall_event_day: target day T rainfall (mm)
        2. ari_3: 3-day cumulative rainfall sum (mm) [days 27..29]
        3. ari_7: 7-day cumulative rainfall sum (mm) [days 23..29]
        4. ari_15: 15-day cumulative rainfall sum (mm) [days 15..29]
        5. ari_30: 30-day cumulative rainfall sum (mm) [days 0..29]
        6. max_1day_7d: maximum single-day rainfall in past 7 days (mm)
        7. max_3day_30d: maximum 3-day consecutive rolling rainfall in past 30 days (mm)
        8. rainy_days_7d: count of days with precip >= 2.5 mm in past 7 days
        9. rainy_days_15d: count of days with precip >= 2.5 mm in past 15 days
        10. rainy_days_30d: count of days with precip >= 2.5 mm in past 30 days
        """
        # Ensure length is at least 30, padding with leading zeroes if necessary
        series = [float(p) if p is not None else 0.0 for p in thirty_day_series]
        if len(series) < 30:
            series = [0.0] * (30 - len(series)) + series
        elif len(series) > 30:
            series = series[-30:]

        event_day = float(series[29])
        ari_3 = float(sum(series[27:30]))
        ari_7 = float(sum(series[23:30]))
        ari_15 = float(sum(series[15:30]))
        ari_30 = float(sum(series[0:30]))

        max_1day_7d = float(max(series[23:30])) if series[23:30] else 0.0

        # max_3day_30d: max sum of 3 consecutive days across the 30-day window (28 rolling windows)
        max_3day_30d = float(max(sum(series[k:k+3]) for k in range(28)))

        rainy_days_7d = int(sum(1 for p in series[23:30] if p >= RAINY_DAY_THRESHOLD_MM))
        rainy_days_15d = int(sum(1 for p in series[15:30] if p >= RAINY_DAY_THRESHOLD_MM))
        rainy_days_30d = int(sum(1 for p in series[0:30] if p >= RAINY_DAY_THRESHOLD_MM))

        return {
            "rainfall_event_day": round(event_day, 2),
            "ari_3": round(ari_3, 2),
            "ari_7": round(ari_7, 2),
            "ari_15": round(ari_15, 2),
            "ari_30": round(ari_30, 2),
            "max_1day_7d": round(max_1day_7d, 2),
            "max_3day_30d": round(max_3day_30d, 2),
            "rainy_days_7d": rainy_days_7d,
            "rainy_days_15d": rainy_days_15d,
            "rainy_days_30d": rainy_days_30d
        }

    @classmethod
    def extract_current_and_forecast_features(
        cls,
        daily_times: List[str],
        daily_precipitation: List[float],
        forecast_days: int = 7
    ) -> Dict[str, Any]:
        """
        Takes raw daily time series from Open-Meteo (typically 31 past days + today + 7 forecast days = 39 days).
        Finds the today boundary, and calculates:
        1. Current 10-feature vector for Today.
        2. Projected 10-feature vectors for each day from Day +1 to Day +7 using a rolling window.
        """
        clean_precip = [float(p) if (p is not None and p >= 0.0) else 0.0 for p in daily_precipitation]
        n_points = len(clean_precip)

        if n_points < 31:
            raise ValueError(f"Insufficient daily series length: got {n_points}, need >= 31 days.")

        # If Open-Meteo returned past_days=31 + today + 7 forecast = 39 points:
        # Today is at index 31 (0-indexed: 0..30 are past days, 31 is today, 32..38 are forecast days).
        # We can also detect today using forecast_days: index_today = n_points - forecast_days - 1
        index_today = max(30, n_points - forecast_days - 1)
        today_date = daily_times[index_today] if index_today < len(daily_times) else "Today"

        # Today's 30-day window: slice [index_today - 29 : index_today + 1] -> exactly 30 days
        start_idx = max(0, index_today - 29)
        today_window = clean_precip[start_idx : index_today + 1]
        current_features = cls.compute_10_features(today_window)

        # Forecast days (+1 to +forecast_days)
        forecast_features_list = []
        for offset in range(1, forecast_days + 1):
            target_idx = index_today + offset
            if target_idx >= n_points:
                break

            target_date = daily_times[target_idx] if target_idx < len(daily_times) else f"+{offset}d"
            day_rain = clean_precip[target_idx]

            # Rolling 30-day window ending at target_idx
            w_start = max(0, target_idx - 29)
            rolling_window = clean_precip[w_start : target_idx + 1]
            feats = cls.compute_10_features(rolling_window)

            forecast_features_list.append({
                "day_offset": offset,
                "date": target_date,
                "forecast_rain_mm": round(day_rain, 2),
                "features": feats
            })

        return {
            "today_date": today_date,
            "current_features": current_features,
            "forecast_timeline": forecast_features_list
        }


weather_feature_engine = WeatherFeatureEngine()
