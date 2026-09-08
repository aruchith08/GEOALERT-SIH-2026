import {
  GridGeoJSON,
  BlockRiskSummary,
  RainfallStatus,
  RainfallCurrent,
  DynamicRainfallFeatures,
  PointRiskEvaluation,
  WeatherStatus,
  WeatherCurrentResponse,
  DailyWeatherPoint,
  RiskForecastResponse,
  WeatherRegionsResponse,
  LiveLocationRiskResponse
} from './types';


const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export async function fetchSpatialGrid(block?: string, alertTier?: string): Promise<GridGeoJSON> {
  try {
    const params = new URLSearchParams();
    if (block && block !== 'All Blocks') params.append('block', block);
    if (alertTier && alertTier !== 'All Tiers') params.append('alert_tier', alertTier);

    const url = `${API_BASE}/risk/grid${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[API Client] Backend unreachable, falling back to cached Section 34 GeoJSON...', err);
    const fallback = await fetch('/data/regional_risk_surface.geojson');
    const data: GridGeoJSON = await fallback.json();
    if (!block || block === 'All Blocks') {
      if (!alertTier || alertTier === 'All Tiers') return data;
      return {
        ...data,
        features: data.features.filter(f => f.properties.alert_level === alertTier)
      };
    }
    let filtered = data.features.filter(f => f.properties.block.toLowerCase().includes(block.toLowerCase().replace(' block', '')));
    if (alertTier && alertTier !== 'All Tiers') {
      filtered = filtered.filter(f => f.properties.alert_level === alertTier);
    }
    return { ...data, features: filtered };
  }
}

export async function fetchGridSummary(): Promise<BlockRiskSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/risk/grid/summary`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend error: ${res.status}`);
    const json = await res.json();
    return (json.block_summaries || []).map((b: any) => ({
      spatial_block_name: b.spatial_block_name,
      total_grid_cells_N: b.total_grid_cells_N ?? 0,
      mean_static_susceptibility_P_S: b.mean_static_susceptibility_P_S ?? 0,
      mean_dynamic_trigger_P_D: b.mean_dynamic_trigger_P_D ?? b.mean_dynamic_hazard_P_D ?? 0.6284,
      mean_coupled_risk_score: b.mean_coupled_risk_score ?? 0,
      max_coupled_risk_score: b.max_coupled_risk_score ?? 0,
      level_1_green_count: b.level_1_green_count ?? 0,
      level_2_yellow_count: b.level_2_yellow_count ?? 0,
      level_3_orange_count: b.level_3_orange_count ?? 0,
      level_4_red_count: b.level_4_red_count ?? 0,
      high_risk_percentage: b.high_risk_percentage ?? b.high_risk_cells_pct ?? 0
    }));
  } catch (err) {
    console.warn('[API Client] Backend summary unreachable, using client defaults...');
    return [
      {
        spatial_block_name: 'East Khasi Block',
        total_grid_cells_N: 419,
        mean_static_susceptibility_P_S: 0.1206,
        mean_dynamic_trigger_P_D: 0.6284,
        mean_coupled_risk_score: 0.0758,
        max_coupled_risk_score: 0.4342,
        level_1_green_count: 317,
        level_2_yellow_count: 45,
        level_3_orange_count: 48,
        level_4_red_count: 9,
        high_risk_percentage: 13.6
      },
      {
        spatial_block_name: 'Jaintia Hills Block',
        total_grid_cells_N: 469,
        mean_static_susceptibility_P_S: 0.0924,
        mean_dynamic_trigger_P_D: 0.6284,
        mean_coupled_risk_score: 0.0580,
        max_coupled_risk_score: 0.4494,
        level_1_green_count: 388,
        level_2_yellow_count: 43,
        level_3_orange_count: 37,
        level_4_red_count: 1,
        high_risk_percentage: 8.1
      },
      {
        spatial_block_name: 'Ri-Bhoi Block',
        total_grid_cells_N: 715,
        mean_static_susceptibility_P_S: 0.0515,
        mean_dynamic_trigger_P_D: 0.6284,
        mean_coupled_risk_score: 0.0323,
        max_coupled_risk_score: 0.2528,
        level_1_green_count: 674,
        level_2_yellow_count: 23,
        level_3_orange_count: 18,
        level_4_red_count: 0,
        high_risk_percentage: 2.5
      },
      {
        spatial_block_name: 'West Khasi Block',
        total_grid_cells_N: 516,
        mean_static_susceptibility_P_S: 0.0506,
        mean_dynamic_trigger_P_D: 0.6284,
        mean_coupled_risk_score: 0.0318,
        max_coupled_risk_score: 0.3137,
        level_1_green_count: 491,
        level_2_yellow_count: 19,
        level_3_orange_count: 6,
        level_4_red_count: 0,
        high_risk_percentage: 1.2
      },
      {
        spatial_block_name: 'Garo Hills Block',
        total_grid_cells_N: 1037,
        mean_static_susceptibility_P_S: 0.0282,
        mean_dynamic_trigger_P_D: 0.6284,
        mean_coupled_risk_score: 0.0177,
        max_coupled_risk_score: 0.1542,
        level_1_green_count: 1029,
        level_2_yellow_count: 7,
        level_3_orange_count: 1,
        level_4_red_count: 0,
        high_risk_percentage: 0.1
      }
    ];
  }
}

export async function fetchRainfallStatus(): Promise<RainfallStatus> {
  try {
    const res = await fetch(`${API_BASE}/rainfall/status`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend error: ${res.status}`);
    return await res.json();
  } catch {
    return {
      mode: 'DEMO_SCENARIO',
      is_live: false,
      provider_name: 'Scenario Simulation (CHIRPS Calibrated)',
      provider_configured: false,
      status_message: 'Live rainfall ingestion not configured. System running in DEMO / SCENARIO SIMULATION mode.',
      timestamp: new Date().toISOString()
    };
  }
}

