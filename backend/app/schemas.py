"""
backend/app/schemas.py
======================
Pydantic schemas and strict request/response data validation models
for SIH 2026 Risk & Dynamic Rainfall Intelligence Layer.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, field_validator
from enum import Enum


class AlertTierEnum(str, Enum):
    GREEN = "Level 1: Green"
    YELLOW = "Level 2: Yellow"
    ORANGE = "Level 3: Orange"
    RED = "Level 4: Red"


class StaticFeaturesInput(BaseModel):
    elevation: float = Field(..., ge=-100.0, le=4000.0, description="Elevation in meters (SRTM DEM)")
    slope: float = Field(..., ge=0.0, le=90.0, description="Slope in degrees")
    aspect: float = Field(..., ge=0.0, le=360.0, description="Slope aspect in degrees")
    plan_curvature: float = Field(..., description="Planform curvature")
    profile_curvature: float = Field(..., description="Profile curvature")
    twi: float = Field(..., description="Topographic Wetness Index")
    spi: float = Field(..., description="Stream Power Index")
    ndvi_mean: float = Field(..., ge=-1.0, le=1.0, description="Normalized Difference Vegetation Index")
    soil_clay_fraction: float = Field(..., ge=0.0, le=100.0, description="Clay percentage/fraction (0 to 100)")
    soil_sand_fraction: float = Field(..., ge=0.0, le=100.0, description="Sand percentage/fraction (0 to 100)")
    soil_bulk_density: float = Field(..., ge=0.5, le=3.0, description="Soil bulk density (g/cm3)")
    soil_ph: float = Field(..., ge=2.0, le=12.0, description="Soil pH in H2O")
    distance_to_roads: float = Field(..., ge=0.0, le=100000.0, description="Euclidean distance to road network (m)")
    distance_to_streams: float = Field(..., ge=0.0, le=100000.0, description="Euclidean distance to drainage streams (m)")
    landcover_code: str = Field(..., description="Categorical land cover code (e.g. '10', '20', '60')")
    lithology_code: str = Field(..., description="Categorical lithology major code (e.g. 'SS', 'GNS', 'QZT')")

    @field_validator("landcover_code", "lithology_code")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError("Categorical code cannot be empty")
        return str(v).strip()


class DynamicFeaturesInput(BaseModel):
    rainfall_event_day: float = Field(..., ge=0.0, le=1500.0, description="Event day rainfall (mm)")
    ari_3: float = Field(..., ge=0.0, le=3000.0, description="3-day Antecedent Rainfall Index (mm)")
    ari_7: float = Field(..., ge=0.0, le=4000.0, description="7-day Antecedent Rainfall Index (mm)")
    ari_15: float = Field(..., ge=0.0, le=6000.0, description="15-day Antecedent Rainfall Index (mm)")
    ari_30: float = Field(..., ge=0.0, le=10000.0, description="30-day Antecedent Rainfall Index (mm)")
    max_1day_7d: float = Field(..., ge=0.0, le=1500.0, description="Maximum 1-day rainfall in past 7 days (mm)")
    max_3day_30d: float = Field(..., ge=0.0, le=3000.0, description="Maximum 3-day rainfall in past 30 days (mm)")
    rainy_days_7d: int = Field(..., ge=0, le=7, description="Number of rainy days in past 7 days")
    rainy_days_15d: int = Field(..., ge=0, le=15, description="Number of rainy days in past 15 days")
    rainy_days_30d: int = Field(..., ge=0, le=30, description="Number of rainy days in past 30 days")


class ExplainabilityBreakdown(BaseModel):
    terrain_susceptibility_level: str
    terrain_explanation: str
    rainfall_trigger_level: str
    rainfall_explanation: str
    coupling_synergy_explanation: str
    actionable_guidance: str


class RiskPredictionRequest(BaseModel):
    latitude: float = Field(..., ge=24.5, le=26.5, description="WGS84 Latitude of location (Meghalaya bounds)")
    longitude: float = Field(..., ge=89.0, le=93.5, description="WGS84 Longitude of location (Meghalaya bounds)")
    location_name: Optional[str] = Field(None, description="Optional name or landmark description")
    static_features: StaticFeaturesInput
    dynamic_features: DynamicFeaturesInput


class RiskPredictionResponse(BaseModel):
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    static_susceptibility_p_s: float = Field(..., ge=0.0, le=1.0, description="Model A Static Terrain Susceptibility P(S)")
    dynamic_trigger_p_d: float = Field(..., ge=0.0, le=1.0, description="Model B Dynamic Rainfall Trigger Hazard P(D)")
    coupled_risk_score: float = Field(..., ge=0.0, le=1.0, description="Coupled Risk = P(S) * P(D)")
    alert_tier_code: AlertTierEnum
    alert_tier_name: str
    alert_color_hex: str
    recommended_action: str
    explainability: Optional[ExplainabilityBreakdown] = None
    operational_status: str = "EXPERIMENTAL_RETROSPECTIVE_COUPLING"
    is_live_public_warning: bool = False
    timestamp: str


class RainfallStatusResponse(BaseModel):
    mode: str
    is_live: bool
    provider_name: str
    provider_configured: bool
    status_message: str
    timestamp: str


class RainfallCurrentResponse(BaseModel):
    is_live: bool
    provider: str
    scenario_key: Optional[str] = None
    scenario_name: Optional[str] = None
    scenario_description: Optional[str] = None
    latitude: float
    longitude: float
    timestamp: str
    features: DynamicFeaturesInput
    status_notice: Optional[str] = None


class RainfallScenarioRequest(BaseModel):
    scenario_name: Optional[str] = "Custom User Scenario"
    features: DynamicFeaturesInput


class RainfallScenarioResponse(BaseModel):
    scenario_name: str
    dynamic_trigger_p_d: float
    is_live: bool = False
    data_source: str
    features: DynamicFeaturesInput
    timestamp: str


class PointRiskEvaluationRequest(BaseModel):
    cell_id: Optional[str] = None
    p_s: Optional[float] = Field(None, ge=0.0, le=1.0, description="Direct Model A static susceptibility if known")
    static_features: Optional[StaticFeaturesInput] = None
    dynamic_features: DynamicFeaturesInput


class PointRiskEvaluationResponse(BaseModel):
    static_susceptibility_p_s: float
    dynamic_trigger_p_d: float
    coupled_risk_score: float
    alert_tier_code: AlertTierEnum
    alert_tier_name: str
    alert_color_hex: str
    recommended_action: str
    explainability: ExplainabilityBreakdown
    timestamp: str


class HealthCheckResponse(BaseModel):
    status: str
    backend_running: bool
    model_a_loaded: bool
    model_b_loaded: bool
    model_a_hash_verified: bool
    model_b_hash_verified: bool
    spatial_geojson_available: bool
    timestamp: str
    version: str


class NearestCellLookupResponse(BaseModel):
    query_latitude: float
    query_longitude: float
    nearest_cell_id: str
    cell_latitude: float
    cell_longitude: float
    geodesic_distance_km: float
    spatial_block_name: str
    elevation_m: float
    slope_deg: float
    static_susceptibility_p_s: float
    dynamic_trigger_p_d: float
    coupled_risk_score: float
    alert_tier_code: str
    alert_color_hex: str
    recommended_action: str
    explainability: Optional[ExplainabilityBreakdown] = None
    is_nearest_grid_lookup: bool = True
    is_real_time_inference: bool = False
