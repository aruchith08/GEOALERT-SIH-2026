"""
backend/tests/test_live_weather_pipeline.py
===========================================
End-to-end integration and verification suite for the Real Meteorological Data
Pipeline in GEOALERT.
"""

import hashlib
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import (
    MODEL_A_PATH,
    MODEL_B_PATH,
    EXPECTED_MODEL_A_SHA256,
    EXPECTED_MODEL_B_SHA256,
    GEOJSON_SURFACE_PATH,
)
from backend.app.weather_service import weather_service
from backend.app.geocoding_service import resolve_location_identity

EXPECTED_CELL_COUNT = 3156


@pytest.fixture
def client():
    return TestClient(app)


def test_frozen_model_hashes_and_cell_count():
    """Verify that Model A, Model B, and Section 34 GeoJSON are strictly untouched."""
    assert MODEL_A_PATH.exists(), f"Model A missing at {MODEL_A_PATH}"
    assert MODEL_B_PATH.exists(), f"Model B missing at {MODEL_B_PATH}"
    assert GEOJSON_SURFACE_PATH.exists(), f"GeoJSON missing at {GEOJSON_SURFACE_PATH}"

    sha_a = hashlib.sha256(MODEL_A_PATH.read_bytes()).hexdigest()
    assert sha_a == EXPECTED_MODEL_A_SHA256, f"Model A hash mismatch: {sha_a}"

    sha_b = hashlib.sha256(MODEL_B_PATH.read_bytes()).hexdigest()
    assert sha_b == EXPECTED_MODEL_B_SHA256, f"Model B hash mismatch: {sha_b}"

    with open(GEOJSON_SURFACE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert len(data.get("features", [])) == EXPECTED_CELL_COUNT, (
        f"Expected {EXPECTED_CELL_COUNT} cells, found {len(data.get('features', []))}"
    )


def test_weather_provider_status_endpoint(client):
    """Verify GET /api/v1/weather/provider-status returns operational diagnostics."""
    res = client.get("/api/v1/weather/provider-status")
    assert res.status_code == 200
    data = res.json()

    assert data["provider_name"] == "Open-Meteo"
    assert data["api_key_required"] is False
    assert data["status"] in ("HEALTHY", "OPERATIONAL", "DEGRADED", "ERROR")
    assert "forecast" in data["endpoint_description"].lower()
    assert "timestamp" in data
    assert isinstance(data["fallback_active"], bool)


def test_weather_service_feature_extraction():
    """Verify that weather_service extracts real metrics conforming to the 10 CHIRPS dynamic features."""
    lat, lon = 25.2744, 91.7323
    resp = weather_service.get_current_weather(lat, lon)

    assert resp is not None
    features = resp.features.model_dump()
    required_features = [
        "rainfall_event_day",
        "ari_3",
        "ari_7",
        "ari_15",
        "ari_30",
        "max_1day_7d",
        "max_3day_30d",
        "rainy_days_7d",
        "rainy_days_15d",
        "rainy_days_30d",
    ]
    for feat in required_features:
        assert feat in features, f"Missing required feature: {feat}"
        assert isinstance(features[feat], (int, float)), f"Feature {feat} is not numeric"
        assert features[feat] >= 0, f"Feature {feat} cannot be negative"

    assert isinstance(resp.current.temperature_c, (int, float))
    assert isinstance(resp.current.relative_humidity_pct, (int, float))
    assert isinstance(resp.current.precipitation_mm, (int, float))
    assert isinstance(resp.current.wind_speed_10m_kmh, (int, float))
    assert isinstance(resp.dynamic_trigger_p_d, (int, float))


def test_coordinate_risk_rain_windows_and_outlook(client):
    """Verify coordinate risk intelligence returns 5-point rain windows and 6-milestone risk outlook."""
    lat, lon = 25.5788, 91.8933
    res = client.get(f"/api/v1/risk/coordinate?latitude={lat}&longitude={lon}&force_refresh=true")
    assert res.status_code == 200
    data = res.json()

    rain_windows = data.get("rain_windows")
    assert rain_windows is not None, "rain_windows must be present in coordinate response"
    for key in [
        "past_1h_mm", "past_3h_mm", "past_6h_mm", "past_12h_mm", "past_24h_mm",
        "next_1h_mm", "next_3h_mm", "next_6h_mm", "next_12h_mm", "next_24h_mm"
    ]:
        assert key in rain_windows, f"Missing window: {key}"
        val = rain_windows[key]
        assert isinstance(val, (int, float)) and val >= 0, f"Invalid value for {key}: {val}"

    risk_outlook = data.get("risk_outlook")
    assert risk_outlook is not None, "risk_outlook must be present"
    assert len(risk_outlook) == 6, f"Expected 6 milestones, got {len(risk_outlook)}"

    expected_offsets = [0, 1, 3, 6, 12, 24]
    p_s = data.get("static_susceptibility_p_s", 0.0)

    for i, m in enumerate(risk_outlook):
        assert m["hour_offset"] == expected_offsets[i]
        assert "time" in m
        assert isinstance(m["dynamic_trigger_p_d"], (int, float))
        assert isinstance(m["coupled_risk"], (int, float))
        expected_coupled = round(p_s * m["dynamic_trigger_p_d"], 4)
        assert abs(m["coupled_risk"] - expected_coupled) < 1e-3, (
            f"Milestone {m['label']}: coupled_risk {m['coupled_risk']} != {expected_coupled}"
        )
        assert "Green" in m["alert_tier_code"] or "Yellow" in m["alert_tier_code"] or "Orange" in m["alert_tier_code"] or "Red" in m["alert_tier_code"] or m["alert_tier_code"] in ("GREEN", "YELLOW", "ORANGE", "RED")
        assert m["alert_color_hex"].startswith("#")


def test_risk_coordinate_outlook_endpoint(client):
    """Verify dedicated GET /api/v1/risk/coordinate/outlook endpoint."""
    lat, lon = 25.2972, 91.5828
    res = client.get(f"/api/v1/risk/coordinate/outlook?latitude={lat}&longitude={lon}")
    assert res.status_code == 200
    data = res.json()

    assert data["latitude"] == pytest.approx(lat, abs=1e-4)
    assert data["longitude"] == pytest.approx(lon, abs=1e-4)
    assert len(data["milestones"]) == 6
    assert isinstance(data["current_coupled_risk"], (int, float))
    assert isinstance(data["peak_risk_score"], (int, float))
    assert data["peak_hour_offset"] in [0, 1, 3, 6, 12, 24]
    assert data["trend_classification"] in ("RISING_HAZARD", "FALLING_HAZARD", "STABLE")
    assert "scientific_disclaimer" in data


def test_geocoding_non_generic_locality():
    """Verify coordinates resolve to specific locality or distance-referenced terrain cell."""
    identity = resolve_location_identity(25.4500, 91.3500)
    locality = identity["locality"]
    assert "Block" not in locality or "Selected terrain cell near" in locality
    assert identity["state"] == "Meghalaya"
    assert identity["country"] == "India"