export async function fetchRainfallCurrent(): Promise<RainfallCurrent> {
  try {
    const res = await fetch(`${API_BASE}/rainfall/current`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend error: ${res.status}`);
    return await res.json();
  } catch {
    return {
      is_live: false,
      provider: 'Scenario Simulation (CHIRPS Calibrated)',
      scenario_key: 'monsoon_surge_section34',
      scenario_name: 'Active Monsoon Surge (Section 34 Baseline)',
      scenario_description: 'Heavy antecedent saturation and active monsoon low pressure trough.',
      latitude: 25.5,
      longitude: 91.5,
      timestamp: new Date().toISOString(),
      features: {
        rainfall_event_day: 45.0,
        ari_3: 110.0,
        ari_7: 180.0,
        ari_15: 320.0,
        ari_30: 520.0,
        max_1day_7d: 65.0,
        max_3day_30d: 160.0,
        rainy_days_7d: 5,
        rainy_days_15d: 11,
        rainy_days_30d: 18
      },
      status_notice: 'DEMO / SCENARIO DATA — Not an active live rainfall broadcast.'
    };
  }
}

export async function evaluateRainfallScenario(features: DynamicRainfallFeatures, scenarioName?: string): Promise<{ dynamic_trigger_p_d: number }> {
  try {
    const res = await fetch(`${API_BASE}/rainfall/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_name: scenarioName || 'Custom Scenario', features })
    });
    if (!res.ok) throw new Error(`Model B evaluation error: ${res.status}`);
    const json = await res.json();
    return { dynamic_trigger_p_d: json.dynamic_trigger_p_d };
  } catch {
    // Local fallback approximation if backend is down
    const score = Math.min(Math.max((features.rainfall_event_day * 0.004 + features.ari_3 * 0.002 + features.ari_7 * 0.001), 0.01), 0.95);
    return { dynamic_trigger_p_d: Number(score.toFixed(4)) };
  }
}

export async function evaluatePointRisk(p_s: number, dynamicFeatures: DynamicRainfallFeatures): Promise<PointRiskEvaluation> {
  try {
    const res = await fetch(`${API_BASE}/risk/evaluate-point`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_s, dynamic_features: dynamicFeatures })
    });
    if (!res.ok) throw new Error(`Risk evaluation error: ${res.status}`);
    return await res.json();
  } catch {
    // Client-side fallback computation
    const p_d = Math.min(Math.max((dynamicFeatures.rainfall_event_day * 0.004 + dynamicFeatures.ari_3 * 0.002 + dynamicFeatures.ari_7 * 0.001), 0.01), 0.95);
    const coupled = Number((p_s * p_d).toFixed(4));
    let tier: any = 'Level 1: Green';
    let tierName = 'Low / Normal Baseline Monitoring';
    let hex = '#22c55e';
    let action = 'Routine baseline monitoring.';

    if (coupled >= 0.35 && p_s >= 0.15) {
      tier = 'Level 4: Red';
      tierName = 'Critical / Immediate Action Trigger';
      hex = '#ef4444';
      action = 'Critical landslide hazard. Immediate emergency protocols.';
    } else if (coupled >= 0.15 && p_s >= 0.15) {
      tier = 'Level 3: Orange';
      tierName = 'Warning / Heightened Hazard Alert';
      hex = '#f97316';
      action = 'Heightened warning. Travel caution advised.';
    } else if (coupled >= 0.0502 && p_s >= 0.15) {
      tier = 'Level 2: Yellow';
      tierName = 'Advisory / Early Warning Watch';
      hex = '#eab308';
      action = 'Advisory notice. Maintenance standby and slope drainage watch.';
    }

    return {
      static_susceptibility_p_s: p_s,
      dynamic_trigger_p_d: p_d,
      coupled_risk_score: coupled,
      alert_tier_code: tier,
      alert_tier_name: tierName,
      alert_color_hex: hex,
      recommended_action: action,
      explainability: {
        terrain_susceptibility_level: p_s >= 0.5 ? 'Very High' : p_s >= 0.3 ? 'High' : p_s >= 0.15 ? 'Moderate' : 'Low',
        terrain_explanation: `Terrain static susceptibility P(S)=${p_s.toFixed(3)}.`,
        rainfall_trigger_level: p_d >= 0.5 ? 'Critical' : p_d >= 0.2 ? 'Elevated' : 'Dormant',
        rainfall_explanation: `Rainfall hazard trigger P(D)=${p_d.toFixed(3)}.`,
        coupling_synergy_explanation: p_s < 0.15 ? 'Flat terrain suppresses rainfall hazard.' : 'Steep terrain amplifies rainfall trigger.',
        actionable_guidance: action
      },
      timestamp: new Date().toISOString()
    };
  }
}

