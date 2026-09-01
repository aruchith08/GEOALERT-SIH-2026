"""
backend/app/routes/spatial.py
=============================
Serves Section 34 Regional GeoJSON surface and block-level summary tables.
"""

import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Response
import pandas as pd

from backend.app.config import GEOJSON_SURFACE_PATH, BLOCK_SUMMARY_PATH, SECTION34_SUMMARY_PATH

router = APIRouter(tags=["Spatial Surface"])

_cached_geojson: Optional[Dict[str, Any]] = None


def get_cached_geojson() -> Dict[str, Any]:
    global _cached_geojson
    if _cached_geojson is None:
        if not GEOJSON_SURFACE_PATH.exists():
            raise HTTPException(status_code=500, detail="Section 34 regional GeoJSON artifact not found.")
        with open(GEOJSON_SURFACE_PATH, "r", encoding="utf-8") as f:
            _cached_geojson = json.load(f)
    return _cached_geojson


@router.get("/risk/grid")
def get_spatial_grid(
    block: Optional[str] = Query(None, description="Filter by spatial block name (e.g. 'East Khasi Block')"),
    alert_tier: Optional[str] = Query(None, description="Filter by alert tier (e.g. 'Red', 'Orange', 'Yellow', 'Green')"),
    min_risk: Optional[float] = Query(None, ge=0.0, le=1.0, description="Minimum coupled risk threshold")
):
    """
    Serves the precomputed Section 34 statewide GeoJSON surface (3,156 cells across Meghalaya).
    Supports optional spatial filtering.
    """
    geojson = get_cached_geojson()

    if not block and not alert_tier and min_risk is None:
        return geojson

    filtered_features = []
    for feat in geojson.get("features", []):
        props = feat.get("properties", {})
        if block and block.lower() not in props.get("block", "").lower():
            continue
        if alert_tier and alert_tier.lower() not in props.get("alert_level", "").lower():
            continue
        if min_risk is not None and props.get("coupled_risk", 0.0) < min_risk:
            continue
        filtered_features.append(feat)

    return {
        "type": "FeatureCollection",
        "crs": geojson.get("crs"),
        "total_features": len(filtered_features),
        "features": filtered_features
    }


@router.get("/risk/grid/summary")
def get_grid_summary():
    """
    Returns district/block-level hazard aggregations from Section 34.
    """
    if not BLOCK_SUMMARY_PATH.exists():
        raise HTTPException(status_code=500, detail="Section 34 block summary CSV not found.")

    df = pd.read_csv(BLOCK_SUMMARY_PATH)
    return {
        "total_blocks": len(df),
        "block_summaries": df.to_dict(orient="records")
    }
