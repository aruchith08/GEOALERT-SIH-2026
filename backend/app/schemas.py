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


class WeatherStatusResponse(BaseModel):
    mode: str = Field(..., description="LIVE | CACHED_LIVE | DEMO_SCENARIO | FALLBACK | ERROR")
    is_live: bool
    provider: str = "Open-Meteo"
    provider_name: str
    cache_status: str
    status_message: str
    timestamp: str
    data_age_minutes: float = 0.0
    reason: Optional[str] = None
    cache_stats: Optional[Dict[str, Any]] = None


class DataProvenance(BaseModel):
    provider: str
    data_mode: str = Field(..., description="LIVE | CACHED_LIVE | DEMO_SCENARIO | FALLBACK | ERROR")
    is_live: bool
    source_timestamp: str
    retrieved_at: str
    data_quality: str = "HIGH_CONFIDENCE"
    feature_completeness: str = "FEATURE_DATA_COMPLETE"


class ForecastIntervals(BaseModel):
    now_mm: float
    next_6h_mm: float
    next_12h_mm: float
    next_24h_mm: float
    next_3d_mm: float
    next_7d_mm: float


class CurrentWeatherCondition(BaseModel):
    temperature_c: float
    relative_humidity_pct: float
    precipitation_mm: float
    wind_speed_10m_kmh: float = 12.0
    weather_code: int
    weather_description: str
    time: str


class DailyWeatherPoint(BaseModel):
    date: str
    precipitation_sum_mm: float
    weather_code: int
    weather_description: str
    temperature_max_c: Optional[float] = None
    temperature_min_c: Optional[float] = None


class WeatherCurrentResponse(BaseModel):
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    elevation_m: float
    provider: str
    cache_status: str
    timestamp: str
    current: CurrentWeatherCondition
    features: DynamicFeaturesInput
    dynamic_trigger_p_d: float
    provenance: Optional[DataProvenance] = None
    intervals: Optional[ForecastIntervals] = None



class WeatherForecastResponse(BaseModel):
    latitude: float
    longitude: float
    elevation_m: float
    provider: str
    cache_status: str
    timestamp: str
    daily_forecast: List[DailyWeatherPoint]


class WeatherHistoryResponse(BaseModel):
    latitude: float
    longitude: float
    elevation_m: float
    provider: str
    cache_status: str
    timestamp: str
    daily_history: List[DailyWeatherPoint]


class RiskForecastPoint(BaseModel):
    date: str
    day_offset: int
    day_name: str
    forecast_rain_mm: float
    dynamic_trigger_p_d: float
    coupled_risk_score: float
    alert_tier_code: AlertTierEnum
    alert_tier_name: str
    alert_color_hex: str
    warning_summary: str
    dynamic_features: DynamicFeaturesInput


class RiskForecastRequest(BaseModel):
    latitude: float = Field(..., ge=24.5, le=26.5, description="WGS84 Latitude of location (Meghalaya)")
    longitude: float = Field(..., ge=89.0, le=93.5, description="WGS84 Longitude of location (Meghalaya)")
    cell_id: Optional[str] = Field(None, description="Optional Section 34 cell ID")
    p_s: Optional[float] = Field(None, ge=0.0, le=1.0, description="Pre-computed Model A static susceptibility")
    location_name: Optional[str] = Field(None, description="Optional landmark or village name")


class RiskForecastResponse(BaseModel):
    query_latitude: float
    query_longitude: float
    nearest_cell_id: Optional[str] = None
    location_name: Optional[str] = None
    static_susceptibility_p_s: float
    current_dynamic_trigger_p_d: float
    current_coupled_risk_score: float
    current_alert_tier_code: AlertTierEnum
    current_alert_tier_name: str
    current_alert_color_hex: str
    timeline: List[RiskForecastPoint]
    peak_day: str
    peak_day_offset: int
    peak_risk_score: float
    peak_alert_tier: str
    overall_trend: str
    explainability: ExplainabilityBreakdown
    weather_provider: str
    cache_status: str
    timestamp: str


class DataConfidenceIndicator(BaseModel):
    overall_confidence: str = Field("HIGH", description="HIGH | MEDIUM | LOW")
    data_source: str = "Open-Meteo NWP Global Model"
    last_updated_minutes_ago: int = 0
    coverage_type: str = "12-Station Regional Meteorological Mesh"
    forecast_horizon_hours: int = 168
    confidence_rationale: str = "30-day antecedent observation window complete; 7-day numerical forecast integrated."


class ActionRecommendation(BaseModel):
    risk_level: str
    terrain_susceptibility_tier: str
    rainfall_trigger_status: str
    operational_protocol: str = "RESEARCH_AND_ADVISORY"
    recommended_actions: List[str]
    mandatory_evacuation: bool = False
    advisory_notice: str = "Advisory intelligence for research and disaster planning. Not a statutory civil evacuation mandate."


class LocationWeatherResponse(BaseModel):
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    nearest_cell_id: Optional[str] = None
    elevation_m: float
    current: CurrentWeatherCondition
    recent_accumulation: Dict[str, float]
    intervals: ForecastIntervals
    features: DynamicFeaturesInput
    dynamic_trigger_p_d: float
    provenance: DataProvenance
    confidence: DataConfidenceIndicator
    timestamp: str


