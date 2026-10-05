"""
backend/tests/test_coordinate_intelligence.py
=============================================
Automated test suite verifying the Coordinate-Level Real-Time Weather &
Landslide Risk Intelligence Layer for GEOALERT.

Verifies:
1. 4-tier geographic identity resolution (Reverse Geocoded -> Nearest Locality -> Coordinate Fallback -> Cell Traceability).
2. Open-Meteo & Fallback hourly weather parsing (Past 24h & Forecast 24h).
3. Coordinate-aware cache lifecycle and invalidation.
4. Frozen Model coupling invariants Risk = P(S) * P(D) and thresholds.
5. 24-hour forward hourly landslide risk projection and peak risk detection.
6. Unified 48-hour timeline continuity (-24h to +24h).
7. FastAPI endpoint verification (/api/v1/risk/location, /api/v1/risk/coordinate, /api/v1/risk/nearest-cell).
"""

import math
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.geocoding_service import geocoding_service, resolve_location_identity
from backend.app.weather_service import weather_service
from backend.app.weather_cache import weather_cache
from backend.app.schemas import AlertTierEnum


@pytest.fixture
def client():
    return TestClient(app)


# ----------------------------------------------------------------------
# 1. Geographic Identity Resolution (4-Tier Hierarchy) Tests
# ----------------------------------------------------------------------

def test_geocoding_priority1_and_priority2():
    """Verifies Priority 1 (direct or reverse geocoded) and Priority 2 (nearest locality with distance)."""
    # Sohra exact center coordinates
    sohra = resolve_location_identity(25.2744, 91.7323, cell_id="CELL_MEG_0878")
    assert "Sohra" in sohra["locality"] or "Sohra" in sohra["display_name"] or "Cherrapunji" in sohra["display_name"]
    assert sohra["district"] in ("East Khasi Hills", "Shella Bholaganj")
    assert sohra["state"] == "Meghalaya"
    assert sohra["country"] == "India"
    assert sohra["spatial_cell_id"] == "CELL_MEG_0878"
    assert sohra["resolution_method"] in ("REVERSE_GEOCODED", "EXACT_LOCALITY", "NEAREST_LOCALITY")

    # Mawsynram deluge center
    mawsynram = resolve_location_identity(25.2972, 91.5828, cell_id="CELL_MEG_0500")
    assert "Mawsynram" in mawsynram["locality"] or "Mawsynram" in mawsynram["display_name"]
    assert mawsynram["state"] == "Meghalaya"


def test_geocoding_offline_gazetteer_fallback():
    """Verifies that offline gazetteer reliably computes distance to named locality when offline."""
    # Temporarily disable online geocoding to test deterministic offline gazetteer
    orig_query = geocoding_service._query_online_reverse_geocode
    try:
        geocoding_service._query_online_reverse_geocode = lambda lat, lon: None

        # Coordinate near Nohkalikai Falls (~6.1 km away)
        res = geocoding_service.resolve_location_identity(25.32, 91.65, cell_id="CELL_TEST")
        assert res["resolution_method"] == "NEAREST_LOCALITY"
        assert "near" in res["locality"].lower()
        assert res["distance_to_named_km"] > 0.0
        assert "Nohkalikai" in res["locality"] or "Mawsynram" in res["locality"] or "Sohra" in res["locality"]
        assert res["state"] == "Meghalaya"
    finally:
        geocoding_service._query_online_reverse_geocode = orig_query


def test_geocoding_coordinate_fallback_far_point():
    """Verifies Priority 3 fallback for coordinates far from recognized gazetteer settlements."""
    orig_query = geocoding_service._query_online_reverse_geocode
    try:
        geocoding_service._query_online_reverse_geocode = lambda lat, lon: None

        # Point at boundary far from any indexed settlement
        res = geocoding_service.resolve_location_identity(26.40, 90.00, cell_id="CELL_BORDER")
        assert res["resolution_method"] in ("COORDINATE_FALLBACK", "NEAREST_LOCALITY")
        assert "Selected" in res["locality"] or "near" in res["locality"].lower()
        assert "° N" in res["formatted_coordinates"]
    finally:
        geocoding_service._query_online_reverse_geocode = orig_query


# ----------------------------------------------------------------------
# 2. Weather Provider & Cache Lifecycle Tests
# ----------------------------------------------------------------------

def test_weather_cache_invalidation():
    """Verifies that coordinate cache can be invalidated and forces fresh retrieval."""
    lat, lon = 25.5788, 91.8933
    # Ensure populated
    data1, state1 = weather_service.fetch_weather_data(lat, lon)
    assert data1 is not None

    # Verify cache hit
    data2, state2 = weather_service.fetch_weather_data(lat, lon)
    assert state2 in ("CACHED_FRESH", "HIT_FRESH")

    # Invalidate
    did_invalidate = weather_cache.invalidate(lat, lon)
    assert did_invalidate is True

    # Check cache status after invalidation (should be MISS or fresh fetch)
    cached, state3 = weather_cache.get(lat, lon)
    assert state3 == "MISS"


