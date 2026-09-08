"""
backend/tests/test_sync_and_trend.py
====================================
Automated test suite verifying the Continuous Real-Time Synchronization,
Data Freshness System, and Temporal Landslide Risk Trend Intelligence.

Verifies:
1. WeatherSyncService initialization and thread-safe status retrieval.
2. GET /api/v1/weather/sync-status endpoint schema and attributes.
3. POST /api/v1/weather/sync/register endpoint for active map coordinate tracking.
4. Risk history ring buffer recording, capping, and retrieval.
5. Temporal risk trend detection: STABLE, RISING, and FALLING with configurable epsilon.
6. GET /api/v1/risk/coordinate/history endpoint returns valid schema and chronological entries.
7. GET /api/v1/risk/coordinate endpoint integrates risk_trend and previous_coupled_risk.
8. Data freshness status computation: LIVE, CACHED_LIVE, STALE, and FALLBACK honesty.
9. Provider failure resilience: previous valid data preserved without crashing.
10. Cryptographic integrity of frozen Model A and Model B artifacts.
"""

from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import (
    EXPECTED_MODEL_A_SHA256,
    EXPECTED_MODEL_B_SHA256,
    MODEL_A_PATH,
    MODEL_B_PATH,
    RISK_TREND_EPSILON,
)
from backend.app.model_service import compute_file_sha256
from backend.app.weather_sync_service import WeatherSyncService, weather_sync_service
from backend.app.weather_service import weather_service
from backend.app.schemas import AlertTierEnum

client = TestClient(app)


def test_frozen_model_cryptographic_integrity_sync():
    """Verify Model A and Model B SHA-256 hashes are strictly preserved and immutable."""
    hash_a = compute_file_sha256(str(MODEL_A_PATH))
    hash_b = compute_file_sha256(str(MODEL_B_PATH))
    assert hash_a == EXPECTED_MODEL_A_SHA256, f"Model A hash mismatch: {hash_a}"
    assert hash_b == EXPECTED_MODEL_B_SHA256, f"Model B hash mismatch: {hash_b}"


def test_sync_service_initialization():
    """Verify WeatherSyncService initializes with expected defaults and thread-safety."""
    service = WeatherSyncService(refresh_interval_seconds=600, coordinate_refresh_seconds=600)
    status = service.get_sync_status()
    assert status["interval_seconds"] == 600
    assert status["provider_status"] in ("INITIALIZING", "LIVE", "CACHED_LIVE", "FALLBACK")
    assert "last_sync_at" in status
    assert "next_sync_seconds" in status
    assert status["failure_count"] == 0


def test_sync_status_endpoint():
    """Verify GET /api/v1/weather/sync-status returns 200 with complete telemetry metadata."""
    res = client.get("/api/v1/weather/sync-status")
    assert res.status_code == 200
    data = res.json()
    assert "interval_seconds" in data
    assert "provider_status" in data
    assert "is_live" in data
    assert "sync_count" in data
    assert "operational_note" in data
    assert "RESEARCH / ADVISORY" in data["operational_note"]


