"""
backend/app/routes/rainfall.py
==============================
Endpoints for Dynamic Rainfall Intelligence, Scenario Simulation, and Live Provider Status.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas import (
    RainfallStatusResponse,
    RainfallCurrentResponse,
    RainfallScenarioRequest,
    RainfallScenarioResponse,
    DynamicFeaturesInput
)
from backend.app.rainfall_service import rainfall_service
from backend.app.model_service import model_service

router = APIRouter(prefix="/rainfall", tags=["Rainfall Intelligence"])


@router.get("/status", response_model=RainfallStatusResponse)
def get_rainfall_status():
    """
    Returns the honest ingestion mode (LIVE vs DEMO_SCENARIO), provider details, and timestamp.
    """
    return rainfall_service.get_status()


@router.get("/current", response_model=RainfallCurrentResponse)
def get_current_rainfall(
    latitude: float = Query(25.5, ge=24.0, le=27.0, description="Latitude"),
    longitude: float = Query(91.5, ge=89.0, le=94.0, description="Longitude")
):
    """
    Retrieves current rainfall metrics for a given location.
    Gracefully falls back to calibrated demo scenario if live provider is not configured.
    """
    data = rainfall_service.get_current_rainfall(latitude, longitude)
    return RainfallCurrentResponse(
        is_live=data["is_live"],
        provider=data["provider"],
        scenario_key=data.get("scenario_key"),
        scenario_name=data.get("scenario_name"),
        scenario_description=data.get("scenario_description"),
        latitude=data["latitude"],
        longitude=data["longitude"],
        timestamp=data["timestamp"],
        features=DynamicFeaturesInput(**data["features"]),
        status_notice=data.get("status_notice")
    )


@router.get("/presets")
def get_rainfall_presets():
    """
    Returns available standard meteorological presets (Dry Season, Moderate Monsoon, Monsoon Surge, Cloudburst).
    """
    return rainfall_service.get_presets()


@router.post("/scenario", response_model=RainfallScenarioResponse)
def evaluate_rainfall_scenario(request: RainfallScenarioRequest):
    """
    Runs the frozen production Model B on user-supplied 10 CHIRPS rainfall features
    and returns dynamic hazard trigger probability P(D).
    """
    try:
        dynamic_dict = request.features.model_dump()
        p_d = model_service.predict_dynamic_trigger(dynamic_dict)
        return RainfallScenarioResponse(
            scenario_name=request.scenario_name or "Custom Scenario",
            dynamic_trigger_p_d=round(p_d, 4),
            is_live=False,
            data_source="Model B Inference (10 CHIRPS Predictors)",
            features=request.features,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Model B evaluation error: {str(e)}")
