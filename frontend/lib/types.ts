// Strict TypeScript Type Definitions for SIH 2026 Landslide Risk & Rainfall Intelligence Platform

export type AlertTier = 'Level 1: Green' | 'Level 2: Yellow' | 'Level 3: Orange' | 'Level 4: Red';
export type MapLayerType =
  | 'coupled_risk'
  | 'static_susceptibility'
  | 'dynamic_trigger'
  | 'current_rainfall'
  | 'forecast_rainfall'
  | 'forecast_risk';

export interface GridProperties {
  cell_id: string;
  block: string;
  elevation_m: number;
  slope_deg: number;
  p_static: number;
  p_dynamic: number;
  coupled_risk: number;
  alert_level: AlertTier;
  color: string;
  action: string;
}

export interface GridFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: GridProperties;
}

export interface GridGeoJSON {
  type: 'FeatureCollection';
  crs?: {
    type: string;
    properties: { name: string };
  };
  total_features?: number;
  features: GridFeature[];
}

export interface BlockRiskSummary {
  spatial_block_name: string;
  total_grid_cells_N: number;
  mean_static_susceptibility_P_S: number;
  mean_dynamic_trigger_P_D: number;
  mean_coupled_risk_score: number;
  max_coupled_risk_score: number;
  level_1_green_count: number;
  level_2_yellow_count: number;
  level_3_orange_count: number;
  level_4_red_count: number;
  high_risk_percentage: number;
}

export interface DynamicRainfallFeatures {
  rainfall_event_day: number;
  ari_3: number;
  ari_7: number;
  ari_15: number;
  ari_30: number;
  max_1day_7d: number;
  max_3day_30d: number;
  rainy_days_7d: number;
  rainy_days_15d: number;
  rainy_days_30d: number;
}

export interface RainfallStatus {
  mode: string;
  is_live: boolean;
  provider_name: string;
  provider_configured: boolean;
  status_message: string;
  timestamp: string;
}

export interface RainfallCurrent {
  is_live: boolean;
  provider: string;
  scenario_key?: string;
  scenario_name?: string;
  scenario_description?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  features: DynamicRainfallFeatures;
  status_notice?: string;
}

export interface ExplainabilityBreakdown {
  terrain_susceptibility_level: string;
  terrain_explanation: string;
  rainfall_trigger_level: string;
  rainfall_explanation: string;
  coupling_synergy_explanation: string;
  actionable_guidance: string;
}

export interface PointRiskEvaluation {
  static_susceptibility_p_s: number;
  dynamic_trigger_p_d: number;
  coupled_risk_score: number;
  alert_tier_code: AlertTier;
  alert_tier_name: string;
  alert_color_hex: string;
  recommended_action: string;
  explainability: ExplainabilityBreakdown;
  timestamp: string;
}

export interface CorridorScenario {
  corridor_id: string;
  corridor_name: string;
  route_code: string;
  distance_km: number;
  static_susceptibility: number;
  dry_risk: number;
  dry_tier: string;
  monsoon_risk: number;
  monsoon_tier: string;
  cloudburst_risk: number;
  cloudburst_tier: string;
  critical_vulnerability: string;
}

export interface WeatherStatus {
  mode: string;
  is_live: boolean;
  provider_name: string;
  cache_status: string;
  status_message: string;
  timestamp: string;
  data_age_minutes?: number;
  reason?: string;
  cache_stats?: any;
}

export interface DataProvenance {
  provider: string;
  data_mode: string;
  is_live: boolean;
  source_timestamp: string;
  retrieved_at: string;
  data_quality: string;
  feature_completeness: string;
}

export interface ForecastIntervals {
  now_mm: number;
  next_6h_mm: number;
  next_12h_mm: number;
  next_24h_mm: number;
  next_3d_mm: number;
  next_7d_mm: number;
}

export interface CurrentWeatherCondition {
  temperature_c: number;
  relative_humidity_pct: number;
  precipitation_mm: number;
  wind_speed_10m_kmh?: number;
  weather_code: number;
  weather_description: string;
  time: string;
}

export interface DailyWeatherPoint {
  date: string;
  precipitation_sum_mm: number;
  weather_code: number;
  weather_description: string;
  temperature_max_c?: number;
  temperature_min_c?: number;
}