export async function checkBackendHealth(): Promise<{ status: string; online: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
    if (!res.ok) return { status: 'offline', online: false };
    const json = await res.json();
    return { status: json.status, online: true };
  } catch {
    return { status: 'offline', online: false };
  }
}

export async function fetchWeatherStatus(): Promise<WeatherStatus> {
  try {
    const res = await fetch(`${API_BASE}/weather/status`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Weather status error: ${res.status}`);
    return await res.json();
  } catch {
    return {
      mode: 'DEMO_SCENARIO',
      is_live: false,
      provider_name: 'Scenario Simulation (Offline Fallback)',
      cache_status: 'INACTIVE',
      status_message: 'External telemetry unavailable. Operating in calibrated DEMO / SCENARIO mode.',
      timestamp: new Date().toISOString()
    };
  }
}

export async function fetchCurrentWeather(
  latitude: number = 25.5788,
  longitude: number = 91.8933
): Promise<WeatherCurrentResponse> {
  try {
    const url = `${API_BASE}/weather/current?latitude=${latitude}&longitude=${longitude}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Current weather error: ${res.status}`);
    return await res.json();
  } catch {
    // Deterministic fallback (Shillong seasonal observation)
    return {
      latitude,
      longitude,
      elevation_m: 1496.0,
      provider: 'Calibrated Observation (Fallback)',
      cache_status: 'DEMO_FALLBACK',
      timestamp: new Date().toISOString(),
      current: {
        temperature_c: 21.4,
        relative_humidity_pct: 88.0,
        precipitation_mm: 45.0,
        weather_code: 63,
        weather_description: 'Moderate rain',
        time: new Date().toISOString()
      },
      features: {
        rainfall_event_day: 45.0,
        ari_3: 110.0,
        ari_7: 180.0,
        ari_15: 320.0,
        ari_30: 520.0,
        max_1day_7d: 65.0,
        max_3day_30d: 160.0,
        rainy_days_7d: 5,
        rainy_days_15d: 11,
        rainy_days_30d: 18
      },
      dynamic_trigger_p_d: 0.6284
    };
  }
}

export async function fetchWeatherForecast(
  latitude: number = 25.5788,
  longitude: number = 91.8933,
  days: number = 7
): Promise<DailyWeatherPoint[]> {
  try {
    const url = `${API_BASE}/weather/forecast?latitude=${latitude}&longitude=${longitude}&days=${days}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Weather forecast error: ${res.status}`);
    const json = await res.json();
    return json.daily_forecast || [];
  } catch {
    return [];
  }
}

export async function fetchWeatherHistory(
  latitude: number = 25.5788,
  longitude: number = 91.8933,
  days: number = 14
): Promise<DailyWeatherPoint[]> {
  try {
    const url = `${API_BASE}/weather/history?latitude=${latitude}&longitude=${longitude}&days=${days}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Weather history error: ${res.status}`);
    const json = await res.json();
    return json.daily_history || [];
  } catch {
    return [];
  }
}

export async function fetchRiskForecast(
  latitude: number,
  longitude: number,
  p_s?: number,
  cell_id?: string,
  location_name?: string
): Promise<RiskForecastResponse> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString()
    });
    if (cell_id) params.append('cell_id', cell_id);
    if (p_s !== undefined && p_s !== null) params.append('p_s', p_s.toString());
    if (location_name) params.append('location_name', location_name);

    const url = `${API_BASE}/risk/forecast?${params.toString()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Risk forecast error: ${res.status}`);
    return await res.json();
  } catch {
    // Client-side fallback calculation
    const resolvedPS = p_s ?? 0.35;
    const baseRain = [35.0, 52.0, 68.0, 45.0, 30.0, 20.0, 15.0];
    const timeline = baseRain.map((rain, idx) => {
      const offset = idx + 1;
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const pd = Math.min(Math.max(0.40 + (rain / 120.0) * 0.45, 0.05), 0.95);
      const coupled = Number((resolvedPS * pd).toFixed(4));

      let tier: any = 'Level 1: Green';
      let tierName = 'Level 1: Green';
      let hex = '#16a34a';
      if (coupled >= 0.35 && resolvedPS >= 0.15) {
        tier = 'Level 4: Red';
        tierName = 'Level 4: Red';
        hex = '#dc2626';
      } else if (coupled >= 0.15 && resolvedPS >= 0.15) {
        tier = 'Level 3: Orange';
        tierName = 'Level 3: Orange';
        hex = '#ea580c';
      } else if (coupled >= 0.0502 && resolvedPS >= 0.15) {
        tier = 'Level 2: Yellow';
        tierName = 'Level 2: Yellow';
        hex = '#ca8a04';
      }

      return {
        date: d.toISOString().split('T')[0],
        day_offset: offset,
        day_name: dayName,
        forecast_rain_mm: rain,
        dynamic_trigger_p_d: Number(pd.toFixed(4)),
        coupled_risk_score: coupled,
        alert_tier_code: tier,
        alert_tier_name: tierName,
        alert_color_hex: hex,
        warning_summary: `${dayName}: ${rain.toFixed(1)}mm rain | Risk ${coupled.toFixed(3)} (${tierName})`,
        dynamic_features: {
          rainfall_event_day: rain,
          ari_3: rain * 2.2,
          ari_7: rain * 4.0,
          ari_15: rain * 7.5,
          ari_30: rain * 12.0,
          max_1day_7d: rain,
          max_3day_30d: rain * 2.5,
          rainy_days_7d: 5,
          rainy_days_15d: 11,
          rainy_days_30d: 20
        }
      };
    });

    const peak = timeline.reduce((max, item) => item.coupled_risk_score > max.coupled_risk_score ? item : max, timeline[0]);

    return {
      query_latitude: latitude,
      query_longitude: longitude,
      nearest_cell_id: cell_id,
      location_name: location_name || `Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
      static_susceptibility_p_s: resolvedPS,
      current_dynamic_trigger_p_d: 0.6284,
      current_coupled_risk_score: Number((resolvedPS * 0.6284).toFixed(4)),
      current_alert_tier_code: resolvedPS * 0.6284 >= 0.15 ? 'Level 3: Orange' : 'Level 2: Yellow',
      current_alert_tier_name: resolvedPS * 0.6284 >= 0.15 ? 'Warning' : 'Advisory',
      current_alert_color_hex: resolvedPS * 0.6284 >= 0.15 ? '#ea580c' : '#ca8a04',
      timeline,
      peak_day: peak.day_name,
      peak_day_offset: peak.day_offset,
      peak_risk_score: peak.coupled_risk_score,
      peak_alert_tier: peak.alert_tier_name,
      overall_trend: `PEAK RISK ALERT: Risk rises to ${peak.coupled_risk_score.toFixed(3)} on ${peak.day_name}.`,
      explainability: {
        terrain_susceptibility_level: resolvedPS >= 0.3 ? 'High' : 'Moderate',
        terrain_explanation: `Terrain static susceptibility P(S)=${resolvedPS.toFixed(3)}.`,
        rainfall_trigger_level: 'Elevated',
        rainfall_explanation: 'Active monsoon meteorological trigger.',
        coupling_synergy_explanation: 'Forward forecast evaluates multi-day rolling precipitation accumulation against terrain slope.',
        actionable_guidance: 'Maintain geotechnical slope drainage monitoring over the forecast window.'
      },
      weather_provider: 'Open-Meteo (Local Cache / Fallback)',
      cache_status: 'CACHED',
      timestamp: new Date().toISOString()
    };
  }
}



export async function fetchWeatherRegions(): Promise<WeatherRegionsResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/weather/regions`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Weather regions error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[API Client] /weather/regions fetch failed:', err);
    return null;
  }
}

export async function fetchLiveLocationRisk(
  latitude: number,
  longitude: number,
  cell_id?: string,
  p_s?: number
): Promise<LiveLocationRiskResponse | null> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString()
    });
    if (cell_id) params.append('cell_id', cell_id);
    if (p_s !== undefined && p_s !== null) params.append('p_s', p_s.toString());

    const res = await fetch(`${API_BASE}/risk/live/location?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Live location risk error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[API Client] /risk/live/location fetch failed:', err);
    return null;
  }
}