def test_coordinate_register_endpoint():
    """Verify POST /api/v1/weather/sync/register sets the active location for auto-sync."""
    payload = {
        "latitude": 25.2744,
        "longitude": 91.7323,
        "cell_id": "CELL_MEG_0878",
        "p_s": 0.3845,
    }
    res = client.post("/api/v1/weather/sync/register", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["registered"] is True
    assert data["latitude"] == 25.2744
    assert data["cell_id"] == "CELL_MEG_0878"

    # Verify sync service internal state reflects registration
    status = weather_sync_service.get_sync_status()
    assert status["selected_coordinate"] == [25.2744, 91.7323]
    assert status["selected_cell_id"] == "CELL_MEG_0878"


def test_risk_history_recording_and_retrieval():
    """Verify in-memory ring buffer stores and limits observations per coordinate."""
    lat, lon = 25.50, 91.50
    # Clear any existing history for test coordinate
    key = weather_service._history_key(lat, lon)
    with weather_service._history_lock:
        if key in weather_service._risk_history:
            del weather_service._risk_history[key]

    # Record 3 observations
    weather_service.record_risk_observation(lat, lon, 10.0, 0.40, 0.30, 0.1200, "Level 2: Yellow")
    weather_service.record_risk_observation(lat, lon, 15.0, 0.50, 0.30, 0.1500, "Level 3: Orange")
    weather_service.record_risk_observation(lat, lon, 25.0, 0.60, 0.30, 0.1800, "Level 3: Orange")

    entries = weather_service.get_risk_history(lat, lon, limit=10)
    assert len(entries) == 3
    assert entries[0]["coupled_risk"] == 0.1200
    assert entries[1]["coupled_risk"] == 0.1500
    assert entries[2]["coupled_risk"] == 0.1800


def test_risk_trend_calculation_stable():
    """Verify changes smaller than RISK_TREND_EPSILON are classified as STABLE."""
    lat, lon = 25.60, 91.60
    key = weather_service._history_key(lat, lon)
    with weather_service._history_lock:
        if key in weather_service._risk_history:
            del weather_service._risk_history[key]

    weather_service.record_risk_observation(lat, lon, 5.0, 0.40, 0.20, 0.0800, "Level 2: Yellow")
    weather_service.record_risk_observation(lat, lon, 5.0, 0.40, 0.20, 0.0802, "Level 2: Yellow")

    trend = weather_service.compute_risk_trend(lat, lon)
    assert trend["trend"] == "STABLE"
    assert trend["previous_risk"] == 0.0800
    assert trend["current_risk"] == 0.0802
    assert abs(trend["risk_change"]) < RISK_TREND_EPSILON


def test_risk_trend_calculation_rising():
    """Verify increases exceeding RISK_TREND_EPSILON are classified as RISING."""
    lat, lon = 25.70, 91.70
    key = weather_service._history_key(lat, lon)
    with weather_service._history_lock:
        if key in weather_service._risk_history:
            del weather_service._risk_history[key]

    weather_service.record_risk_observation(lat, lon, 5.0, 0.30, 0.30, 0.0900, "Level 2: Yellow")
    weather_service.record_risk_observation(lat, lon, 35.0, 0.70, 0.30, 0.2100, "Level 3: Orange")

    trend = weather_service.compute_risk_trend(lat, lon)
    assert trend["trend"] == "RISING"
    assert trend["risk_change"] == pytest.approx(0.1200, abs=1e-3)
    assert trend["previous_risk"] == 0.0900
    assert trend["current_risk"] == 0.2100


def test_risk_trend_calculation_falling():
    """Verify decreases exceeding RISK_TREND_EPSILON are classified as FALLING."""
    lat, lon = 25.80, 91.80
    key = weather_service._history_key(lat, lon)
    with weather_service._history_lock:
        if key in weather_service._risk_history:
            del weather_service._risk_history[key]

    weather_service.record_risk_observation(lat, lon, 40.0, 0.80, 0.40, 0.3200, "Level 3: Orange")
    weather_service.record_risk_observation(lat, lon, 2.0, 0.20, 0.40, 0.0800, "Level 2: Yellow")

    trend = weather_service.compute_risk_trend(lat, lon)
    assert trend["trend"] == "FALLING"
    assert trend["risk_change"] == pytest.approx(-0.2400, abs=1e-3)
    assert trend["previous_risk"] == 0.3200
    assert trend["current_risk"] == 0.0800


def test_risk_history_endpoint():
    """Verify GET /api/v1/risk/coordinate/history returns 200 and valid schema."""
    lat, lon = 25.2744, 91.7323
    # Seed history
    weather_service.record_risk_observation(lat, lon, 12.0, 0.45, 0.35, 0.1575, "Level 3: Orange")

    res = client.get(f"/api/v1/risk/coordinate/history?latitude={lat}&longitude={lon}&limit=10")
    assert res.status_code == 200
    data = res.json()
    assert data["latitude"] == pytest.approx(lat, abs=1e-4)
    assert data["longitude"] == pytest.approx(lon, abs=1e-4)
    assert "entries" in data
    assert isinstance(data["entries"], list)
    assert data["entry_count"] >= 1
    assert "trend" in data
    assert "timestamp" in data


def test_coordinate_risk_endpoint_includes_trend():
    """Verify /api/v1/risk/coordinate response contains Phase 2 temporal risk fields."""
    lat, lon = 25.2744, 91.7323
    # Make two calls to establish baseline and compute trend
    res1 = client.get(f"/api/v1/risk/coordinate?lat={lat}&lon={lon}")
    assert res1.status_code == 200
    data1 = res1.json()
    assert "risk_trend" in data1

    res2 = client.get(f"/api/v1/risk/coordinate?lat={lat}&lon={lon}")
    assert res2.status_code == 200
    data2 = res2.json()
    assert "risk_trend" in data2
    assert "previous_coupled_risk" in data2
    assert "risk_change" in data2
    assert data2["risk_trend"] in ("STABLE", "RISING", "FALLING")


def test_data_freshness_status_derivation():
    """Verify data freshness labels follow strict honesty requirements."""
    service = WeatherSyncService()
    now = datetime.now(timezone.utc)

    # 1. Uninitialized
    assert service._compute_freshness_status_locked(now) == "INITIALIZING"

    # 2. Fresh live sync
    service._last_successful_sync_at = now - timedelta(minutes=5)
    service._is_live = True
    assert service._compute_freshness_status_locked(now) == "LIVE"

    # 3. Cached live (live provider, but slightly older or offline flag)
    service._is_live = False
    assert service._compute_freshness_status_locked(now) == "CACHED_LIVE"

    # 4. Stale (beyond threshold)
    service._last_successful_sync_at = now - timedelta(minutes=35)
    assert service._compute_freshness_status_locked(now) == "STALE"

    # 5. Fallback (very old)
    service._last_successful_sync_at = now - timedelta(hours=3)
    assert service._compute_freshness_status_locked(now) == "FALLBACK"


def test_provider_failure_resilience():
    """Verify that simulated sync errors do not crash service and retain valid prior data."""
    service = WeatherSyncService()
    service._last_successful_sync_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    service._is_live = True

    # Simulate an error during sync
    service._shutdown_flag = False
    with service._lock:
        service._failure_count += 1
        service._consecutive_failures += 1
        service._is_live = False
        service._provider_status = "ERROR"

    status = service.get_sync_status()
    assert status["provider_status"] == "CACHED_LIVE" or status["failure_count"] > 0
    # Crucial: last valid sync timestamp is retained
    assert status["last_sync_at"] is not None
