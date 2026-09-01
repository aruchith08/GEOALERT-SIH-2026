"""
backend/tests/test_api.py
=========================
Comprehensive automated test suite for Section 35 Backend Risk API.
Tests model loading, hash verification, single-point inference,
risk coupling, alert classifications, GeoJSON spatial serving, and nearest-cell lookup.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.model_service import model_service
from backend.app.config import (
    EXPECTED_MODEL_A_SHA256, EXPECTED_MODEL_B_SHA256,
    FROZEN_COUPLING_THRESHOLD
)

# Ensure models are loaded before running tests
model_service.load_models()
client = TestClient(app)

SAMPLE_STATIC_FEATURES = {
    "elevation": 1420.0,
    "slope": 38.5,
    "aspect": 180.0,
    "plan_curvature": 0.04,
    "profile_curvature": -0.05,
    "twi": 6.5,
    "spi": 5.2,
    "ndvi_mean": 0.55,
    "soil_clay_fraction": 0.32,
    "soil_sand_fraction": 0.40,
    "soil_bulk_density": 1.35,
    "soil_ph": 5.2,
    "distance_to_roads": 25.0,
    "distance_to_streams": 40.0,
    "landcover_code": "10",
    "lithology_code": "SS"
}

SAMPLE_DYNAMIC_FEATURES = {
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


def test_root_endpoint():
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert "version" in data


def test_health_endpoint():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["backend_running"] is True
    assert data["model_a_loaded"] is True
    assert data["model_b_loaded"] is True
    assert data["model_a_hash_verified"] is True
    assert data["model_b_hash_verified"] is True
    assert data["spatial_geojson_available"] is True
    assert data["status"] == "healthy"


def test_metadata_endpoint():
    resp = client.get("/api/v1/metadata")
    assert resp.status_code == 200
    data = resp.json()
    assert data["models"]["model_a"]["sha256"] == EXPECTED_MODEL_A_SHA256
    assert data["models"]["model_b"]["sha256"] == EXPECTED_MODEL_B_SHA256
    assert data["coupling_architecture"]["coupling_threshold"] == FROZEN_COUPLING_THRESHOLD
    assert data["is_operational_public_warning"] is False


def test_risk_inference_valid():
    payload = {
        "latitude": 25.57,
        "longitude": 91.88,
        "location_name": "East Khasi Test Cut Slope",
        "static_features": SAMPLE_STATIC_FEATURES,
        "dynamic_features": SAMPLE_DYNAMIC_FEATURES
    }
    resp = client.post("/api/v1/risk", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert 0.0 <= data["static_susceptibility_p_s"] <= 1.0
    assert 0.0 <= data["dynamic_trigger_p_d"] <= 1.0
    assert 0.0 <= data["coupled_risk_score"] <= 1.0
    assert data["alert_tier_code"] in ["Level 1: Green", "Level 2: Yellow", "Level 3: Orange", "Level 4: Red"]
    assert data["is_live_public_warning"] is False


def test_risk_inference_out_of_bounds_coords():
    payload = {
        "latitude": 35.0,  # Invalid for Meghalaya
        "longitude": 91.88,
        "static_features": SAMPLE_STATIC_FEATURES,
        "dynamic_features": SAMPLE_DYNAMIC_FEATURES
    }
    resp = client.post("/api/v1/risk", json=payload)
    assert resp.status_code == 422  # Validation Error


def test_risk_inference_missing_feature():
    broken_static = SAMPLE_STATIC_FEATURES.copy()
    del broken_static["slope"]
    payload = {
        "latitude": 25.57,
        "longitude": 91.88,
        "static_features": broken_static,
        "dynamic_features": SAMPLE_DYNAMIC_FEATURES
    }
    resp = client.post("/api/v1/risk", json=payload)
    assert resp.status_code == 422


def test_spatial_grid_endpoint():
    resp = client.get("/api/v1/risk/grid")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 3156
    feat = data["features"][0]
    assert "geometry" in feat
    assert "properties" in feat
    assert "coupled_risk" in feat["properties"]


def test_spatial_grid_filtered():
    resp = client.get("/api/v1/risk/grid?block=East+Khasi")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert data["total_features"] == 419


def test_spatial_grid_summary():
    resp = client.get("/api/v1/risk/grid/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_blocks"] == 5
    assert len(data["block_summaries"]) == 5


def test_nearest_location_lookup():
    resp = client.get("/api/v1/risk/location?latitude=25.5788&longitude=91.8933")
    assert resp.status_code == 200
    data = resp.json()
    assert "nearest_cell_id" in data
    assert data["geodesic_distance_km"] >= 0.0
    assert 0.0 <= data["coupled_risk_score"] <= 1.0
    assert data["is_nearest_grid_lookup"] is True
    assert data["is_real_time_inference"] is False
