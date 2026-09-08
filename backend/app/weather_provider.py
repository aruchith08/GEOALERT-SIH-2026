"""
backend/app/weather_provider.py
===============================
Weather provider abstraction and Open-Meteo implementation.

Open-Meteo forecast API (no API key required):
  https://api.open-meteo.com/v1/forecast

Every request uses the caller's exact latitude and longitude.
Live Open-Meteo values are NOT CHIRPS. Model B feature mapping is documented
in weather_feature_engine.py.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
import json
import logging
import time
from typing import Any, Dict, List, Optional, Tuple
import urllib.error
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)

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
    99: "Thunderstorm with heavy hail",
}

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
DEFAULT_USER_AGENT = "GEOALERT-SIH-2026/1.0 (Disaster-Risk-Platform)"


def _safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _sum_window(values: List[Any], start: int, count: int) -> float:
    if not values or count <= 0:
        return 0.0
    end = min(len(values), start + count)
    start = max(0, start)
    return float(sum(_safe_float(v, 0.0) for v in values[start:end]))


class WeatherProviderError(RuntimeError):
    """Raised when a provider request fails after retries."""

    def __init__(self, message: str, http_status: Optional[int] = None, reason: str = "PROVIDER_ERROR"):
        super().__init__(message)
        self.http_status = http_status
        self.reason = reason


class WeatherProviderInterface(ABC):
    """Abstract contract for meteorological providers."""

    @abstractmethod
    def get_provider_name(self) -> str:
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_weather_and_forecast(self, latitude: float, longitude: float) -> Dict[str, Any]:
        pass


class OpenMeteoWeatherProvider(WeatherProviderInterface):
    """
    Open-Meteo Global NWP provider.

    API key: not required for the public forecast endpoint used here.
    Endpoint: GET https://api.open-meteo.com/v1/forecast
    """

    def __init__(
        self,
        timeout_seconds: float = 10.0,
        max_retries: int = 2,
        base_url: str = OPEN_METEO_FORECAST_URL,
    ):
        self.provider_name = "Open-Meteo"
        self.base_url = base_url.rstrip("?")
        self.timeout_seconds = timeout_seconds
        self.max_retries = max(1, max_retries)
        self._last_success_at: Optional[str] = None
        self._last_error: Optional[str] = None
        self._last_http_status: Optional[int] = None
        self._last_endpoint_desc: Optional[str] = None
        self._last_latency_ms: Optional[float] = None

    def get_provider_name(self) -> str:
        return self.provider_name

    def _build_forecast_url(self, latitude: float, longitude: float, lightweight: bool = False) -> str:
        params = {
            "latitude": f"{latitude:.6f}",
            "longitude": f"{longitude:.6f}",
            "timezone": "auto",
        }
        if lightweight:
            params["current"] = "temperature_2m,precipitation"
            params["forecast_days"] = "1"
        else:
            params["current"] = (
                "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
            )
            params["hourly"] = (
                "precipitation,rain,precipitation_probability,weather_code,temperature_2m,"
                "relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure"
            )
            params["daily"] = "precipitation_sum,weather_code,temperature_2m_max,temperature_2m_min"
            params["past_days"] = "31"
            params["forecast_days"] = "8"
        return f"{self.base_url}?{urllib.parse.urlencode(params)}"

    def _http_get_json(self, url: str, endpoint_desc: str) -> Tuple[Dict[str, Any], int, float]:
        req = urllib.request.Request(url, headers={"User-Agent": DEFAULT_USER_AGENT})
        last_exc: Optional[BaseException] = None
        for attempt in range(1, self.max_retries + 1):
            t0 = time.perf_counter()
            try:
                with urllib.request.urlopen(req, timeout=self.timeout_seconds) as response:
                    status = int(getattr(response, "status", 200) or 200)
                    raw = response.read()
                    latency_ms = (time.perf_counter() - t0) * 1000.0
                    if status != 200:
                        raise WeatherProviderError(
                            f"HTTP {status} from Open-Meteo",
                            http_status=status,
                            reason="HTTP_ERROR",
                        )
                    try:
                        payload = json.loads(raw.decode("utf-8"))
                    except json.JSONDecodeError as parse_err:
                        raise WeatherProviderError(
                            f"JSON parse error: {parse_err}",
                            http_status=status,
                            reason="PARSE_ERROR",
                        ) from parse_err
                    logger.info(
                        "[OpenMeteo] provider=%s endpoint=%s http_status=%s latency_ms=%.0f attempt=%s",
                        self.provider_name,
                        endpoint_desc,
                        status,
                        latency_ms,
                        attempt,
                    )
                    return payload, status, latency_ms
            except WeatherProviderError:
                raise
            except urllib.error.HTTPError as http_err:
                last_exc = http_err
                last_status = int(http_err.code)
                logger.warning(
                    "[OpenMeteo] HTTP error endpoint=%s status=%s attempt=%s/%s err=%s",
                    endpoint_desc,
                    last_status,
                    attempt,
                    self.max_retries,
                    http_err,
                )
                if last_status in (400, 404) or attempt == self.max_retries:
                    raise WeatherProviderError(
                        f"Open-Meteo HTTP {last_status}: {http_err.reason}",
                        http_status=last_status,
                        reason="HTTP_ERROR",
                    ) from http_err
            except TimeoutError as timeout_err:
                last_exc = timeout_err
                logger.warning(
                    "[OpenMeteo] timeout endpoint=%s timeout_s=%s attempt=%s/%s",
                    endpoint_desc,
                    self.timeout_seconds,
                    attempt,
                    self.max_retries,
                )
                if attempt == self.max_retries:
                    raise WeatherProviderError(
                        f"Open-Meteo timeout after {self.timeout_seconds}s",
                        reason="TIMEOUT",
                    ) from timeout_err
            except urllib.error.URLError as url_err:
                last_exc = url_err
                reason = str(getattr(url_err, "reason", url_err))
                is_timeout = "timed out" in reason.lower() or isinstance(url_err.reason, TimeoutError)
                logger.warning(
                    "[OpenMeteo] network error endpoint=%s attempt=%s/%s err=%s",
                    endpoint_desc,
                    attempt,
                    self.max_retries,
                    reason,
                )
                if attempt == self.max_retries:
                    raise WeatherProviderError(
                        f"Open-Meteo network error: {reason}",
                        reason="TIMEOUT" if is_timeout else "NETWORK_ERROR",
                    ) from url_err
            except Exception as exc:
                last_exc = exc
                logger.warning(
                    "[OpenMeteo] unexpected error endpoint=%s attempt=%s/%s err=%s",
                    endpoint_desc,
                    attempt,
                    self.max_retries,
                    exc,
                )
                if attempt == self.max_retries:
                    raise WeatherProviderError(
                        f"Open-Meteo query failed: {exc}",
                        reason="PROVIDER_ERROR",
                    ) from exc
            backoff = 0.4 * (2 ** (attempt - 1))
            time.sleep(backoff)
        raise WeatherProviderError(
            f"Open-Meteo query failed: {last_exc}",
            reason="PROVIDER_ERROR",
        )

    def get_status(self) -> Dict[str, Any]:
        """Lightweight health probe. Does not replace last successful data fetch."""
        endpoint_desc = "GET /v1/forecast (health: current only, Shillong probe)"
        url = self._build_forecast_url(25.5788, 91.8933, lightweight=True)
        try:
            _payload, status, latency_ms = self._http_get_json(url, endpoint_desc)
            self._last_http_status = status
            self._last_endpoint_desc = endpoint_desc
            self._last_latency_ms = latency_ms
            self._last_error = None
            now = datetime.now(timezone.utc).isoformat()
            if self._last_success_at is None:
                self._last_success_at = now
            return {
                "provider_name": self.provider_name,
                "status": "HEALTHY",
                "is_live": True,
                "message": "Connected to Open-Meteo forecast API (no API key required)",
                "http_status": status,
                "endpoint": endpoint_desc,
                "latency_ms": round(latency_ms, 1),
                "last_successful_fetch_at": self._last_success_at,
                "timestamp": now,
            }
        except WeatherProviderError as err:
            self._last_error = str(err)
            self._last_http_status = err.http_status
            self._last_endpoint_desc = endpoint_desc
            logger.warning("[OpenMeteo] status check failed: %s reason=%s", err, err.reason)
            return {
                "provider_name": self.provider_name,
                "status": "UNREACHABLE",
                "is_live": False,
                "message": str(err),
                "http_status": err.http_status,
                "endpoint": endpoint_desc,
                "fallback_reason": err.reason,
                "last_successful_fetch_at": self._last_success_at,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider_name": self.provider_name,
            "base_url": self.base_url,
            "api_key_required": False,
            "timeout_seconds": self.timeout_seconds,
            "max_retries": self.max_retries,
            "last_successful_fetch_at": self._last_success_at,
            "last_error": self._last_error,
            "last_http_status": self._last_http_status,
            "last_endpoint": self._last_endpoint_desc,
            "last_latency_ms": self._last_latency_ms,
        }

    def get_weather_and_forecast(self, latitude: float, longitude: float) -> Dict[str, Any]:
        endpoint_desc = (
            f"GET /v1/forecast current+hourly+daily past_days=31 forecast_days=8 "
            f"lat={latitude:.6f} lon={longitude:.6f}"
        )
        url = self._build_forecast_url(latitude, longitude, lightweight=False)
        self._last_endpoint_desc = endpoint_desc

        logger.info(f"[WEATHER] Fetching Open-Meteo")
        logger.info(f"[WEATHER] Latitude: {latitude:.4f}")
        logger.info(f"[WEATHER] Longitude: {longitude:.4f}")
        logger.info(f"[WEATHER] HTTP request started")

        try:
            data, status, latency_ms = self._http_get_json(url, endpoint_desc)
            logger.info(f"[WEATHER] Response received")
            logger.info(f"[WEATHER] Status: {status}")

            parsed = self._parse_forecast_payload(data, latitude, longitude)
            curr_p = parsed.get("current", {}).get("precipitation_mm", 0.0)
            past_p = parsed.get("past_24h", {}).get("total_rainfall_mm", 0.0)
            fore_p = parsed.get("forecast_24h", {}).get("total_rainfall_mm", 0.0)
            logger.info(f"[WEATHER] Current precipitation: {curr_p} mm")
            logger.info(f"[WEATHER] Past 24h rainfall: {past_p} mm")
            logger.info(f"[WEATHER] Forecast 24h rainfall: {fore_p} mm")

            now = datetime.now(timezone.utc).isoformat()
            self._last_success_at = now
            self._last_error = None
            self._last_http_status = status
            self._last_latency_ms = latency_ms
            parsed["provider_diagnostics"] = {
                "http_status": status,
                "endpoint": endpoint_desc,
                "latency_ms": round(latency_ms, 1),
                "last_successful_fetch_at": now,
            }
            return parsed
        except WeatherProviderError as err:
            self._last_error = str(err)
            self._last_http_status = err.http_status
            logger.warning(f"[WEATHER] Provider request failed")
            logger.warning(f"[WEATHER] Error: {err}")
            logger.warning(f"[WEATHER] Transitioning to ERROR")
            logger.error(
                "[OpenMeteo] fetch failed lat=%.6f lon=%.6f reason=%s http_status=%s err=%s",
                latitude,
                longitude,
                err.reason,
                err.http_status,
                err,
            )
            raise

    def _parse_hourly_point(
        self,
        idx: int,
        h_times: List[Any],
        h_precip: List[Any],
        h_rain: List[Any],
        h_prob: List[Any],
        h_codes: List[Any],
        h_temps: List[Any],
        h_rhs: List[Any],
        h_winds: List[Any],
        h_wdirs: List[Any],
        h_press: List[Any],
    ) -> Dict[str, Any]:
        w_code = _safe_int(h_codes[idx] if idx < len(h_codes) else 0, 0)
        precip = round(_safe_float(h_precip[idx] if idx < len(h_precip) else 0.0), 2)
        rain = round(_safe_float(h_rain[idx] if idx < len(h_rain) else precip), 2)
        prob = h_prob[idx] if idx < len(h_prob) else None
        return {
            "time": str(h_times[idx]) if idx < len(h_times) else "",
            "precipitation_mm": precip,
            "rain_mm": rain,
            "precipitation_probability_pct": None if prob is None else round(_safe_float(prob), 1),
            "temperature_c": round(_safe_float(h_temps[idx] if idx < len(h_temps) else None, 20.0), 1),
            "relative_humidity_pct": round(_safe_float(h_rhs[idx] if idx < len(h_rhs) else None, 80.0), 1),
            "wind_speed_kmh": round(_safe_float(h_winds[idx] if idx < len(h_winds) else None, 10.0), 1),
            "wind_direction_deg": round(_safe_float(h_wdirs[idx] if idx < len(h_wdirs) else None, 0.0), 1),
            "surface_pressure_hpa": round(_safe_float(h_press[idx] if idx < len(h_press) else None, 1013.0), 1),
            "weather_code": w_code,
            "weather_description": WMO_CODE_MAP.get(w_code, "Variable"),
        }

    def _parse_forecast_payload(
        self,
        data: Dict[str, Any],
        latitude: float,
        longitude: float,
    ) -> Dict[str, Any]:
        current_raw = data.get("current") or {}
        hourly_raw = data.get("hourly") or {}
        daily_raw = data.get("daily") or {}

        time_series = list(daily_raw.get("time") or [])
        precip_series = [_safe_float(v, 0.0) for v in (daily_raw.get("precipitation_sum") or [])]
        code_series = [_safe_int(v, 0) for v in (daily_raw.get("weather_code") or [])]
        temp_max_series = [_safe_float(v, 0.0) for v in (daily_raw.get("temperature_2m_max") or [])]
        temp_min_series = [_safe_float(v, 0.0) for v in (daily_raw.get("temperature_2m_min") or [])]

        h_times = list(hourly_raw.get("time") or [])
        h_precip = list(hourly_raw.get("precipitation") or [])
        h_rain = list(hourly_raw.get("rain") or h_precip)
        h_prob = list(hourly_raw.get("precipitation_probability") or [])
        h_codes = list(hourly_raw.get("weather_code") or [])
        h_temps = list(hourly_raw.get("temperature_2m") or [])
        h_rhs = list(hourly_raw.get("relative_humidity_2m") or [])
        h_winds = list(hourly_raw.get("wind_speed_10m") or [])
        h_wdirs = list(hourly_raw.get("wind_direction_10m") or [])
        h_press = list(hourly_raw.get("surface_pressure") or [])
        curr_time_str = str(current_raw.get("time") or "")

        h_start = 0
        if curr_time_str and curr_time_str in h_times:
            h_start = h_times.index(curr_time_str)
        elif h_times:
            h_start = min(max(0, len(h_times) - 24 * 8), max(0, 31 * 24))

        next_1h = _sum_window(h_precip, h_start, 1)
        next_3h = _sum_window(h_precip, h_start, 3)
        next_6h = _sum_window(h_precip, h_start, 6)
        next_12h = _sum_window(h_precip, h_start, 12)
        next_24h = _sum_window(h_precip, h_start, 24)

        f_slice = precip_series[-7:] if len(precip_series) >= 7 else precip_series
        next_3d_precip = float(sum(f_slice[:3])) if f_slice else 0.0
        next_7d_precip = float(sum(f_slice[:7])) if f_slice else 0.0

        p_start = max(0, h_start - 24)
        past_1h = _sum_window(h_precip, h_start - 1, 1)
        past_3h = _sum_window(h_precip, h_start - 3, 3)
        past_6h = _sum_window(h_precip, h_start - 6, 6)
        past_12h = _sum_window(h_precip, h_start - 12, 12)
        past_24h = _sum_window(h_precip, p_start, h_start - p_start)

        p_slice_precip = [_safe_float(v) for v in h_precip[p_start:h_start]]
        p_slice_temp = [_safe_float(v, 20.0) for v in h_temps[p_start:h_start]]
        p_slice_rh = [_safe_float(v, 80.0) for v in h_rhs[p_start:h_start]]
        p_slice_wind = [_safe_float(v, 10.0) for v in h_winds[p_start:h_start]]

        past_24h_hourly = [
            self._parse_hourly_point(
                idx, h_times, h_precip, h_rain, h_prob, h_codes, h_temps, h_rhs, h_winds, h_wdirs, h_press
            )
            for idx in range(p_start, h_start)
        ]
        f_end = min(len(h_times), h_start + 24)
        forecast_24h_hourly = [
            self._parse_hourly_point(
                idx, h_times, h_precip, h_rain, h_prob, h_codes, h_temps, h_rhs, h_winds, h_wdirs, h_press
            )
            for idx in range(h_start, f_end)
        ]

        wcode = _safe_int(current_raw.get("weather_code"), 0)
        fetch_iso = datetime.now(timezone.utc).isoformat()
        current_precip = _safe_float(current_raw.get("precipitation"), 0.0)

        return {
            "latitude": latitude,
            "longitude": longitude,
            "provider_grid_latitude": data.get("latitude"),
            "provider_grid_longitude": data.get("longitude"),
            "elevation_m": _safe_float(data.get("elevation"), 0.0),
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
                "elevation_m": _safe_float(data.get("elevation"), 0.0),
                "timezone": data.get("timezone", "UTC"),
            },
            "current": {
                "temperature_2m_c": _safe_float(current_raw.get("temperature_2m"), 20.0),
                "relative_humidity_2m_pct": _safe_float(current_raw.get("relative_humidity_2m"), 80.0),
                "precipitation_mm": current_precip,
                "wind_speed_10m_kmh": _safe_float(current_raw.get("wind_speed_10m"), 12.0),
                "weather_code": wcode,
                "weather_description": WMO_CODE_MAP.get(wcode, "Variable precipitation"),
                "time": current_raw.get("time", fetch_iso),
            },
            "intervals": {
                "now_mm": round(current_precip, 2),
                "next_1h_mm": round(next_1h, 2),
                "next_3h_mm": round(next_3h, 2),
                "next_6h_mm": round(next_6h, 2),
                "next_12h_mm": round(next_12h, 2),
                "next_24h_mm": round(next_24h, 2),
                "next_3d_mm": round(next_3d_precip, 2),
                "next_7d_mm": round(next_7d_precip, 2),
            },
            "rain_windows": {
                "past_1h_mm": round(past_1h, 2),
                "past_3h_mm": round(past_3h, 2),
                "past_6h_mm": round(past_6h, 2),
                "past_12h_mm": round(past_12h, 2),
                "past_24h_mm": round(past_24h, 2),
                "next_1h_mm": round(next_1h, 2),
                "next_3h_mm": round(next_3h, 2),
                "next_6h_mm": round(next_6h, 2),
                "next_12h_mm": round(next_12h, 2),
                "next_24h_mm": round(next_24h, 2),
            },
            "past_24h": {
                "total_rainfall_mm": round(past_24h, 2),
                "peak_hourly_rainfall_mm": round(max(p_slice_precip) if p_slice_precip else 0.0, 2),
                "rainy_hours_count": sum(1 for p in p_slice_precip if p >= 0.1),
                "temp_min_c": round(min(p_slice_temp) if p_slice_temp else 18.0, 1),
                "temp_max_c": round(max(p_slice_temp) if p_slice_temp else 24.0, 1),
                "relative_humidity_avg_pct": round(
                    (sum(p_slice_rh) / len(p_slice_rh)) if p_slice_rh else 80.0, 1
                ),
                "relative_humidity_max_pct": round(max(p_slice_rh) if p_slice_rh else 85.0, 1),
                "wind_speed_max_kmh": round(max(p_slice_wind) if p_slice_wind else 10.0, 1),
                "hourly": past_24h_hourly,
            },
            "forecast_24h": {
                "total_rainfall_mm": round(next_24h, 2),
                "peak_hourly_rainfall_mm": round(
                    max((_safe_float(v) for v in h_precip[h_start:f_end]), default=0.0), 2
                ),
                "hourly": forecast_24h_hourly,
            },
            "daily": {
                "time": time_series,
                "precipitation_sum": precip_series,
                "weather_code": code_series,
                "weather_descriptions": [WMO_CODE_MAP.get(c, "Variable") for c in code_series],
                "temperature_2m_max": temp_max_series,
                "temperature_2m_min": temp_min_series,
            },
        }
