// Strict TypeScript Type Definitions for SIH 2026 Landslide Risk & Rainfall Intelligence Platform

export type AlertTier = 'Level 1: Green' | 'Level 2: Yellow' | 'Level 3: Orange' | 'Level 4: Red';
export type MapLayerType = 'coupled_risk' | 'static_susceptibility' | 'dynamic_trigger';

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
