"""
backend/tests/test_rainfall_service.py
======================================
Tests for Dynamic Rainfall Intelligence layer, Model B scenario evaluation,
explainability generation, and strict cryptographic governance.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import (
    EXPECTED_MODEL_A_SHA256, EXPECTED_MODEL_B_SHA256,
    GEOJSON_SURFACE_PATH
)
from backend.app.model_service import compute_file_sha256, MODEL_A_PATH, MODEL_B_PATH
import json

client = TestClient(app)


def test_frozen_model_cryptographic_integrity():
    """Verify Model A and Model B SHA-256 hashes are strictly preserved and immutable."""
    hash_a = compute_file_sha256(str(MODEL_A_PATH))
    hash_b = compute_file_sha256(str(MODEL_B_PATH))
    assert hash_a == EXPECTED_MODEL_A_SHA256, f"Model A hash mismatch: {hash_a}"
    assert hash_b == EXPECTED_MODEL_B_SHA256, f"Model B hash mismatch: {hash_b}"


def test_section34_geojson_immutability():
    """Verify Section 34 GeoJSON surface exists and contains exactly 3,156 cells."""
    assert GEOJSON_SURFACE_PATH.exists(), "Section 34 GeoJSON missing!"
    with open(GEOJSON_SURFACE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 3156, f"Expected 3156 cells, got {len(data['features'])}"


def test_rainfall_status_honest_demo_mode():
    """Verify rainfall status reports DEMO_SCENARIO when no live provider is configured."""
    res = client.get("/api/v1/rainfall/status")
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "DEMO_SCENARIO"
    assert data["is_live"] is False
    assert data["provider_configured"] is False
    assert "Live rainfall ingestion not configured" in data["status_message"]


def test_rainfall_current_fallback():
    """Verify rainfall current returns realistic calibrated scenario metrics."""
    res = client.get("/api/v1/rainfall/current?latitude=25.5&longitude=91.5")
    assert res.status_code == 200
    data = res.json()
    assert data["is_live"] is False
    assert "features" in data
    assert "rainfall_event_day" in data["features"]
    assert "ari_3" in data["features"]


def test_rainfall_presets_availability():
    """Verify all 4 standard meteorological presets are available."""
    res = client.get("/api/v1/rainfall/presets")
    assert res.status_code == 200
    data = res.json()
    assert "presets" in data
    assert "dry_season" in data["presets"]
    assert "moderate_monsoon" in data["presets"]
    assert "monsoon_surge_section34" in data["presets"]
    assert "extreme_cloudburst" in data["presets"]


def test_model_b_scenario_dynamic_inference():
    """Verify changing 10 CHIRPS rainfall features dynamically produces different P(D)."""
    # 1. Dry season features -> P(D) should be low
    dry_payload = {
        "scenario_name": "Dry Season Test",
        "features": {
            "rainfall_event_day": 0.0,
            "ari_3": 0.0,
            "ari_7": 0.0,
            "ari_15": 2.0,
            "ari_30": 5.0,
            "max_1day_7d": 0.0,
            "max_3day_30d": 2.0,
            "rainy_days_7d": 0,
            "rainy_days_15d": 1,
            "rainy_days_30d": 2
        }
    }
    res_dry = client.post("/api/v1/rainfall/scenario", json=dry_payload)
    assert res_dry.status_code == 200
    p_d_dry = res_dry.json()["dynamic_trigger_p_d"]

    # 2. Section 34 Monsoon Surge baseline -> P(D) = 0.6284
    surge_payload = {
        "scenario_name": "Monsoon Surge Baseline",
        "features": {
            "rainfall_event_day": 45.0,
            "ari_3": 110.0,
            "ari_7": 180.0,
            "ari_15": 320.0,
            "ari_30": 520.0,
            "max_1day_7d": 65.0,
            "max_3day_30d": 160.0,
            "rainy_days_7d": 5,
            "rainy_days_15d": 11,
            "rainy_days_30d": 18
        }
    }
    res_surge = client.post("/api/v1/rainfall/scenario", json=surge_payload)
    assert res_surge.status_code == 200
    p_d_surge = res_surge.json()["dynamic_trigger_p_d"]

    # P(D) under monsoon surge must be significantly higher than dry season
    assert p_d_surge > p_d_dry, f"Expected P(D)_surge ({p_d_surge}) > P(D)_dry ({p_d_dry})"
    assert p_d_surge == 0.6284
    assert p_d_dry < 0.05


def test_point_risk_evaluation_with_explainability():
    """Verify point risk evaluation computes P(S) * P(D), classifies tier, and generates explainability."""
    payload = {
        "p_s": 0.65,  # High susceptibility slope
        "dynamic_features": {
            "rainfall_event_day": 45.0,
            "ari_3": 110.0,
            "ari_7": 180.0,
            "ari_15": 320.0,
            "ari_30": 520.0,
            "max_1day_7d": 65.0,
            "max_3day_30d": 160.0,
            "rainy_days_7d": 5,
            "rainy_days_15d": 11,
            "rainy_days_30d": 18
        }
    }
    res = client.post("/api/v1/risk/evaluate-point", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["static_susceptibility_p_s"] == 0.65
    assert data["dynamic_trigger_p_d"] == 0.6284
    assert data["coupled_risk_score"] == round(0.65 * 0.6284, 4)
    assert data["alert_tier_code"] == "Level 4: Red"
    assert "explainability" in data
    assert "terrain_susceptibility_level" in data["explainability"]
    assert "rainfall_trigger_level" in data["explainability"]
    assert "coupling_synergy_explanation" in data["explainability"]
