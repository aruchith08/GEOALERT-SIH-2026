"""
backend/app/routes/risk.py
==========================
Single-point risk evaluation endpoint, custom scenario point evaluation,
and nearest-grid cell lookup.
"""

from datetime import datetime, timezone
import math
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
import numpy as np
import pandas as pd

from backend.app.schemas import (
    RiskPredictionRequest, RiskPredictionResponse,
    PointRiskEvaluationRequest, PointRiskEvaluationResponse,
    NearestCellLookupResponse
)
from backend.app.model_service import model_service
from backend.app.risk_engine import risk_engine
from backend.app.config import CSV_SURFACE_PATH

router = APIRouter(tags=["Risk Inference"])

# Cache Section 34 CSV for fast nearest-cell lookup
_cached_grid_df: Optional[pd.DataFrame] = None


def get_grid_df() -> pd.DataFrame:
    global _cached_grid_df
    if _cached_grid_df is None:
        if not CSV_SURFACE_PATH.exists():
            raise HTTPException(status_code=500, detail="Section 34 regional CSV artifact not found.")
        _cached_grid_df = pd.read_csv(CSV_SURFACE_PATH)
    return _cached_grid_df


@router.post("/risk", response_model=RiskPredictionResponse)
def evaluate_risk(request: RiskPredictionRequest):
    """
    Computes static susceptibility P(S), dynamic rainfall hazard P(D),
    coupled risk, alert tier, and explainability for full 16+10 feature payloads.
    """
    try:
        static_dict = request.static_features.model_dump()
        dynamic_dict = request.dynamic_features.model_dump()

        p_s = model_service.predict_static_susceptibility(static_dict)
        p_d = model_service.predict_dynamic_trigger(dynamic_dict)
        coupled_r = risk_engine.compute_coupled_risk(p_s, p_d)
        tier_code, tier_name, color_hex, action_desc = risk_engine.classify_alert_tier(p_s, p_d, coupled_r)
        exp = risk_engine.generate_explainability(p_s, p_d, coupled_r, request.static_features.slope)

        return RiskPredictionResponse(
            latitude=request.latitude,
            longitude=request.longitude,
            location_name=request.location_name,
            static_susceptibility_p_s=round(p_s, 4),
            dynamic_trigger_p_d=round(p_d, 4),
            coupled_risk_score=round(coupled_r, 4),
            alert_tier_code=tier_code,
            alert_tier_name=tier_name,
            alert_color_hex=color_hex,
            recommended_action=action_desc,
            explainability=exp,
            operational_status="EXPERIMENTAL_RETROSPECTIVE_COUPLING",
            is_live_public_warning=False,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference error: {str(e)}")


@router.post("/risk/evaluate-point", response_model=PointRiskEvaluationResponse)
def evaluate_point_risk(request: PointRiskEvaluationRequest):
    """
    Evaluates dynamic coupled risk for an existing grid cell (with known P(S))
    or arbitrary static/dynamic inputs under a new rainfall scenario.
    """
    try:
        if request.p_s is not None:
            p_s = float(request.p_s)
        elif request.static_features is not None:
            static_dict = request.static_features.model_dump()
            p_s = model_service.predict_static_susceptibility(static_dict)
        elif request.cell_id:
            df = get_grid_df()
            match = df[df["grid_cell_id"] == request.cell_id]
            if match.empty:
                raise HTTPException(status_code=404, detail=f"Grid cell {request.cell_id} not found.")
            p_s = float(match.iloc[0]["static_susceptibility_P_S"])
        else:
            raise HTTPException(status_code=400, detail="Must provide p_s, static_features, or cell_id.")

        dynamic_dict = request.dynamic_features.model_dump()
        p_d = model_service.predict_dynamic_trigger(dynamic_dict)
        coupled_r = risk_engine.compute_coupled_risk(p_s, p_d)
        tier_code, tier_name, color_hex, action_desc = risk_engine.classify_alert_tier(p_s, p_d, coupled_r)
        exp = risk_engine.generate_explainability(p_s, p_d, coupled_r)

        return PointRiskEvaluationResponse(
            static_susceptibility_p_s=round(p_s, 4),
            dynamic_trigger_p_d=round(p_d, 4),
            coupled_risk_score=round(coupled_r, 4),
            alert_tier_code=tier_code,
            alert_tier_name=tier_name,
            alert_color_hex=color_hex,
            recommended_action=action_desc,
            explainability=exp,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Evaluation error: {str(e)}")


@router.get("/risk/location", response_model=NearestCellLookupResponse)
def get_nearest_cell_risk(
    latitude: float = Query(..., ge=24.0, le=27.0, description="Latitude"),
    longitude: float = Query(..., ge=89.0, le=94.0, description="Longitude")
):
    """
    Finds the nearest precomputed Section 34 grid cell across Meghalaya and returns its stored risk profile.
    """
    df = get_grid_df()

    # Calculate Haversine distance in km
    lat_rad = math.radians(latitude)
    lon_rad = math.radians(longitude)
    df_lat_rad = np.radians(df["latitude"].values)
    df_lon_rad = np.radians(df["longitude"].values)

    dlat = df_lat_rad - lat_rad
    dlon = df_lon_rad - lon_rad
    a = np.sin(dlat / 2.0)**2 + np.cos(lat_rad) * np.cos(df_lat_rad) * np.sin(dlon / 2.0)**2
    c = 2.0 * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))
    dist_km = 6371.0 * c

    min_idx = int(np.argmin(dist_km))
    nearest_row = df.iloc[min_idx]

    p_s = float(nearest_row["static_susceptibility_P_S"])
    p_d = float(nearest_row["dynamic_trigger_P_D"])
    coupled_r = float(nearest_row["coupled_risk_score"])
    exp = risk_engine.generate_explainability(p_s, p_d, coupled_r, float(nearest_row["slope_deg"]))

    return NearestCellLookupResponse(
        query_latitude=latitude,
        query_longitude=longitude,
        nearest_cell_id=str(nearest_row["grid_cell_id"]),
        cell_latitude=float(nearest_row["latitude"]),
        cell_longitude=float(nearest_row["longitude"]),
        geodesic_distance_km=round(float(dist_km[min_idx]), 3),
        spatial_block_name=str(nearest_row["spatial_block_name"]),
        elevation_m=float(nearest_row["elevation_m"]),
        slope_deg=float(nearest_row["slope_deg"]),
        static_susceptibility_p_s=p_s,
        dynamic_trigger_p_d=p_d,
        coupled_risk_score=coupled_r,
        alert_tier_code=str(nearest_row["alert_tier_code"]),
        alert_color_hex=str(nearest_row["alert_color_hex"]),
        recommended_action=str(nearest_row["recommended_action"]),
        explainability=exp,
        is_nearest_grid_lookup=True,
        is_real_time_inference=False
    )
