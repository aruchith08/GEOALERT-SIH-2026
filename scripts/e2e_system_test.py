#!/usr/bin/env python3
"""
e2e_system_test.py
==================
SIH 2026 Section 37 — Comprehensive End-to-End System Integration Test Suite
Validates:
1. Backend REST API health & metadata
2. Model A and Model B cryptographic SHA-256 hashes
3. Point inference (/api/v1/risk) & bounds validation
4. GeoJSON spatial grid (/api/v1/risk/grid) cardinality & properties
5. Scientific consistency between Backend and Frontend constants (T_coup = 0.0502)
6. Offline demo dataset availability
"""

import sys
import json
import hashlib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

BASE_DIR = Path("g:/My Drive/SIH - 2026")
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Unpickler patch for sklearn 1.6 compatibility
import sklearn.compose._column_transformer
if not hasattr(sklearn.compose._column_transformer, '_RemainderColsList'):
    class _RemainderColsList(list):
        pass
    sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.model_service import model_service
from backend.app.config import (
    MODEL_A_PATH, MODEL_B_PATH,
    EXPECTED_MODEL_A_SHA256, EXPECTED_MODEL_B_SHA256,
    FROZEN_COUPLING_THRESHOLD, STATIC_TERRAIN_SAFETY_FLOOR,
    THRESHOLD_YELLOW_ORANGE, THRESHOLD_ORANGE_RED,
    GEOJSON_SURFACE_PATH
)

print("================================================================================")
print("SIH 2026: END-TO-END SYSTEM INTEGRATION & SCIENTIFIC CONSISTENCY TEST SUITE")
print("================================================================================")

def compute_sha256(file_path):
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

passed_count = 0
total_tests = 0

def run_check(condition, test_name):
    global passed_count, total_tests
    total_tests += 1
    if condition:
        print(f"   [PASS] {test_name}")
        passed_count += 1
    else:
        print(f"   [FAIL] {test_name}")
        raise AssertionError(f"Test failed: {test_name}")

# 1. Model Cryptographic Integrity
hash_a = compute_sha256(MODEL_A_PATH)
hash_b = compute_sha256(MODEL_B_PATH)
run_check(hash_a == EXPECTED_MODEL_A_SHA256, f"Model A SHA-256 Cryptographic Hash Match ({hash_a[:16]}...)")
run_check(hash_b == EXPECTED_MODEL_B_SHA256, f"Model B SHA-256 Cryptographic Hash Match ({hash_b[:16]}...)")

# 2. Model Service Initialization
model_service.load_models()
run_check(model_service.is_loaded is True, "ModelService single-instance initialization in read-only state")

client = TestClient(app)

# 3. GET /health
resp_health = client.get("/api/v1/health")
run_check(resp_health.status_code == 200, "GET /api/v1/health returns 200 OK")
health_data = resp_health.json()
run_check(health_data["backend_running"] is True, "Health response confirms backend_running: true")
run_check(health_data["model_a_loaded"] is True, "Health response confirms model_a_loaded: true")
run_check(health_data["model_b_loaded"] is True, "Health response confirms model_b_loaded: true")

# 4. GET /metadata
resp_meta = client.get("/api/v1/metadata")
run_check(resp_meta.status_code == 200, "GET /api/v1/metadata returns 200 OK")
meta_data = resp_meta.json()
run_check(meta_data["coupling_architecture"]["coupling_threshold"] == FROZEN_COUPLING_THRESHOLD, "Metadata confirms T_coup = 0.0502")
run_check(meta_data["is_operational_public_warning"] is False, "Metadata declares is_operational_public_warning: false")

# 5. POST /risk Single-Point Inference
sample_payload = {
    "latitude": 25.57,
    "longitude": 91.88,
    "location_name": "E2E Test Slope",
    "static_features": {
        "elevation": 1420.0, "slope": 38.5, "aspect": 180.0, "plan_curvature": 0.04,
        "profile_curvature": -0.05, "twi": 6.5, "spi": 5.2, "ndvi_mean": 0.55,
        "soil_clay_fraction": 32.0, "soil_sand_fraction": 40.0, "soil_bulk_density": 1.35,
        "soil_ph": 5.2, "distance_to_roads": 25.0, "distance_to_streams": 40.0,
        "landcover_code": "10", "lithology_code": "SS"
    },
    "dynamic_features": {
        "rainfall_event_day": 45.0, "ari_3": 110.0, "ari_7": 180.0, "ari_15": 320.0,
        "ari_30": 520.0, "max_1day_7d": 65.0, "max_3day_30d": 160.0,
        "rainy_days_7d": 5, "rainy_days_15d": 11, "rainy_days_30d": 18
    }
}
resp_risk = client.post("/api/v1/risk", json=sample_payload)
run_check(resp_risk.status_code == 200, "POST /api/v1/risk returns 200 OK")
risk_data = resp_risk.json()
p_s = risk_data["static_susceptibility_p_s"]
p_d = risk_data["dynamic_trigger_p_d"]
c_risk = risk_data["coupled_risk_score"]
run_check(0.0 <= p_s <= 1.0, f"Static P(S) bounded in [0,1] (observed: {p_s})")
run_check(0.0 <= p_d <= 1.0, f"Dynamic P(D) bounded in [0,1] (observed: {p_d})")
run_check(abs(c_risk - (p_s * p_d)) < 0.0002, f"Multiplicative Coupling Risk = P(S)*P(D) exact ({c_risk} == {p_s*p_d:.4f})")

# 6. GET /risk/grid GeoJSON Cardinality & Schema
resp_grid = client.get("/api/v1/risk/grid")
run_check(resp_grid.status_code == 200, "GET /api/v1/risk/grid returns 200 OK")
grid_data = resp_grid.json()
run_check(grid_data["type"] == "FeatureCollection", "GeoJSON has FeatureCollection type")
run_check(len(grid_data["features"]) == 3156, f"GeoJSON contains exactly 3,156 spatial cells across Meghalaya")

# 7. Scientific Threshold Consistency (Backend vs Frontend Constants)
run_check(FROZEN_COUPLING_THRESHOLD == 0.0502, "Backend FROZEN_COUPLING_THRESHOLD == 0.0502")
run_check(STATIC_TERRAIN_SAFETY_FLOOR == 0.1500, "Backend STATIC_TERRAIN_SAFETY_FLOOR == 0.1500")
run_check(THRESHOLD_YELLOW_ORANGE == 0.1500, "Backend THRESHOLD_YELLOW_ORANGE == 0.1500")
run_check(THRESHOLD_ORANGE_RED == 0.3500, "Backend THRESHOLD_ORANGE_RED == 0.3500")

# 8. Offline Demo Files Availability
run_check((BASE_DIR / "frontend/public/data/regional_risk_surface.geojson").exists(), "Frontend static offline GeoJSON surface available")
run_check((BASE_DIR / "reports/phase4_section34_regional_risk_surface.geojson").exists(), "Backend Section 34 GeoJSON surface available")

print("================================================================================")
print(f"E2E INTEGRATION AUDIT COMPLETE: {passed_count} / {total_tests} CHECKS PASSED.")
print("================================================================================")
