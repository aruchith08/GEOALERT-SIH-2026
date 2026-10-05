"""
backend/app/weather_sync_service.py
====================================
Controlled background weather synchronization service for GEOALERT.

Uses threading.Timer (NOT asyncio, NOT infinite polling) to schedule periodic
weather telemetry updates. Self-reschedules on success with exponential backoff
on failure, and preserves previous valid data on provider outages.
"""

import logging
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, Any, List

logger = logging.getLogger(__name__)

try:
    from backend.app.config import (
        WEATHER_REFRESH_INTERVAL_SECONDS,
        COORDINATE_AUTO_REFRESH_INTERVAL_SECONDS,
        FRESHNESS_STALE_THRESHOLD_MINUTES,
    )
    from backend.app.weather_service import weather_service
    from backend.app.weather_cache import weather_cache
except ImportError:
    from app.config import (
        WEATHER_REFRESH_INTERVAL_SECONDS,
        COORDINATE_AUTO_REFRESH_INTERVAL_SECONDS,
        FRESHNESS_STALE_THRESHOLD_MINUTES,
    )
    from app.weather_service import weather_service
    from app.weather_cache import weather_cache


_MESH_COORDINATES: List[tuple] = [
    (25.5788, 91.8933),
    (25.2744, 91.7323),
    (25.2972, 91.5828),
    (25.5521, 91.8833),
    (25.9103, 91.9737),
    (25.4357, 92.1178),
    (25.0428, 92.2965),
    (25.5177, 91.2649),
    (25.5568, 91.6674),
    (25.5150, 90.2088),
    (25.7006, 92.4765),
    (25.1645, 90.6296),
]


