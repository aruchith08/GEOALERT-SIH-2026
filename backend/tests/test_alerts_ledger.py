"""
backend/tests/test_alerts_ledger.py
===================================
Integration tests for the Hazard Alert Episode Tracker & Validation Ledger.
"""

import pytest
from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_get_alerts_list():
    """Verify GET /api/v1/alerts returns list of alert episodes."""
    res = client.get("/api/v1/alerts")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    first = data[0]
    assert "id" in first
    assert "location_name" in first
    assert "status" in first
    assert "trigger_risk_score" in first
    assert "static_susceptibility_p_s" in first
    assert "dynamic_trigger_p_d" in first
    assert "conditions_snapshot" in first
    assert "validation_status" in first


def test_get_alerts_summary():
    """Verify GET /api/v1/alerts/summary returns accurate aggregate statistics."""
    res = client.get("/api/v1/alerts/summary")
    assert res.status_code == 200
    data = res.json()

    assert "total_episodes" in data
    assert "active_red_alerts" in data
    assert "resolved_episodes" in data
    assert "confirmed_landslides" in data
    assert "empirical_precision_pct" in data
    assert "average_duration_formatted" in data
    assert data["total_episodes"] >= 1


def test_simulate_alert_and_validate_workflow():
    """Verify full alert lifecycle: simulation, detail fetch, and ground-truth validation."""
    sim_res = client.post("/api/v1/alerts/simulate", json={
        "location": "Test Sohra Escarpment Cut",
        "district": "East Khasi Hills",
        "latitude": 25.2702,
        "longitude": 91.7323
    })
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    alert_id = sim_data["id"]
    assert sim_data["status"] == "ACTIVE"
    assert sim_data["alert_tier"] == "Level 4: Red"
    assert sim_data["trigger_risk_score"] >= 0.35
    assert "conditions_snapshot" in sim_data
    assert sim_data["conditions_snapshot"]["slope_deg"] == 33.5

    # 2. Fetch single alert
    detail_res = client.get(f"/api/v1/alerts/{alert_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == alert_id
    assert detail_data["validation_status"] == "PENDING"

    # 3. Submit ground-truth validation
    val_res = client.post(f"/api/v1/alerts/{alert_id}/validate", json={
        "validation_status": "CONFIRMED_LANDSLIDE",
        "notes": "Field team confirmed 15m rotational slip blocking secondary road.",
        "validated_by": "Senior Geotechnical Engineer"
    })
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["validation_status"] == "CONFIRMED_LANDSLIDE"
    assert "15m rotational slip" in val_data["validation_notes"]
    assert val_data["validated_by"] == "Senior Geotechnical Engineer"


def test_validate_invalid_status_rejects():
    """Verify that unsupported validation statuses are rejected with 400."""
    res = client.post("/api/v1/alerts/ALERT-20260714-SOHRA01/validate", json={
        "validation_status": "UNKNOWN_BOGUS_STATUS",
        "notes": "Should fail"
    })
    assert res.status_code == 400


def test_get_alerts_realtime_vs_demo_filter():
    """Verify clean segregation between real-time surveillance and demo/calibration archive."""
    # 1. Fetch demo archive
    demo_res = client.get("/api/v1/alerts?is_demo=true")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    assert isinstance(demo_data, list)
    assert len(demo_data) >= 3
    for ep in demo_data:
        assert ep["is_demo"] is True
        assert ep["source"] in ["HISTORICAL_CALIBRATION", "SIMULATION"]

    # 2. Fetch realtime ledger
    real_res = client.get("/api/v1/alerts?is_demo=false")
    assert real_res.status_code == 200
    real_data = real_res.json()
    assert isinstance(real_data, list)
    for ep in real_data:
        assert ep["is_demo"] is False
        assert ep["source"] == "REALTIME"


def test_alerts_summary_realtime_vs_demo():
    """Verify summary metrics distinguish between active surveillance and calibration."""
    real_sum = client.get("/api/v1/alerts/summary?is_demo=false")
    assert real_sum.status_code == 200
    real_data = real_sum.json()
    assert real_data["is_demo"] is False
    assert real_data["surveillance_status"] == "ACTIVE_SURVEILLANCE"
    assert real_data["monitored_cells_count"] == 3156
    assert real_data["feature_activated_date"] == "2026-10-06"

    demo_sum = client.get("/api/v1/alerts/summary?is_demo=true")
    assert demo_sum.status_code == 200
    demo_data = demo_sum.json()
    assert demo_data["is_demo"] is True
    assert demo_data["total_episodes"] >= 3
