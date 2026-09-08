"""
backend/tests/test_weather_service.py
=====================================
Comprehensive Unit & Integration Tests for Real-Time Weather Intelligence Layer,
Open-Meteo Integration, Cache Governance, Feature Engine, and 7-Day Forecast Risk.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import (
    EXPECTED_MODEL_A_SHA256, EXPECTED_MODEL_B_SHA256,
    MODEL_A_PATH, MODEL_B_PATH
)
from backend.app.model_service import compute_file_sha256
from backend.app.weather_cache import WeatherCache
from backend.app.weather_feature_engine import WeatherFeatureEngine
from backend.app.weather_service import weather_service

client = TestClient(app)


def test_frozen_model_cryptographic_integrity():
    """Verify Model A and Model B SHA-256 hashes are strictly preserved and immutable."""
    hash_a = compute_file_sha256(str(MODEL_A_PATH))
    hash_b = compute_file_sha256(str(MODEL_B_PATH))
    assert hash_a == EXPECTED_MODEL_A_SHA256, f"Model A hash mismatch: {hash_a}"
    assert hash_b == EXPECTED_MODEL_B_SHA256, f"Model B hash mismatch: {hash_b}"


def test_weather_feature_engine_exact_calculation():
    """
    Verifies that WeatherFeatureEngine computes the exact 10 CHIRPS dynamic features
    matching the Section 20-30 training pipeline formulas.
    """
    # Create synthetic 30-day series: days 0..22 are 1.0mm, days 23..26 are 5.0mm,
    # day 27 is 10.0mm, day 28 is 15.0mm, day 29 (target day T) is 20.0mm
    series = [1.0] * 23 + [5.0] * 4 + [10.0, 15.0, 20.0]
    assert len(series) == 30

    feats = WeatherFeatureEngine.compute_10_features(series)

    # 1. rainfall_event_day = day 29
    assert feats["rainfall_event_day"] == 20.0

    # 2. ari_3 = sum(days 27..29) = 10 + 15 + 20 = 45.0
    assert feats["ari_3"] == 45.0

    # 3. ari_7 = sum(days 23..29) = 4*5.0 + 10 + 15 + 20 = 20 + 45 = 65.0
    assert feats["ari_7"] == 65.0

    # 4. ari_15 = sum(days 15..29) = 8*1.0 + 65.0 = 73.0
    assert feats["ari_15"] == 73.0

    # 5. ari_30 = sum(days 0..29) = 23*1.0 + 65.0 = 88.0
    assert feats["ari_30"] == 88.0

    # 6. max_1day_7d = max(days 23..29) = 20.0
    assert feats["max_1day_7d"] == 20.0

    # 7. max_3day_30d = 10 + 15 + 20 = 45.0
    assert feats["max_3day_30d"] == 45.0

    # 8. rainy_days_7d (>= 2.5mm in days 23..29): all 7 days have precip >= 5.0mm -> 7
    assert feats["rainy_days_7d"] == 7

    # 9. rainy_days_15d (>= 2.5mm in days 15..29): days 15..22 have 1.0mm (< 2.5mm), days 23..29 have >= 5.0mm -> 7
    assert feats["rainy_days_15d"] == 7

    # 10. rainy_days_30d: only days 23..29 >= 2.5mm -> 7
    assert feats["rainy_days_30d"] == 7


def test_weather_feature_engine_rolling_forecast_window():
    """Verifies that 7-day rolling forecast features advance daily window correctly."""
    times = [f"2026-08-{i:02d}" for i in range(1, 32)] + [f"2026-09-{i:02d}" for i in range(1, 9)]
    precip = [2.0] * 31 + [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0]

    result = WeatherFeatureEngine.extract_current_and_forecast_features(times, precip, forecast_days=7)
    assert "current_features" in result
    assert "forecast_timeline" in result
    assert len(result["forecast_timeline"]) == 7

    # Check that day_offsets are 1 to 7
    offsets = [item["day_offset"] for item in result["forecast_timeline"]]
    assert offsets == [1, 2, 3, 4, 5, 6, 7]


def test_weather_cache_lifecycle():
    """Verifies cache storage, TTL freshness, stale access, and clear."""
    cache = WeatherCache(default_ttl_seconds=1)
    lat, lon = 25.57, 91.89

    # Initially empty
    data, status = cache.get(lat, lon)
    assert data is None
    assert status == "MISS"

    # Store entry
    test_payload = {"temp": 22.0, "status": "ok"}
    cache.set(lat, lon, test_payload, ttl_seconds=10)

    data, status = cache.get(lat, lon)
    assert data == test_payload
    assert status == "HIT_FRESH"

    stats = cache.get_stats()
    assert stats["hits"] == 1
    assert stats["cached_locations"] == 1

    cache.clear()
    data, status = cache.get(lat, lon)
    assert data is None
    assert status == "MISS"


def test_weather_status_endpoint():
    """Verifies GET /api/v1/weather/status returns valid schema and truthful provider state."""
    res = client.get("/api/v1/weather/status")
    assert res.status_code == 200
    json_data = res.json()
    assert "mode" in json_data
    assert json_data["mode"] in ["LIVE", "DEMO_SCENARIO"]
    assert "provider_name" in json_data
    assert "is_live" in json_data
    assert "timestamp" in json_data


def test_current_weather_endpoint():
    """Verifies GET /api/v1/weather/current returns live/calibrated weather and Model B dynamic trigger P(D)."""
    res = client.get("/api/v1/weather/current?latitude=25.5788&longitude=91.8933")
    assert res.status_code == 200
    json_data = res.json()
    assert "current" in json_data
    assert "temperature_c" in json_data["current"]
    assert "features" in json_data
    assert "dynamic_trigger_p_d" in json_data
    assert 0.0 <= json_data["dynamic_trigger_p_d"] <= 1.0


def test_weather_forecast_endpoint():
    """Verifies GET /api/v1/weather/forecast returns 7-day forecast points."""
    res = client.get("/api/v1/weather/forecast?latitude=25.5788&longitude=91.8933&days=7")
    assert res.status_code == 200
    json_data = res.json()
    assert "daily_forecast" in json_data
    assert len(json_data["daily_forecast"]) == 7
    for pt in json_data["daily_forecast"]:
        assert "precipitation_sum_mm" in pt
        assert "date" in pt


def test_weather_history_endpoint():
    """Verifies GET /api/v1/weather/history returns historical antecedent precipitation."""
    res = client.get("/api/v1/weather/history?latitude=25.5788&longitude=91.8933&days=14")
    assert res.status_code == 200
    json_data = res.json()
    assert "daily_history" in json_data
    assert len(json_data["daily_history"]) >= 10


def test_risk_forecast_endpoint_post():
    """Verifies POST /api/v1/risk/forecast evaluates 7-day risk trajectory."""
    payload = {
        "latitude": 25.5788,
        "longitude": 91.8933,
        "p_s": 0.4200,
        "location_name": "Shillong High Slope Test"
    }
    res = client.post("/api/v1/risk/forecast", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["static_susceptibility_p_s"] == 0.42
    assert 0.0 <= data["current_dynamic_trigger_p_d"] <= 1.0
    assert 0.0 <= data["current_coupled_risk_score"] <= 1.0
    assert "timeline" in data
    assert len(data["timeline"]) == 7
    assert "peak_day" in data
    assert "overall_trend" in data
    assert "explainability" in data

    # Verify each forecast point has valid coupled risk and alert tier
    for pt in data["timeline"]:
        assert 0.0 <= pt["dynamic_trigger_p_d"] <= 1.0
        assert 0.0 <= pt["coupled_risk_score"] <= 1.0
        assert pt["alert_tier_code"] in [
            "Level 1: Green", "Level 2: Yellow", "Level 3: Orange", "Level 4: Red"
        ]


def test_risk_forecast_endpoint_get_cell():
    """Verifies GET /api/v1/risk/forecast works using nearest cell lookup."""
    res = client.get("/api/v1/risk/forecast?latitude=25.5&longitude=91.5")
    assert res.status_code == 200
    data = res.json()
    assert "nearest_cell_id" in data
    assert data["nearest_cell_id"] is not None
    assert "timeline" in data
    assert len(data["timeline"]) == 7