export interface WeatherCurrentResponse {
  latitude: number;
  longitude: number;
  location_name?: string;
  elevation_m: number;
  provider: string;
  cache_status: string;
  timestamp: string;
  current: CurrentWeatherCondition;
  features: DynamicRainfallFeatures;
  dynamic_trigger_p_d: number;
  provenance?: DataProvenance;
  intervals?: ForecastIntervals;
}


export interface RiskForecastPoint {
  date: string;
  day_offset: number;
  day_name: string;
  forecast_rain_mm: number;
  dynamic_trigger_p_d: number;
  coupled_risk_score: number;
  alert_tier_code: AlertTier;
  alert_tier_name: string;
  alert_color_hex: string;
  warning_summary: string;
  dynamic_features: DynamicRainfallFeatures;
}

export interface RiskForecastResponse {
  query_latitude: number;
  query_longitude: number;
  nearest_cell_id?: string;
  location_name?: string;
  static_susceptibility_p_s: number;
  current_dynamic_trigger_p_d: number;
  current_coupled_risk_score: number;
  current_alert_tier_code: AlertTier;
  current_alert_tier_name: string;
  current_alert_color_hex: string;
  timeline: RiskForecastPoint[];
  peak_day: string;
  peak_day_offset: number;
  peak_risk_score: number;
  peak_alert_tier: string;
  overall_trend: string;
  explainability: ExplainabilityBreakdown;
  weather_provider: string;
  cache_status: string;
  timestamp: string;
}

export interface DataConfidenceIndicator {
  overall_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  data_source: string;
  last_updated_minutes_ago: number;
  coverage_type: string;
  forecast_horizon_hours: number;
  confidence_rationale: string;
}

export interface ActionRecommendation {
  risk_level: string;
  terrain_susceptibility_tier: string;
  rainfall_trigger_status: string;
  operational_protocol: string;
  recommended_actions: string[];
  mandatory_evacuation: boolean;
  advisory_notice: string;
}

export interface LocationWeatherResponse {
  latitude: number;
  longitude: number;
  location_name?: string;
  nearest_cell_id?: string;
  elevation_m: number;
  current: CurrentWeatherCondition;
  recent_accumulation: Record<string, number>;
  intervals: ForecastIntervals;
  features: DynamicRainfallFeatures;
  dynamic_trigger_p_d: number;
  provenance: DataProvenance;
  confidence: DataConfidenceIndicator;
  timestamp: string;
}

export interface WeatherRegionItem {
  station_id: string;
  station_name: string;
  spatial_block: string;
  geomorphic_zone: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  current_temp_c: number;
  current_rain_mm: number;
  wind_speed_kmh: number;
  dynamic_trigger_p_d: number;
  weather_description: string;
  is_live: boolean;
}

export interface WeatherRegionsResponse {
  mode: string;
  provider: string;
  station_count: number;
  timestamp: string;
  regions: WeatherRegionItem[];
}

export interface LiveLocationRiskResponse {
  latitude: number;
  longitude: number;
  cell_id?: string;
  location_name: string;
  slope_deg: number;
  elevation_m: number;
  static_susceptibility_p_s: number;
  dynamic_trigger_p_d: number;
  coupled_risk_score: number;
  alert_tier_code: AlertTier;
  alert_tier_name: string;
  alert_color_hex: string;
  current_rain_mm: number;
  recent_rain_7d_mm: number;
  forecast_rain_24h_mm: number;
  explainability: ExplainabilityBreakdown;
  action_intelligence: ActionRecommendation;
  data_confidence: DataConfidenceIndicator;
  provenance: DataProvenance;
  timestamp: string;
}

export interface LiveGridResponse {
  mode: string;
  provider: string;
  timestamp: string;
  total_cells: number;
  station_count: number;
  provenance: DataProvenance;
  summary: Record<string, any>;
  cells?: Array<Record<string, any>>;
}

export interface HourlyWeatherPoint {
  time: string;
  precipitation_mm: number;
  rain_mm: number;
  temperature_c: number;
  relative_humidity_pct: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  surface_pressure_hpa: number;
  weather_code: number;
  weather_description: string;
}

export interface WeatherHistory24h {
  total_rainfall_mm: number;
  peak_hourly_rainfall_mm: number;
  rainy_hours_count: number;
  temp_min_c: number;
  temp_max_c: number;
  relative_humidity_avg_pct: number;
  relative_humidity_max_pct: number;
  wind_speed_max_kmh: number;
  hourly: HourlyWeatherPoint[];
}

