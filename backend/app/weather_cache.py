"""
backend/app/weather_cache.py
============================
Thread-safe in-memory cache with configurable TTL and graceful stale fallback
for weather telemetry across Meghalaya / Northeast India.
"""

from datetime import datetime, timezone, timedelta
import logging
import os
import threading
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)


class WeatherCache:
    """
    In-memory thread-safe cache for weather observation and forecast payloads.
    Guarantees low-latency responses, respects Open-Meteo rate limits, and
    provides stale cache fallback during intermittent network connectivity.
    """

    def __init__(self, default_ttl_seconds: Optional[int] = None):
        if default_ttl_seconds is None:
            env_ttl = os.getenv("WEATHER_CACHE_TTL", "900").strip()
            try:
                self.ttl_seconds = int(env_ttl)
            except ValueError:
                self.ttl_seconds = 900
        else:
            self.ttl_seconds = default_ttl_seconds

        self._lock = threading.Lock()
        self._store: Dict[Tuple[float, float], Dict[str, Any]] = {}
        self._hits = 0
        self._misses = 0

    @staticmethod
    def _make_key(latitude: float, longitude: float) -> Tuple[float, float]:
        """Rounds coordinates to 2 decimal places (~1.1 km resolution)."""
        return (round(float(latitude), 2), round(float(longitude), 2))

    def get(self, latitude: float, longitude: float) -> Tuple[Optional[Dict[str, Any]], str]:
        """
        Retrieves cached data if available.
        Returns (data, status) where status is one of:
        - "HIT_FRESH": Cache entry exists and is within TTL.
        - "HIT_STALE": Cache entry exists but has exceeded TTL (used for graceful fallback).
        - "MISS": No cache entry exists.
        """
        key = self._make_key(latitude, longitude)
        now = datetime.now(timezone.utc)

        with self._lock:
            if key in self._store:
                entry = self._store[key]
                expires_at = entry["expires_at"]
                if now <= expires_at:
                    self._hits += 1
                    return entry["data"], "HIT_FRESH"
                else:
                    return entry["data"], "HIT_STALE"

            self._misses += 1
            return None, "MISS"

    def set(self, latitude: float, longitude: float, data: Dict[str, Any], ttl_seconds: Optional[int] = None) -> None:
        """Stores or updates data in cache with calculated expiration timestamp."""
        key = self._make_key(latitude, longitude)
        ttl = ttl_seconds if ttl_seconds is not None else self.ttl_seconds
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=ttl)

        with self._lock:
            self._store[key] = {
                "data": data,
                "cached_at": now.isoformat(),
                "expires_at": expires_at
            }
            logger.debug(f"Cached weather data for {key}, expires in {ttl}s")

    def clear(self) -> None:
        """Flushes all cached entries."""
        with self._lock:
            self._store.clear()
            self._hits = 0
            self._misses = 0

    def get_stats(self) -> Dict[str, Any]:
        """Returns diagnostic metrics for caching layer."""
        with self._lock:
            total_queries = self._hits + self._misses
            hit_rate = (self._hits / total_queries * 100.0) if total_queries > 0 else 0.0
            latest_cached_at = None
            if self._store:
                latest_cached_at = max(entry["cached_at"] for entry in self._store.values())
            return {
                "cached_locations": len(self._store),
                "entries_count": len(self._store),
                "ttl_seconds": self.ttl_seconds,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate_pct": round(hit_rate, 1),
                "latest_cached_at": latest_cached_at
            }


weather_cache = WeatherCache()
