"""
backend/app/routes/alerts.py
============================
FastAPI routes for the High-Risk Hazard Episode Verification Ledger.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.alert_tracker_service import alert_tracker_service

router = APIRouter(prefix="/alerts", tags=["Hazard Verification & Alerts Ledger"])


class ValidateAlertRequest(BaseModel):
    validation_status: str = Field(
        ...,
        description="Ground truth outcome: 'CONFIRMED_LANDSLIDE', 'FALSE_POSITIVE', 'MINOR_SLIP', or 'PENDING'"
    )
    notes: Optional[str] = Field(None, description="Detailed field notes, road clearance remarks, or ground observations")
    validated_by: Optional[str] = Field("Field Investigator", description="Name or role of validator")


class SimulateTriggerRequest(BaseModel):
    location: Optional[str] = Field("Sohra Escarpment Cut Slope", description="Location name")
    district: Optional[str] = Field("East Khasi Hills", description="District or block name")
    latitude: Optional[float] = Field(25.2744, description="Latitude")
    longitude: Optional[float] = Field(91.7323, description="Longitude")


@router.get("", response_model=List[Dict[str, Any]])
def get_alerts(
    status: Optional[str] = Query(None, description="Filter by status: 'ACTIVE' or 'RESOLVED'"),
    validation_status: Optional[str] = Query(None, description="Filter by validation: 'PENDING', 'CONFIRMED_LANDSLIDE', 'FALSE_POSITIVE', 'MINOR_SLIP'"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of alerts to return")
):
    """
    Returns high-risk hazard episodes with complete environmental condition snapshots,
    trigger root causes, and active/resolved duration tracking.
    """
    return alert_tracker_service.get_alerts(
        status=status,
        validation_status=validation_status,
        limit=limit
    )


@router.get("/summary", response_model=Dict[str, Any])
def get_alerts_summary():
    """
    Returns empirical performance metrics across all high-risk alerts:
    active red alerts count, confirmed failures, precision rate, and average alert duration.
    """
    return alert_tracker_service.get_summary_statistics()


@router.get("/{alert_id}", response_model=Dict[str, Any])
def get_alert_by_id(alert_id: str):
    """
    Returns the complete black-box condition snapshot and validation history of an alert.
    """
    alert = alert_tracker_service.get_alert_by_id(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert episode '{alert_id}' not found.")
    return alert


@router.post("/{alert_id}/validate", response_model=Dict[str, Any])
def validate_alert(alert_id: str, payload: ValidateAlertRequest):
    """
    Submits user or field investigator ground-truth validation for a high-risk alert.
    """
    try:
        updated = alert_tracker_service.validate_alert(
            episode_id=alert_id,
            validation_status=payload.validation_status,
            notes=payload.notes,
            validated_by=payload.validated_by
        )
        if not updated:
            raise HTTPException(status_code=404, detail=f"Alert episode '{alert_id}' not found.")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/simulate", response_model=Dict[str, Any])
def simulate_trigger_alert(payload: Optional[SimulateTriggerRequest] = None):
    """
    Generates a live simulated high-risk event to test the real-time alert ledger and validation workflow.
    """
    loc = payload.location if payload else "Sohra Escarpment Cut Slope"
    dist = payload.district if payload else "East Khasi Hills"
    lat = payload.latitude if payload else 25.2744
    lon = payload.longitude if payload else 91.7323
    return alert_tracker_service.simulate_trigger_event(
        location=loc,
        district=dist,
        latitude=lat,
        longitude=lon
    )