export interface WeatherForecast24h {
  total_rainfall_mm: number;
  peak_hourly_rainfall_mm: number;
  hourly: HourlyWeatherPoint[];
}

export interface HourlyRiskPoint {
  time: string;
  hour_offset: number;
  forecast_hourly_rain_mm: number;
  cumulative_forecast_rain_mm: number;
  dynamic_trigger_p_d: number;
  coupled_risk_score: number;
  alert_tier_code: AlertTier;
  alert_tier_name: string;
  alert_color_hex: string;
  weather_description: string;
  temperature_c: number;
}

export interface PeakRisk24h {
  peak_risk_score: number;
  peak_hour_offset: number;
  peak_time: string;
  peak_alert_tier_code: AlertTier;
  peak_alert_tier_name: string;
  peak_alert_color_hex: string;
  peak_p_d: number;
  trend_description: string;
}

export interface LocationIdentity {
  locality: string;
  district: string;
  state: string;
  country: string;
  display_name: string;
  full_hierarchy: string;
  formatted_coordinates: string;
  latitude: number;
  longitude: number;
  spatial_cell_id: string;
  resolution_method: 'REVERSE_GEOCODED' | 'EXACT_LOCALITY' | 'NEAREST_LOCALITY' | 'COORDINATE_FALLBACK';
  distance_to_named_km: number;
}

export interface Timeline48hPoint {
  time: string;
  period: 'PAST_24H' | 'CURRENT' | 'FORECAST_24H';
  hour_relative: number;
  precipitation_mm: number;
  temperature_c: number;
  relative_humidity_pct: number;
  wind_speed_kmh: number;
  weather_description: string;
  weather_code: number;
  dynamic_trigger_p_d?: number;
  coupled_risk_score?: number;
  alert_tier_code?: AlertTier;
  alert_color_hex?: string;
}

export interface CoordinateRiskIntelligence {
  query_latitude: number;
  query_longitude: number;
  location_identity: LocationIdentity;
  nearest_cell_id: string;
  distance_to_cell_center_m: number;
  elevation_m: number;
  slope_deg: number;
  static_susceptibility_p_s: number;
  current_dynamic_trigger_p_d: number;
  current_coupled_risk_score: number;
  current_alert_tier_code: AlertTier;
  current_alert_tier_name: string;
  current_alert_color_hex: string;
  current_weather: CurrentWeatherCondition;
  past_24h_weather: WeatherHistory24h;
  forecast_24h_weather: WeatherForecast24h;
  hourly_risk_projection_24h: HourlyRiskPoint[];
  peak_risk_24h: PeakRisk24h;
  unified_timeline_48h: Timeline48hPoint[];
  explainability: ExplainabilityBreakdown;
  action_recommendation: ActionRecommendation;
  data_confidence: DataConfidenceIndicator;
  provenance: DataProvenance;
  data_age_seconds: number;
  timestamp: string;
  // Phase 2: Risk Trend fields
  previous_coupled_risk?: number | null;
  risk_change?: number | null;
  risk_trend?: 'RISING' | 'STABLE' | 'FALLING' | null;
  next_sync_seconds?: number | null;
}

// ─── Phase 2: Continuous Synchronization Types ────────────────────────────────

export type DataFreshnessStatus =
  | 'LIVE'
  | 'CACHED_LIVE'
  | 'STALE'
  | 'FALLBACK'
  | 'DEMO_SCENARIO'
  | 'ERROR'
  | 'INITIALIZING';

export interface SyncStatus {
  last_sync_at: string | null;
  next_sync_at: string | null;
  next_sync_seconds: number | null;
  interval_seconds: number;
  provider_status: DataFreshnessStatus | string;
  is_live: boolean;
  sync_count?: number;
  failure_count?: number;
  consecutive_failures?: number;
  data_age_minutes?: number | null;
  selected_coordinate?: [number, number] | null;
  selected_cell_id?: string | null;
  operational_note?: string;
}

export interface RiskHistoryEntry {
  timestamp: string;
  rainfall_mm: number;
  p_d: number;
  p_s: number;
  coupled_risk: number;
  alert_tier: AlertTier;
}

export interface RiskHistoryResponse {
  latitude: number;
  longitude: number;
  entries: RiskHistoryEntry[];
  entry_count: number;
  oldest_entry_at?: string | null;
  newest_entry_at?: string | null;
  trend?: string | null;
  risk_change?: number | null;
  timestamp: string;
}
