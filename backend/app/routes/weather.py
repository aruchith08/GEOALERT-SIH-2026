"""
backend/app/routes/weather.py
=============================
FastAPI Routes for Real-Time Meteorological Telemetry, Antecedent Observations,
Numerical Weather Predictions (Open-Meteo), and 7-Day Coupled Risk Forecasting.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas import (
    WeatherStatusResponse,
    WeatherCurrentResponse,
    WeatherForecastResponse,
    WeatherHistoryResponse,
    RiskForecastRequest,
    RiskForecastResponse
)
from backend.app.weather_service import weather_service

router = APIRouter(tags=["Weather & Forecast Intelligence"])


@router.get("/weather/status", response_model=WeatherStatusResponse)
def get_weather_status():
    """
    Returns authentic live telemetry status from Open-Meteo,
    including cache statistics and network operational state.
    """
    return weather_service.get_status()


@router.get("/weather/current", response_model=WeatherCurrentResponse)
def get_current_weather(
    latitude: float = Query(25.5788, ge=24.0, le=27.0, description="Latitude (WGS84)"),
    longitude: float = Query(91.8933, ge=89.0, le=94.0, description="Longitude (WGS84)")
):
    """
    Retrieves real-time weather observations, calculates Model B's 10 dynamic CHIRPS features,
    and returns dynamic rainfall trigger hazard P(D).
    """
    try:
        return weather_service.get_current_weather(latitude, longitude)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve current weather: {str(exc)}")


@router.get("/weather/forecast", response_model=WeatherForecastResponse)
def get_weather_forecast(
    latitude: float = Query(25.5788, ge=24.0, le=27.0, description="Latitude (WGS84)"),
    longitude: float = Query(91.8933, ge=89.0, le=94.0, description="Longitude (WGS84)"),
    days: int = Query(7, ge=1, le=7, description="Forecast horizon in days")
):
    """
    Retrieves daily precipitation sum, weather descriptions, and temperatures for the next 7 days.
    """
    try:
        return weather_service.get_weather_forecast(latitude, longitude, days=days)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve weather forecast: {str(exc)}")


@router.get("/weather/history", response_model=WeatherHistoryResponse)
def get_weather_history(
    latitude: float = Query(25.5788, ge=24.0, le=27.0, description="Latitude (WGS84)"),
    longitude: float = Query(91.8933, ge=89.0, le=94.0, description="Longitude (WGS84)"),
    days: int = Query(14, ge=1, le=30, description="Historical lookback in days")
):
    """
    Retrieves observed daily rainfall history for antecedent soil saturation analysis.
    """
    try:
        return weather_service.get_weather_history(latitude, longitude, days=days)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve weather history: {str(exc)}")


@router.post("/risk/forecast", response_model=RiskForecastResponse)
def post_forecast_risk(request: RiskForecastRequest):
    """
    Computes 7-day forward coupled landslide risk trajectory for a specific location or Section 34 cell.
    Evaluates rolling antecedent moisture + forecast rain through Model B and couples with Model A P(S).
    """
    try:
        return weather_service.evaluate_risk_forecast(
            latitude=request.latitude,
            longitude=request.longitude,
            cell_id=request.cell_id,
            p_s=request.p_s,
            location_name=request.location_name
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Forecast risk evaluation failed: {str(exc)}")


@router.get("/risk/forecast", response_model=RiskForecastResponse)
def get_forecast_risk(
    latitude: float = Query(25.5788, ge=24.0, le=27.0, description="Latitude (WGS84)"),
    longitude: float = Query(91.8933, ge=89.0, le=94.0, description="Longitude (WGS84)"),
    cell_id: Optional[str] = Query(None, description="Optional Section 34 grid cell ID"),
    p_s: Optional[float] = Query(None, ge=0.0, le=1.0, description="Optional precomputed Model A P(S)"),
    location_name: Optional[str] = Query(None, description="Optional landmark or village label")
):
    """
    GET version of 7-day risk forecast endpoint for easy querying and URL-driven dashboard integration.
    """
    try:
        return weather_service.evaluate_risk_forecast(
            latitude=latitude,
            longitude=longitude,
            cell_id=cell_id,
            p_s=p_s,
            location_name=location_name
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Forecast risk evaluation failed: {str(exc)}")


@router.get("/weather/mesh/stations")
def get_mesh_stations():
    """
    Returns telemetry and derived Model B dynamic trigger P(D)
    for all 12 regional meteorological stations across Meghalaya.
    """
    try:
        from backend.app.weather_mesh import weather_mesh_service
        return {
            "timestamp": weather_mesh_service._last_mesh_update or "",
            "stations": weather_mesh_service.update_station_telemetry()
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch mesh stations: {str(exc)}")


@router.get("/weather/mesh/risk-summary")
def get_mesh_risk_summary():
    """
    Computes spatially variable P(D)(x,y,t) and coupled Risk(x,y,t) across all 3,156 cells,
    assigning each cell to its nearest meteorological station.
    """
    try:
        from backend.app.weather_mesh import weather_mesh_service
        return weather_mesh_service.compute_spatially_variable_risk()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to compute spatial mesh risk: {str(exc)}")

