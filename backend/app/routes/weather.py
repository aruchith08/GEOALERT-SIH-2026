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
    RiskForecastResponse,
    LocationWeatherResponse,
    WeatherRegionItem,
    WeatherRegionsResponse,
    LiveLocationRiskResponse,
    LiveGridResponse
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


@router.get("/weather/location", response_model=LocationWeatherResponse)
def get_weather_location(
    latitude: float = Query(25.5788, ge=24.0, le=27.0, description="Latitude (WGS84)"),
    longitude: float = Query(91.8933, ge=89.0, le=94.0, description="Longitude (WGS84)"),
    cell_id: Optional[str] = Query(None, description="Optional Section 34 grid cell ID")
):
    """
    Unified weather, recent accumulation (24h, 3d, 7d, 15d, 30d), and forecast intervals
    for a specific coordinate or Section 34 grid cell.
    """
    try:
        return weather_service.get_location_weather(latitude, longitude, cell_id=cell_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve location weather: {str(exc)}")


@router.get("/weather/regions", response_model=WeatherRegionsResponse)
def get_weather_regions():
    """
    Returns telemetry and derived dynamic trigger P(D) for all 12 representative
    meteorological sampling stations across Meghalaya.
    """
    try:
        from backend.app.weather_mesh import weather_mesh_service
        stations = weather_mesh_service.update_station_telemetry()
        station_defs = {s["station_id"]: s for s in weather_mesh_service.stations}
        return WeatherRegionsResponse(
            mode="LIVE",
            provider="Open-Meteo",
            station_count=len(stations),
            timestamp=weather_mesh_service._last_mesh_update or "",
            regions=[
                WeatherRegionItem(
                    station_id=s_id,
                    station_name=s["station_name"],
                    spatial_block=s["spatial_block"],
                    geomorphic_zone=station_defs.get(s_id, {}).get("geomorphic_zone", s["spatial_block"]),
                    latitude=station_defs.get(s_id, {}).get("latitude", 25.5),
                    longitude=station_defs.get(s_id, {}).get("longitude", 91.8),
                    elevation_m=station_defs.get(s_id, {}).get("elevation_m", 1200.0),
                    current_temp_c=s.get("temperature_c", 20.0),
                    current_rain_mm=s.get("rainfall_today_mm", 0.0),
                    wind_speed_kmh=s.get("wind_speed_kmh", 12.0),
                    dynamic_trigger_p_d=s.get("dynamic_trigger_p_d", 0.35),
                    weather_description=s.get("weather_description", "Partly Cloudy"),
                    is_live=s.get("data_mode") in ("LIVE", "CACHED_LIVE")
                )
                for s_id, s in stations.items()
            ]
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch weather regions: {str(exc)}")


@router.get("/risk/live/grid", response_model=LiveGridResponse)
def get_risk_live_grid():
    """
    Returns live spatially variable P(D)(x,y,t) and coupled risk across the 3,156-cell surface,
    computed via the 12-station meteorological mesh.
    """
    try:
        from backend.app.weather_mesh import weather_mesh_service
        summary = weather_mesh_service.compute_spatially_variable_risk()
        is_live = bool(summary.get("is_live", True))
        data_mode = str(summary.get("data_mode", "LIVE"))
        prov = {
            "provider": "Open-Meteo",
            "data_mode": data_mode,
            "is_live": is_live,
            "source_timestamp": summary.get("timestamp", ""),
            "retrieved_at": summary.get("timestamp", ""),
            "data_quality": "HIGH_CONFIDENCE" if is_live else "FALLBACK_CALIBRATED",
            "feature_completeness": "FEATURE_DATA_COMPLETE"
        }
        return LiveGridResponse(
            mode=data_mode,
            provider="Open-Meteo",
            timestamp=summary.get("timestamp", ""),
            total_cells=summary.get("total_cells", 3156),
            station_count=summary.get("station_count", 12),
            provenance=prov,
            summary=summary
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to compute live grid risk: {str(exc)}")


@router.get("/risk/live/location", response_model=LiveLocationRiskResponse)
def get_risk_live_location(
    latitude: float = Query(25.5788, ge=24.0, le=27.0, description="Latitude (WGS84)"),
    longitude: float = Query(91.8933, ge=89.0, le=94.0, description="Longitude (WGS84)"),
    cell_id: Optional[str] = Query(None, description="Optional Section 34 cell ID"),
    p_s: Optional[float] = Query(None, ge=0.0, le=1.0, description="Optional direct Model A P(S)")
):
    """
    Returns live coupled risk, geotechnical explainability, decision-support recommended actions,
    and data confidence for a specific location or grid cell.
    """
    try:
        return weather_service.get_live_location_risk(
            latitude=latitude,
            longitude=longitude,
            cell_id=cell_id,
            p_s=p_s
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to evaluate live location risk: {str(exc)}")