class WeatherSyncService:
    """
    Controlled background weather synchronization service using threading.Timer.
    NOT an infinite loop. Each cycle schedules the next via threading.Timer.
    """

    def __init__(
        self,
        refresh_interval_seconds: int = WEATHER_REFRESH_INTERVAL_SECONDS,
        coordinate_refresh_seconds: int = COORDINATE_AUTO_REFRESH_INTERVAL_SECONDS,
    ) -> None:
        self._interval = refresh_interval_seconds
        self._coord_interval = coordinate_refresh_seconds
        self._lock = threading.Lock()
        self._last_successful_sync_at: Optional[datetime] = None
        self._next_sync_at: Optional[datetime] = None
        self._sync_count: int = 0
        self._failure_count: int = 0
        self._consecutive_failures: int = 0
        self._is_live: bool = False
        self._provider_status: str = "INITIALIZING"
        self._connecting_started_at: Optional[datetime] = None
        self._selected_lat: Optional[float] = None
        self._selected_lon: Optional[float] = None
        self._selected_cell_id: Optional[str] = None
        self._selected_p_s: Optional[float] = None
        self._timer: Optional[threading.Timer] = None
        self._shutdown_flag: bool = False

    def start(self) -> None:
        """Start background weather synchronization service with immediate non-blocking initial probe."""
        with self._lock:
            if self._timer is not None or self._is_live:
                return
            self._provider_status = "CONNECTING"
            self._connecting_started_at = datetime.now(timezone.utc)
        logger.info(f"[WeatherSyncService] Starting initial sync — interval={self._interval}s")
        init_thread = threading.Thread(target=self._run_initial_sync, daemon=True)
        init_thread.start()

    def _run_initial_sync(self) -> None:
        """Probe provider and perform initial mesh sync on background thread."""
        logger.info("[WeatherSyncService] Initial sync probe started.")
        try:
            status = weather_service.get_status()
            now = datetime.now(timezone.utc)
            with self._lock:
                if status.is_live:
                    self._last_successful_sync_at = now
                    self._is_live = True
                    self._provider_status = "LIVE"
                    self._consecutive_failures = 0
                    self._sync_count += 1
                    logger.info("[WeatherSyncService] Initial probe succeeded: LIVE")
                else:
                    self._is_live = False
                    self._provider_status = "FALLBACK"
                    self._failure_count += 1
                    logger.warning("[WeatherSyncService] Initial probe indicated fallback mode.")
        except Exception as exc:
            with self._lock:
                self._is_live = False
                self._provider_status = "ERROR"
                self._failure_count += 1
                self._consecutive_failures += 1
            logger.error(f"[WeatherSyncService] Initial probe failed: {exc}")
        finally:
            if not self._shutdown_flag:
                delay = self._interval if self._is_live else 60
                self._schedule_next(delay=delay)

    def shutdown(self) -> None:
        """Cancel any pending timer. Call on app shutdown."""
        with self._lock:
            self._shutdown_flag = True
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None
        logger.info("[WeatherSyncService] Shutdown complete.")

    def set_selected_coordinate(
        self,
        latitude: float,
        longitude: float,
        cell_id: Optional[str] = None,
        p_s: Optional[float] = None,
    ) -> None:
        """Register a coordinate for targeted auto-refresh (called on map click)."""
        with self._lock:
            self._selected_lat = latitude
            self._selected_lon = longitude
            self._selected_cell_id = cell_id
            self._selected_p_s = p_s

    def get_sync_status(self) -> Dict[str, Any]:
        """Thread-safe, instant in-memory status snapshot for the sync-status API endpoint."""
        with self._lock:
            now = datetime.now(timezone.utc)
            freshness = self._compute_freshness_status_locked(now)

            next_sync_seconds: Optional[int] = None
            if self._next_sync_at is not None:
                delta = (self._next_sync_at - now).total_seconds()
                next_sync_seconds = max(0, int(delta))

            data_age_minutes: Optional[float] = None
            if self._last_successful_sync_at is not None:
                age = (now - self._last_successful_sync_at).total_seconds() / 60.0
                data_age_minutes = round(max(0.0, age), 1)

            selected_coord = None
            if self._selected_lat is not None and self._selected_lon is not None:
                selected_coord = [self._selected_lat, self._selected_lon]

            is_live_flag = self._is_live if freshness in ("LIVE", "CACHED_LIVE") else False

            return {
                "last_sync_at": (
                    self._last_successful_sync_at.isoformat()
                    if self._last_successful_sync_at
                    else None
                ),
                "next_sync_at": (
                    self._next_sync_at.isoformat()
                    if self._next_sync_at
                    else None
                ),
                "next_sync_seconds": next_sync_seconds,
                "interval_seconds": self._interval,
                "provider_status": freshness,
                "is_live": is_live_flag,
                "sync_count": self._sync_count,
                "failure_count": self._failure_count,
                "consecutive_failures": self._consecutive_failures,
                "data_age_minutes": data_age_minutes,
                "selected_coordinate": selected_coord,
                "selected_cell_id": self._selected_cell_id,
            }

    def _run_sync_cycle(self) -> None:
        """Execute one sync cycle, then schedule the next."""
        if self._shutdown_flag:
            return

        logger.info(f"[WeatherSyncService] Sync cycle #{self._sync_count + 1}")
        success = False

        try:
            self._refresh_selected_coordinate()

            for lat, lon in _MESH_COORDINATES[:2]:
                try:
                    weather_service.get_current_weather(lat, lon)
                except Exception as e:
                    logger.debug(f"[WeatherSyncService] Station ({lat},{lon}) skipped: {e}")

            success = True
            status_is_live = False
            try:
                status = weather_service.get_status()
                status_is_live = status.is_live
            except Exception:
                status_is_live = False

            with self._lock:
                self._last_successful_sync_at = datetime.now(timezone.utc)
                self._sync_count += 1
                self._consecutive_failures = 0
                self._is_live = status_is_live
                self._provider_status = "LIVE" if status_is_live else "FALLBACK"

            logger.info(
                f"[WeatherSyncService] Sync #{self._sync_count} done. "
                f"Provider: {self._provider_status}"
            )

        except Exception as exc:
            with self._lock:
                self._failure_count += 1
                self._consecutive_failures += 1
                self._is_live = False
                self._provider_status = "ERROR"
            logger.warning(f"[WeatherSyncService] Sync failed: {exc}")

        finally:
            if not self._shutdown_flag:
                if success:
                    next_delay = self._interval
                else:
                    backoff = min(self._consecutive_failures, 5)
                    next_delay = min(self._interval * max(backoff, 1), self._interval * 5)
                    next_delay = max(next_delay, 60)
                self._schedule_next(delay=next_delay)

    def _refresh_selected_coordinate(self) -> None:
        """Silently refresh the selected coordinate cache."""
        with self._lock:
            lat = self._selected_lat
            lon = self._selected_lon
            cell_id = self._selected_cell_id
            p_s = self._selected_p_s

        if lat is None or lon is None:
            return

        try:
            weather_cache.invalidate(lat, lon)
            weather_service.get_coordinate_risk_intelligence(
                latitude=lat,
                longitude=lon,
                cell_id=cell_id,
                p_s=p_s,
                force_refresh=True,
            )
            logger.debug(f"[WeatherSyncService] Coordinate ({lat:.5f}, {lon:.5f}) refreshed.")
        except Exception as exc:
            logger.warning(f"[WeatherSyncService] Coordinate refresh failed: {exc}")

    def _schedule_next(self, delay: int) -> None:
        """Schedule the next sync via threading.Timer."""
        with self._lock:
            if self._shutdown_flag:
                return
            self._next_sync_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
            self._timer = threading.Timer(delay, self._run_sync_cycle)
            self._timer.daemon = True
            self._timer.start()

    def _compute_freshness_status_locked(self, now: datetime) -> str:
        """Derive honest freshness status label (call with lock held)."""
        if self._last_successful_sync_at is None:
            if self._provider_status == "ERROR":
                return "ERROR"
            if self._connecting_started_at is not None:
                elapsed = (now - self._connecting_started_at).total_seconds()
                if elapsed > 15.0:
                    return "ERROR"
                return "CONNECTING"
            return self._provider_status or "INITIALIZING"

        age_minutes = (now - self._last_successful_sync_at).total_seconds() / 60.0
        if self._is_live and age_minutes <= FRESHNESS_STALE_THRESHOLD_MINUTES:
            return "LIVE"
        elif age_minutes <= FRESHNESS_STALE_THRESHOLD_MINUTES:
            return "CACHED_LIVE"
        elif age_minutes <= FRESHNESS_STALE_THRESHOLD_MINUTES * 3:
            return "STALE"
        else:
            return "FALLBACK"


weather_sync_service = WeatherSyncService()