class WeatherRegionItem(BaseModel):
    station_id: str
    station_name: str
    spatial_block: str
    geomorphic_zone: str
    latitude: float
    longitude: float
    elevation_m: float
    current_temp_c: float
    current_rain_mm: float
    wind_speed_kmh: float
    dynamic_trigger_p_d: float
    weather_description: str
    is_live: bool


class WeatherRegionsResponse(BaseModel):
    mode: str = "LIVE"
    provider: str = "Open-Meteo"
    station_count: int
    timestamp: str
    regions: List[WeatherRegionItem]


class LiveLocationRiskResponse(BaseModel):
    latitude: float
    longitude: float
    cell_id: Optional[str] = None
    location_name: str
    slope_deg: float
    elevation_m: float
    static_susceptibility_p_s: float
    dynamic_trigger_p_d: float
    coupled_risk_score: float
    alert_tier_code: AlertTierEnum
    alert_tier_name: str
    alert_color_hex: str
    current_rain_mm: float
    recent_rain_7d_mm: float
    forecast_rain_24h_mm: float
    explainability: ExplainabilityBreakdown
    action_intelligence: ActionRecommendation
    data_confidence: DataConfidenceIndicator
    provenance: DataProvenance
    timestamp: str


class LiveGridResponse(BaseModel):
    mode: str = "LIVE"
    provider: str = "Open-Meteo"
    timestamp: str
    total_cells: int
    station_count: int
    provenance: DataProvenance
    summary: Dict[str, Any]
    cells: Optional[List[Dict[str, Any]]] = None


class HourlyWeatherPoint(BaseModel):
    time: str
    precipitation_mm: float
    rain_mm: float
    temperature_c: float
    relative_humidity_pct: float
    wind_speed_kmh: float
    wind_direction_deg: float = 0.0
    surface_pressure_hpa: float = 1013.0
    weather_code: int = 0
    weather_description: str = "Variable"


class WeatherHistory24h(BaseModel):
    total_rainfall_mm: float
    peak_hourly_rainfall_mm: float
    rainy_hours_count: int
    temp_min_c: float
    temp_max_c: float
    relative_humidity_avg_pct: float
    relative_humidity_max_pct: float
    wind_speed_max_kmh: float
    hourly: List[HourlyWeatherPoint] = []


class WeatherForecast24h(BaseModel):
    total_rainfall_mm: float
    peak_hourly_rainfall_mm: float
    hourly: List[HourlyWeatherPoint] = []


class HourlyRiskPoint(BaseModel):
    time: str
    hour_offset: int
    forecast_hourly_rain_mm: float
    cumulative_forecast_rain_mm: float
    dynamic_trigger_p_d: float
    coupled_risk_score: float
    alert_tier_code: AlertTierEnum
    alert_tier_name: str
    alert_color_hex: str
    weather_description: str
    temperature_c: float


class PeakRisk24h(BaseModel):
    peak_risk_score: float
    peak_hour_offset: int
    peak_time: str
    peak_alert_tier_code: AlertTierEnum
    peak_alert_tier_name: str
    peak_alert_color_hex: str
    peak_p_d: float
    trend_description: str


class LocationIdentity(BaseModel):
    locality: str
    district: str
    state: str = "Meghalaya"
    country: str = "India"
    display_name: str
    full_hierarchy: str
    formatted_coordinates: str
    latitude: float
    longitude: float
    spatial_cell_id: str
    resolution_method: str
    distance_to_named_km: float


class Timeline48hPoint(BaseModel):
    time: str
    period: str  # "PAST_24H" | "CURRENT" | "FORECAST_24H"
    hour_relative: int  # -24 to +24
    precipitation_mm: float
    temperature_c: float
    relative_humidity_pct: float
    wind_speed_kmh: float
    weather_description: str
    weather_code: int
    dynamic_trigger_p_d: Optional[float] = None
    coupled_risk_score: Optional[float] = None
    alert_tier_code: Optional[AlertTierEnum] = None
    alert_color_hex: Optional[str] = None


class CoordinateRiskIntelligenceResponse(BaseModel):
    query_latitude: float
    query_longitude: float
    location_identity: LocationIdentity
    nearest_cell_id: str
    distance_to_cell_center_m: float
    elevation_m: float
    slope_deg: float
    static_susceptibility_p_s: float
    current_dynamic_trigger_p_d: float
    current_coupled_risk_score: float
    current_alert_tier_code: AlertTierEnum
    current_alert_tier_name: str
    current_alert_color_hex: str
    current_weather: CurrentWeatherCondition
    past_24h_weather: WeatherHistory24h
    forecast_24h_weather: WeatherForecast24h
    hourly_risk_projection_24h: List[HourlyRiskPoint]
    peak_risk_24h: PeakRisk24h
    unified_timeline_48h: List[Timeline48hPoint]
    explainability: ExplainabilityBreakdown
    action_recommendation: ActionRecommendation
    data_confidence: DataConfidenceIndicator
    provenance: DataProvenance
    data_age_seconds: int = 0
    timestamp: str
    # Backward-compatibility fields for legacy /api/v1/risk/location consumers
    coupled_risk_score: Optional[float] = None
    geodesic_distance_km: Optional[float] = None
    is_nearest_grid_lookup: Optional[bool] = True
    is_real_time_inference: Optional[bool] = False