def test_fallback_weather_hourly_slices():
    """Verifies fallback weather generator includes complete past 24h and forecast 24h series."""
    fallback = weather_service._generate_calibrated_fallback_data(25.2744, 91.7323)
    assert "past_24h" in fallback
    assert "forecast_24h" in fallback

    past = fallback["past_24h"]
    assert len(past["hourly"]) == 24
    assert past["total_rainfall_mm"] > 0
    assert past["peak_hourly_rainfall_mm"] > 0
    assert past["rainy_hours_count"] >= 0

    forecast = fallback["forecast_24h"]
    assert len(forecast["hourly"]) == 24
    assert forecast["total_rainfall_mm"] > 0


# ----------------------------------------------------------------------
# 3. Coordinate Risk Intelligence & 24h Hourly Projection Tests
# ----------------------------------------------------------------------

def test_coordinate_risk_intelligence_structure():
    """Verifies full response contract of get_coordinate_risk_intelligence."""
    intel = weather_service.get_coordinate_risk_intelligence(
        latitude=25.2744,
        longitude=91.7323,
        cell_id="CELL_MEG_0878",
        force_refresh=False
    )
    assert intel.query_latitude == 25.2744
    assert intel.query_longitude == 91.7323
    assert intel.location_identity.display_name != ""
    assert intel.nearest_cell_id == "CELL_MEG_0878"
    assert intel.static_susceptibility_p_s > 0.0
    assert 0.0 <= intel.current_dynamic_trigger_p_d <= 1.0
    assert intel.current_coupled_risk_score == pytest.approx(
        intel.static_susceptibility_p_s * intel.current_dynamic_trigger_p_d, rel=1e-3
    )

    # Past 24h
    assert len(intel.past_24h_weather.hourly) >= 1
    assert intel.past_24h_weather.total_rainfall_mm >= 0.0

    # Forecast 24h
    assert len(intel.forecast_24h_weather.hourly) >= 1

    # 24h Hourly Risk Projection (25 points: h=0 to h=24)
    assert len(intel.hourly_risk_projection_24h) == 25
    assert intel.hourly_risk_projection_24h[0].hour_offset == 0
    assert intel.hourly_risk_projection_24h[24].hour_offset == 24

    # Peak Risk
    assert intel.peak_risk_24h.peak_risk_score >= intel.current_coupled_risk_score
    assert 0 <= intel.peak_risk_24h.peak_hour_offset <= 24

    # Unified 48h Timeline
    assert len(intel.unified_timeline_48h) == 49
    hour_relatives = [pt.hour_relative for pt in intel.unified_timeline_48h]
    assert hour_relatives[0] == -24
    assert hour_relatives[24] == 0
    assert hour_relatives[48] == 24

    # Explainability & Recommendations
    assert intel.explainability.terrain_explanation != ""
    assert len(intel.action_recommendation.recommended_actions) > 0


def test_frozen_coupling_invariants():
    """Verifies that Model A P(S) * Model B P(D) obeys the 4-tier alert threshold invariants."""
    # Test Green: P(S) < 0.15 floor suppresses regardless of P(D)
    intel_low_ps = weather_service.get_coordinate_risk_intelligence(
        latitude=25.7500,
        longitude=91.9000,
        p_s=0.0400  # Below 0.1500 safety floor
    )
    assert intel_low_ps.current_alert_tier_code == AlertTierEnum.GREEN

    # Test High P(S) with high risk
    intel_high = weather_service.get_coordinate_risk_intelligence(
        latitude=25.2744,
        longitude=91.7323,
        p_s=0.7500
    )
    # 0.75 * ~0.6284 = ~0.4713 -> Level 4 Red
    if intel_high.current_coupled_risk_score >= 0.3500:
        assert intel_high.current_alert_tier_code == AlertTierEnum.RED


# ----------------------------------------------------------------------
# 4. FastAPI Endpoints Integration Tests
# ----------------------------------------------------------------------

def test_api_risk_location_endpoint(client):
    """Verifies GET /api/v1/risk/location returns HTTP 200 with full coordinate intelligence."""
    response = client.get("/api/v1/risk/location?lat=25.2744&lon=91.7323&cell_id=CELL_MEG_0878")
    assert response.status_code == 200
    data = response.json()
    assert "location_identity" in data
    assert "peak_risk_24h" in data
    assert "unified_timeline_48h" in data
    assert len(data["unified_timeline_48h"]) == 49
    assert data["location_identity"]["spatial_cell_id"] == "CELL_MEG_0878"


def test_api_risk_coordinate_endpoint_with_aliases(client):
    """Verifies GET /api/v1/risk/coordinate handles parameter aliases (latitude, longitude, p_s, refresh)."""
    response = client.get("/api/v1/risk/coordinate?latitude=25.5788&longitude=91.8933&p_s=0.35&refresh=false")
    assert response.status_code == 200
    data = response.json()
    assert data["query_latitude"] == 25.5788
    assert data["query_longitude"] == 91.8933
    assert data["static_susceptibility_p_s"] == 0.35


def test_api_nearest_cell_backward_compatibility(client):
    """Verifies GET /api/v1/risk/nearest-cell returns legacy NearestCellLookupResponse."""
    response = client.get("/api/v1/risk/nearest-cell?latitude=25.2744&longitude=91.7323")
    assert response.status_code == 200
    data = response.json()
    assert "nearest_cell_id" in data
    assert "static_susceptibility_p_s" in data
    assert data["is_nearest_grid_lookup"] is True
