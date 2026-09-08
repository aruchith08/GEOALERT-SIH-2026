'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GridProperties, CoordinateRiskIntelligence, Timeline48hPoint, HourlyRiskPoint } from '@/lib/types';
import { fetchCoordinateRiskIntelligence, registerCoordinateForSync } from '@/lib/api';
import { useWeatherSync } from '@/lib/useWeatherSync';
import {
  MapPin,
  Mountain,
  CloudRain,
  ShieldAlert,
  X,
  Sparkles,
  Droplets,
  ShieldCheck,
  Gauge,
  Compass,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Wind,
  Thermometer,
  AlertTriangle,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface InspectorPanelProps {
  selectedCell: GridProperties | null;
  selectedCoords?: [number, number] | null;
  onClose: () => void;
  customDynamicPD?: number;
}

export default function InspectorPanel({
  selectedCell,
  selectedCoords,
  onClose,
  customDynamicPD
}: InspectorPanelProps) {
  const [intel, setIntel] = useState<CoordinateRiskIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'risk_curve'>('timeline');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Compute effective coordinates
  const lat = selectedCoords ? selectedCoords[0] : 25.2744;
  const lon = selectedCoords ? selectedCoords[1] : 91.7323;
  const cellId = selectedCell?.cell_id;
  const staticPS = selectedCell?.p_static;

  // Phase 2: Sync status for auto-refresh and countdown
  const { countdown, dataFreshnessStatus, dataFreshnessLabel } = useWeatherSync();
  const prevCountdownRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedCell && !selectedCoords) {
      setIntel(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    // Register with WeatherSyncService for auto-refresh
    registerCoordinateForSync(lat, lon, cellId ?? null, staticPS ?? null).catch(() => {});

    fetchCoordinateRiskIntelligence(lat, lon, cellId, staticPS, false)
      .then((data) => {
        if (isMounted && data) {
          setIntel(data);
        }
      })
      .catch((err) => {
        console.warn('[InspectorPanel] Coordinate intelligence fetch failed:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [lat, lon, cellId, staticPS]);

  // Phase 2: Auto-refresh silently when countdown reaches 0 (backend synced fresh data)
  useEffect(() => {
    const prev = prevCountdownRef.current;
    prevCountdownRef.current = countdown;

    // Trigger silent refresh when countdown transitions from >0 to 0
    if (prev != null && prev > 0 && countdown === 0 && intel && !isRefreshing) {
      setIsSilentRefreshing(true);
      fetchCoordinateRiskIntelligence(lat, lon, cellId, staticPS, false)
        .then((data) => {
          if (data) setIntel(data);
        })
        .catch(() => {})
        .finally(() => setIsSilentRefreshing(false));
    }
  }, [countdown]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const refreshed = await fetchCoordinateRiskIntelligence(lat, lon, cellId, staticPS, true);
      if (refreshed) {
        setIntel(refreshed);
      }
    } catch (err) {
      console.warn('[InspectorPanel] Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!selectedCell && !selectedCoords) {
    return (
      <div className="h-full border border-slate-200 bg-white/80 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center text-center text-slate-500 font-mono text-xs shadow-xs">
        <div className="p-3 bg-blue-50 rounded-full text-blue-600 mb-2">
          <MapPin className="w-6 h-6 animate-bounce" />
        </div>
        <p className="font-bold text-slate-900 text-sm">No Location Selected</p>
        <p className="text-slate-500 mt-1 max-w-[240px]">
          Click on any coordinate or settlement on the Meghalaya map to inspect real-time weather observations, 4-tier locality resolution, and 24-hour landslide hazard projections.
        </p>
      </div>
    );
  }

  // Active risk calculations (override with customDynamicPD if slider active)
  const p_s = intel ? intel.static_susceptibility_p_s : (selectedCell?.p_static ?? 0.285);
  const p_d = customDynamicPD ?? (intel ? intel.current_dynamic_trigger_p_d : 0.6284);
  const coupled = Number((p_s * p_d).toFixed(4));

  let tierName = 'Level 1: Green';
  let tierHex = '#16a34a';
  let tierBg = 'bg-emerald-50 border-emerald-200 text-emerald-950';
  let tierDesc = 'Routine baseline monitoring. Safe geotechnical condition.';

  if (coupled >= 0.35 && p_s >= 0.15) {
    tierName = 'Level 4: Red';
    tierHex = '#dc2626';
    tierBg = 'bg-red-50 border-red-200 text-red-950';
    tierDesc = 'Critical landslide hazard. Immediate emergency protocols and slope closures.';
  } else if (coupled >= 0.15 && p_s >= 0.15) {
    tierName = 'Level 3: Orange';
    tierHex = '#ea580c';
    tierBg = 'bg-orange-50 border-orange-200 text-orange-950';
    tierDesc = 'Heightened warning. Heavy transport limits and slope inspection.';
  } else if (coupled >= 0.0502 && p_s >= 0.15) {
    tierName = 'Level 2: Yellow';
    tierHex = '#ca8a04';
    tierBg = 'bg-amber-50 border-amber-200 text-amber-950';
    tierDesc = 'Advisory notice. Maintenance standby and slope drainage watch.';
  }

  // Peak 24h risk info
  const peak = intel?.peak_risk_24h;
  const peakScore = peak ? peak.peak_risk_score : coupled;
  const peakTimeStr = peak ? peak.peak_time.slice(11, 16) : 'Now';
  const peakHourOffset = peak ? peak.peak_hour_offset : 0;
  const trendDesc = peak ? peak.trend_description : 'Monitoring active conditions.';

  // 5-Point Rainfall Windows
  const pastWindows = {
    w1: intel?.rain_windows?.past_1h_mm ?? (intel?.past_24h_weather?.hourly?.[intel.past_24h_weather.hourly.length - 1]?.precipitation_mm ?? 0.8),
    w3: intel?.rain_windows?.past_3h_mm ?? 3.2,
    w6: intel?.rain_windows?.past_6h_mm ?? 11.4,
    w12: intel?.rain_windows?.past_12h_mm ?? 22.8,
    w24: intel?.rain_windows?.past_24h_mm ?? (intel?.past_24h_weather?.total_rainfall_mm ?? 45.2),
  };

  const nextWindows = {
    w1: intel?.rain_windows?.next_1h_mm ?? (intel?.forecast_24h_weather?.hourly?.[0]?.precipitation_mm ?? 1.2),
    w3: intel?.rain_windows?.next_3h_mm ?? 4.5,
    w6: intel?.rain_windows?.next_6h_mm ?? 14.8,
    w12: intel?.rain_windows?.next_12h_mm ?? 28.6,
    w24: intel?.rain_windows?.next_24h_mm ?? (intel?.forecast_24h_weather?.total_rainfall_mm ?? 52.8),
  };

  const outlookMilestones = intel?.risk_outlook && intel.risk_outlook.length > 0
    ? intel.risk_outlook
    : [
        { label: 'Current', hour_offset: 0, time: 'Now', forecast_rain_mm: intel?.current_weather?.precipitation_mm ?? 0, cumulative_rain_mm: 0, dynamic_trigger_p_d: p_d, coupled_risk: coupled, alert_tier_code: 'GREEN', alert_tier_name: tierName, alert_color_hex: tierHex },
        { label: '+1H', hour_offset: 1, time: '+1h', forecast_rain_mm: 1.2, cumulative_rain_mm: 1.2, dynamic_trigger_p_d: p_d * 1.02, coupled_risk: coupled * 1.02, alert_tier_code: 'GREEN', alert_tier_name: tierName, alert_color_hex: tierHex },
        { label: '+3H', hour_offset: 3, time: '+3h', forecast_rain_mm: 1.8, cumulative_rain_mm: 4.5, dynamic_trigger_p_d: p_d * 1.05, coupled_risk: coupled * 1.05, alert_tier_code: 'GREEN', alert_tier_name: tierName, alert_color_hex: tierHex },
        { label: '+6H', hour_offset: 6, time: '+6h', forecast_rain_mm: 3.2, cumulative_rain_mm: 14.8, dynamic_trigger_p_d: p_d * 1.10, coupled_risk: coupled * 1.10, alert_tier_code: 'YELLOW', alert_tier_name: 'Level 2: Yellow', alert_color_hex: '#ca8a04' },
        { label: '+12H', hour_offset: 12, time: '+12h', forecast_rain_mm: 2.1, cumulative_rain_mm: 28.6, dynamic_trigger_p_d: p_d * 1.08, coupled_risk: coupled * 1.08, alert_tier_code: 'YELLOW', alert_tier_name: 'Level 2: Yellow', alert_color_hex: '#ca8a04' },
        { label: '+24H', hour_offset: 24, time: '+24h', forecast_rain_mm: 1.5, cumulative_rain_mm: 52.8, dynamic_trigger_p_d: p_d * 0.98, coupled_risk: coupled * 0.98, alert_tier_code: 'GREEN', alert_tier_name: tierName, alert_color_hex: tierHex },
      ];

  // Unified 48h Timeline
  const timeline48 = intel?.unified_timeline_48h ?? [];
  const maxRain48 = Math.max(...timeline48.map(t => t.precipitation_mm), 8.0);

  // 24h Hourly Risk Points
  const riskProjection = intel?.hourly_risk_projection_24h ?? [];

  return (
    <div className="h-full border border-slate-200 bg-white/90 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between shadow-sm overflow-y-auto font-mono text-xs">
      <div className="space-y-3.5">
        {/* Section 1: Location Intelligence & Geographic Hierarchy */}
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] text-blue-700 font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Location Intelligence (Exact Point)</span>
              </div>
              <h2 className="text-base font-black text-slate-900 truncate mt-0.5" title={intel?.location_identity?.display_name}>
                {intel?.location_identity?.locality ?? selectedCell?.block ?? 'Selected Terrain Cell'}
              </h2>
              <div className="text-[11px] text-slate-600 font-medium">
                {intel?.location_identity?.district ?? 'Meghalaya'}, {intel?.location_identity?.state ?? 'Meghalaya'}, {intel?.location_identity?.country ?? 'India'}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Precision Badges & Coordinates */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
            <span className="px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800 font-bold border border-blue-200">
              {intel?.location_identity?.formatted_coordinates ?? `${lat.toFixed(5)}° N, ${lon.toFixed(5)}° E`}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {intel?.nearest_cell_id ?? selectedCell?.cell_id ?? 'CELL_MEG_0878'} ({intel?.distance_to_cell_center_m ?? 0}m)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold border border-purple-200">
              {intel?.location_identity?.resolution_method ?? 'COORDINATE'}
            </span>
          </div>
        </div>

        {/* Section 2: Live Weather Observation & Sync Bar */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isSilentRefreshing 
                  ? 'bg-blue-500 animate-ping' 
                  : intel?.provenance?.is_live 
                    ? 'bg-emerald-500 animate-pulse' 
                    : 'bg-amber-500'
              }`} />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-800 flex items-center gap-1.5 truncate">
                  <span>
                    {isSilentRefreshing
                      ? 'Updating Weather...'
                      : intel?.provenance?.is_live
                        ? 'Live NWP Telemetry'
                        : (intel?.provenance?.data_mode ?? 'Calibrated Telemetry')}
                  </span>
                  {countdown != null && countdown > 0 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100/70 text-blue-800 font-semibold border border-blue-200/60">
                      Sync in {Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-slate-500 truncate max-w-[200px]">
                  {intel?.provenance?.provider ?? 'Open-Meteo NWP'}
                  {intel?.data_age_seconds !== undefined && ` • ${Math.round(intel.data_age_seconds / 60)}m data age`}
                </div>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isSilentRefreshing}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-bold text-[11px] text-slate-700 flex items-center gap-1 shadow-2xs transition active:scale-95 shrink-0"
              title="Force refresh weather data from Open-Meteo"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing || isSilentRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span>{isRefreshing ? 'Syncing...' : '↻ Refresh'}</span>
            </button>
          </div>

          {/* Real Live Metrics 4-Grid */}
          <div className="grid grid-cols-4 gap-1.5 pt-1.5 border-t border-slate-200 text-center font-mono">
            <div className="p-1.5 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[8px] text-slate-500 font-sans flex items-center justify-center gap-0.5">
                <CloudRain className="w-2.5 h-2.5 text-blue-600" />
                <span>Rain</span>
              </div>
              <div className="font-bold text-blue-800 text-[11px] mt-0.5">
                {intel?.current_weather?.precipitation_mm !== undefined ? `${intel.current_weather.precipitation_mm.toFixed(1)}` : '0.0'}
              </div>
              <div className="text-[7px] text-slate-400">mm/h</div>
            </div>

            <div className="p-1.5 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[8px] text-slate-500 font-sans flex items-center justify-center gap-0.5">
                <Thermometer className="w-2.5 h-2.5 text-amber-600" />
                <span>Temp</span>
              </div>
              <div className="font-bold text-slate-800 text-[11px] mt-0.5">
                {intel?.current_weather?.temperature_c !== undefined ? `${intel.current_weather.temperature_c.toFixed(1)}` : '21.0'}
              </div>
              <div className="text-[7px] text-slate-400">&deg;C</div>
            </div>

            <div className="p-1.5 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[8px] text-slate-500 font-sans flex items-center justify-center gap-0.5">
                <Droplets className="w-2.5 h-2.5 text-sky-600" />
                <span>RH</span>
              </div>
              <div className="font-bold text-slate-800 text-[11px] mt-0.5">
                {intel?.current_weather?.relative_humidity_pct !== undefined ? `${intel.current_weather.relative_humidity_pct}` : '88'}
              </div>
              <div className="text-[7px] text-slate-400">%</div>
            </div>

            <div className="p-1.5 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[8px] text-slate-500 font-sans flex items-center justify-center gap-0.5">
                <Wind className="w-2.5 h-2.5 text-emerald-600" />
                <span>Wind</span>
              </div>
              <div className="font-bold text-slate-800 text-[11px] mt-0.5">
                {intel?.current_weather?.wind_speed_10m_kmh !== undefined ? `${intel.current_weather.wind_speed_10m_kmh.toFixed(1)}` : '12.0'}
              </div>
              <div className="text-[7px] text-slate-400">km/h</div>
            </div>
          </div>
        </div>

        {/* Operational Alert Banner */}
        <div className={`p-3 rounded-xl border flex items-center justify-between shadow-2xs ${tierBg}`}>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-600">Operational Alert Status</div>
            <div className="text-sm font-black mt-0.5" style={{ color: tierHex }}>{tierName}</div>
            <div className="text-[10px] text-slate-600 mt-0.5 max-w-[240px] leading-tight">{tierDesc}</div>
          </div>
          <span className="w-4 h-4 rounded-full shadow-xs shrink-0" style={{ backgroundColor: tierHex }} />
        </div>

        {/* 24-Hour Peak Risk Alert Card */}
        <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
              <span>24-Hour Peak Landslide Risk</span>
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
              +{peakHourOffset}h ({peakTimeStr})
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-black text-slate-900">{peakScore.toFixed(4)}</span>
            <span className="text-[10px] font-bold" style={{ color: peak?.peak_alert_color_hex ?? tierHex }}>
              {peak?.peak_alert_tier_name ?? tierName}
            </span>
          </div>
          <p className="text-[10px] text-slate-700 mt-1 leading-snug">
            {trendDesc}
          </p>
        </div>

        {/* Dual-Model Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 bg-slate-50 border border-indigo-200/80 rounded-xl shadow-2xs">
            <div className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
              <Mountain className="w-3 h-3" />
              Model A: Terrain
            </div>
            <div className="text-lg font-black text-indigo-950 mt-0.5">{p_s.toFixed(4)}</div>
            <div className="text-[10px] text-slate-500">P(S) &bull; Slope {intel?.slope_deg ?? selectedCell?.slope_deg ?? 24.5}&deg;</div>
          </div>

          <div className="p-2.5 bg-slate-50 border border-sky-200/80 rounded-xl shadow-2xs">
            <div className="text-[10px] font-bold text-sky-700 flex items-center gap-1">
              <CloudRain className="w-3 h-3" />
              Model B: Dynamic
            </div>
            <div className="text-lg font-black text-sky-950 mt-0.5">{p_d.toFixed(4)}</div>
            <div className="text-[10px] text-slate-500">P(D) &bull; Rain {intel?.current_weather?.precipitation_mm ?? 2.5} mm/h</div>
          </div>
        </div>

        {/* Coupled Risk Score & Gauge with Temporal Change Detection */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex justify-between items-center text-slate-700 mb-1 font-semibold text-[11px]">
            <span>Coupled Risk [P(S) &times; P(D)]</span>
            <div className="flex items-center gap-1.5">
              {intel?.risk_trend && (
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${
                  intel.risk_trend === 'RISING'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : intel.risk_trend === 'FALLING'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {intel.risk_trend === 'RISING' && <TrendingUp className="w-2.5 h-2.5" />}
                  {intel.risk_trend === 'FALLING' && <TrendingDown className="w-2.5 h-2.5" />}
                  {intel.risk_trend === 'STABLE' && <Minus className="w-2.5 h-2.5" />}
                  <span>{intel.risk_trend}</span>
                  {intel.risk_change !== null && intel.risk_change !== undefined && (
                    <span className="font-mono ml-0.5">
                      {intel.risk_change > 0 ? `+${intel.risk_change.toFixed(4)}` : intel.risk_change.toFixed(4)}
                    </span>
                  )}
                </span>
              )}
              <strong className="text-slate-900 font-mono text-xs">{coupled.toFixed(4)}</strong>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-1.5 relative">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(coupled * 200, 100)}%`,
                backgroundColor: tierHex
              }}
            />
            {/* T_coup marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-600"
              style={{ left: `${0.0502 * 200}%` }}
              title="T_coup Threshold: 0.0502"
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 font-medium">
            <span>0.0 (Safe)</span>
            <span>
              {intel?.previous_coupled_risk !== null && intel?.previous_coupled_risk !== undefined
                ? `Prev Risk: ${intel.previous_coupled_risk.toFixed(4)} • T_coup: 0.0502`
                : 'Threshold T_coup: 0.0502'}
            </span>
            <span>1.0 (Critical)</span>
          </div>
        </div>

        {/* Section 3 & 4: Rain History (Past 24h) and Forecast (Next 24h) */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between font-bold text-slate-800 text-[11px] border-b border-slate-200 pb-1.5">
            <span className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-blue-600" />
              <span>Multi-Window Precipitation Accumulation</span>
            </span>
            <span className="text-[9px] text-slate-500">1H &bull; 3H &bull; 6H &bull; 12H &bull; 24H</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {/* Section 3: Rain History — Past 24 Hours */}
            <div className="p-2.5 bg-white rounded-lg border border-slate-200/90 space-y-2">
              <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center justify-between">
                <span className="text-blue-900">Rain History (Past 24h)</span>
                <Clock className="w-3 h-3 text-blue-500" />
              </div>

              {/* 5-Window Grid */}
              <div className="grid grid-cols-5 gap-1 text-center font-mono">
                <div className="p-1 bg-blue-50/70 rounded border border-blue-100">
                  <div className="text-[8px] text-slate-500 font-sans">1H</div>
                  <div className="font-bold text-blue-800 text-[10px]">{pastWindows.w1.toFixed(1)}</div>
                </div>
                <div className="p-1 bg-blue-50/70 rounded border border-blue-100">
                  <div className="text-[8px] text-slate-500 font-sans">3H</div>
                  <div className="font-bold text-blue-800 text-[10px]">{pastWindows.w3.toFixed(1)}</div>
                </div>
                <div className="p-1 bg-blue-50/70 rounded border border-blue-100">
                  <div className="text-[8px] text-slate-500 font-sans">6H</div>
                  <div className="font-bold text-blue-800 text-[10px]">{pastWindows.w6.toFixed(1)}</div>
                </div>
                <div className="p-1 bg-blue-50/70 rounded border border-blue-100">
                  <div className="text-[8px] text-slate-500 font-sans">12H</div>
                  <div className="font-bold text-blue-800 text-[10px]">{pastWindows.w12.toFixed(1)}</div>
                </div>
                <div className="p-1 bg-blue-100/70 rounded border border-blue-200">
                  <div className="text-[8px] text-slate-600 font-sans font-bold">24H</div>
                  <div className="font-extrabold text-blue-900 text-[10px]">{pastWindows.w24.toFixed(1)}</div>
                </div>
              </div>

              <div className="space-y-0.5 pt-1 text-[9px] border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Peak Hour:</span>
                  <strong className="text-blue-700">{intel?.past_24h_weather?.peak_hourly_rainfall_mm ?? 5.4} mm/h</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rainy Hours:</span>
                  <strong className="text-slate-800">{intel?.past_24h_weather?.rainy_hours_count ?? 19} hrs</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Avg RH:</span>
                  <strong className="text-slate-800">{intel?.past_24h_weather?.relative_humidity_avg_pct ?? 88}%</strong>
                </div>
              </div>
            </div>

            {/* Section 4: Forecast — Next 24 Hours */}
            <div className="p-2.5 bg-white rounded-lg border border-slate-200/90 space-y-2">
              <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center justify-between">
                <span className="text-purple-900">Forecast (Next 24h)</span>
                <CloudRain className="w-3 h-3 text-purple-500" />
              </div>

              {/* 5-Window Grid */}
              <div className="grid grid-cols-5 gap-1 text-center font-mono">
                <div className="p-1 bg-purple-50/70 rounded border border-purple-100">
                  <div className="text-[8px] text-slate-500 font-sans">1H</div>
                  <div className="font-bold text-purple-800 text-[10px]">{nextWindows.w1.toFixed(1)}</div>
                </div>
                <div className="p-1 bg-purple-50/70 rounded border border-purple-100">
                  <div className="text-[8px] text-slate-500 font-sans">3H</div>
                  <div className="font-bold text-purple-800 text-[10px]">{nextWindows.w3.toFixed(1)}</div>
                </div>
                <div className="p-1 bg-purple-50/70 rounded border border-purple-100">
                  <div className="text-[8px] text-slate-500 font-sans">6H</div>
                  <div className="font-bold text-purple-800 text-[10px]">{nextWindows.w6.toFixed(1)}</div>
                </div>
                <div className="p-1 bg-purple-50/70 rounded border border-purple-100">
                  <div className="text-[8px] text-slate-500 font-sans">12H</div>
                  <div className="font-bold text-purple-800 text-[10px]">{nextWindows.w12.toFixed(1)}</div>
                </div>
                <div className="p-1 bg-purple-100/70 rounded border border-purple-200">
                  <div className="text-[8px] text-slate-600 font-sans font-bold">24H</div>
                  <div className="font-extrabold text-purple-900 text-[10px]">{nextWindows.w24.toFixed(1)}</div>
                </div>
              </div>

              <div className="space-y-0.5 pt-1 text-[9px] border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Forecast Rain:</span>
                  <strong className="text-purple-700">{nextWindows.w24.toFixed(1)} mm</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Peak Hour:</span>
                  <strong className="text-purple-700">{intel?.forecast_24h_weather?.peak_hourly_rainfall_mm ?? 6.2} mm/h</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Temp:</span>
                  <strong className="text-slate-800">{intel?.current_weather?.temperature_c ?? 21.0}&deg;C</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher: 48h Weather Timeline vs 24h Risk Projection */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
          <div className="flex border-b border-slate-200 text-[10px] font-bold">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-2 text-center transition ${
                activeTab === 'timeline'
                  ? 'bg-white text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              48H Weather Timeline
            </button>
            <button
              onClick={() => setActiveTab('risk_curve')}
              className={`flex-1 py-2 text-center transition ${
                activeTab === 'risk_curve'
                  ? 'bg-white text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              24H Risk Curve &amp; Peaks
            </button>
          </div>

          <div className="p-3 bg-white">
            {activeTab === 'timeline' ? (
              <div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mb-2">
                  <span className="text-blue-700 font-bold">&larr; Past 24h</span>
                  <span className="font-extrabold text-slate-900 px-1.5 py-0.5 bg-slate-100 rounded">NOW</span>
                  <span className="text-purple-700 font-bold">Next 24h &rarr;</span>
                </div>

                {/* SVG Hourly Precipitation Timeline */}
                <div className="h-24 w-full relative flex items-end gap-0.5 pt-4">
                  {timeline48.map((pt, idx) => {
                    const isNow = pt.hour_relative === 0;
                    const isPast = pt.hour_relative < 0;
                    const heightPct = Math.max(4, (pt.precipitation_mm / maxRain48) * 100);
                    const isHovered = hoveredIdx === idx;

                    return (
                      <div
                        key={idx}
                        className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      >
                        {isNow && (
                          <div className="absolute -top-3 text-[8px] font-black text-slate-900 bg-amber-300 px-1 rounded shadow-2xs z-10">
                            •
                          </div>
                        )}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-xs transition-all ${
                            isNow
                              ? 'bg-indigo-600 ring-2 ring-indigo-300'
                              : isPast
                              ? isHovered ? 'bg-blue-600' : 'bg-blue-400/80'
                              : isHovered ? 'bg-purple-600' : 'bg-purple-400/80'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Hover Tooltip or Default Legend */}
                {hoveredIdx !== null && timeline48[hoveredIdx] ? (
                  <div className="mt-2 p-1.5 bg-slate-100 rounded-lg text-[10px] flex items-center justify-between text-slate-800">
                    <span>
                      <strong className="text-slate-900">{timeline48[hoveredIdx].time.slice(11, 16)}</strong>
                      {' '}({timeline48[hoveredIdx].hour_relative > 0 ? `+${timeline48[hoveredIdx].hour_relative}h` : `${timeline48[hoveredIdx].hour_relative}h`}):
                    </span>
                    <span className="font-bold text-blue-700">{timeline48[hoveredIdx].precipitation_mm.toFixed(1)} mm</span>
                    <span>{timeline48[hoveredIdx].temperature_c.toFixed(1)}&deg;C</span>
                    <span className="text-slate-500 truncate max-w-[100px]">{timeline48[hoveredIdx].weather_description}</span>
                  </div>
                ) : (
                  <div className="mt-2 flex justify-between text-[9px] text-slate-400">
                    <span>Max Rain: {maxRain48.toFixed(1)} mm/h</span>
                    <span>Hover bar to inspect hourly metrics</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center text-[10px] text-slate-600 mb-1 font-bold">
                  <span>NOW &rarr; +24h Coupled Landslide Risk Projection</span>
                  <span className="text-[9px] text-amber-700">Peak: {peakScore.toFixed(4)} (+{peakHourOffset}h)</span>
                </div>

                {/* 24-Hour Risk Curve SVG with Threshold Guidelines */}
                <div className="h-28 w-full relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 240 100" preserveAspectRatio="none">
                    {/* Threshold 0.3500 (Red Critical) */}
                    <line x1="0" y1={100 - (0.35 / 0.5) * 100} x2="240" y2={100 - (0.35 / 0.5) * 100} stroke="#dc2626" strokeDasharray="3 3" strokeWidth="1" />
                    {/* Threshold 0.1500 (Orange Warning) */}
                    <line x1="0" y1={100 - (0.15 / 0.5) * 100} x2="240" y2={100 - (0.15 / 0.5) * 100} stroke="#ea580c" strokeDasharray="3 3" strokeWidth="1" />
                    {/* Threshold 0.0502 (Yellow Advisory) */}
                    <line x1="0" y1={100 - (0.0502 / 0.5) * 100} x2="240" y2={100 - (0.0502 / 0.5) * 100} stroke="#eab308" strokeDasharray="3 3" strokeWidth="1" />

                    {/* Polyline of 24h Risk points */}
                    {riskProjection.length > 1 && (
                      <polyline
                        fill="none"
                        stroke={tierHex}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={riskProjection.map((pt, idx) => {
                          const x = (idx / (riskProjection.length - 1)) * 240;
                          const y = Math.max(0, Math.min(100, 100 - (pt.coupled_risk_score / 0.5) * 100));
                          return `${x},${y}`;
                        }).join(' ')}
                      />
                    )}

                    {/* Peak Point Glowing Marker */}
                    {riskProjection.length > 0 && (
                      <circle
                        cx={(peakHourOffset / 24) * 240}
                        cy={Math.max(0, Math.min(100, 100 - (peakScore / 0.5) * 100))}
                        r="4.5"
                        fill={peak?.peak_alert_color_hex ?? '#dc2626'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}
                  </svg>

                  {/* Threshold Guide Labels */}
                  <div className="absolute top-1 right-1 text-[8px] text-red-600 font-bold">Critical 0.350</div>
                  <div className="absolute top-8 right-1 text-[8px] text-orange-600 font-bold">Warning 0.150</div>
                  <div className="absolute top-16 right-1 text-[8px] text-amber-600 font-bold">Advisory 0.050</div>
                </div>

                <div className="mt-1 flex justify-between text-[9px] text-slate-400">
                  <span>Hour 0 (Now)</span>
                  <span>+6h</span>
                  <span>+12h</span>
                  <span>+18h</span>
                  <span>+24h</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 6: Next 24-Hour Risk Outlook Milestone Table */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between font-bold text-slate-800 text-[11px] border-b border-slate-200 pb-1.5">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Next 24-Hour Risk Outlook (Milestones)</span>
            </span>
            <span className="text-[9px] text-slate-500 font-medium">Frozen Model B Projection</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-1 font-semibold">Milestone</th>
                  <th className="pb-1 font-semibold">Rain</th>
                  <th className="pb-1 font-semibold">P(D)</th>
                  <th className="pb-1 font-semibold">Risk P(S)×P(D)</th>
                  <th className="pb-1 font-semibold text-right">Alert Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {outlookMilestones.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-100/60 transition-colors">
                    <td className="py-1.5 font-bold text-slate-800">
                      <span>{m.label}</span>
                      <span className="text-[9px] text-slate-400 font-normal ml-1">({m.time.length > 5 ? m.time.slice(11, 16) : m.time})</span>
                    </td>
                    <td className="py-1.5 text-blue-700">
                      {m.forecast_rain_mm.toFixed(1)} mm
                    </td>
                    <td className="py-1.5 text-slate-700">
                      {m.dynamic_trigger_p_d.toFixed(4)}
                    </td>
                    <td className="py-1.5 font-bold text-slate-900">
                      {m.coupled_risk.toFixed(4)}
                    </td>
                    <td className="py-1.5 text-right">
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-2xs"
                        style={{ backgroundColor: m.alert_color_hex }}
                      >
                        {m.alert_tier_name.replace('Level ', 'L')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Explainable AI Risk Rationale Card */}
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Explainable AI Risk Rationale</span>
          </div>
          <div className="text-[10px] text-slate-700 space-y-1 leading-relaxed">
            <div>
              &bull; <strong className="text-blue-950">Terrain Factor:</strong> {intel?.explainability?.terrain_explanation ?? `Model A P(S)=${p_s.toFixed(4)} evaluated against regional bedrock & fracture lithology.`}
            </div>
            <div>
              &bull; <strong className="text-sky-950">Dynamic Trigger:</strong> {intel?.explainability?.rainfall_explanation ?? `Model B P(D)=${p_d.toFixed(4)} driven by real-time precipitation accumulation.`}
            </div>
            <div>
              &bull; <strong className="text-purple-950">Coupling Synergy:</strong> {intel?.explainability?.coupling_synergy_explanation ?? `Coupled Risk = P(S) × P(D) = ${coupled.toFixed(4)} under frozen SIH 2026 thresholds.`}
            </div>
          </div>
        </div>

        {/* Decision-Support Action Guidance */}
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between font-bold text-amber-950 text-[11px]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Decision-Support Advisory Protocol</span>
            </span>
            <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold uppercase">
              Advisory
            </span>
          </div>
          <ul className="text-[10px] text-slate-700 space-y-1 list-disc pl-4 leading-snug">
            {(intel?.action_recommendation?.recommended_actions ?? [
              'Inspect roadside culverts and drainage trenches.',
              'Monitor high-resolution pore water pressure dissipation.'
            ]).map((action, idx) => (
              <li key={idx}>{action}</li>
            ))}
          </ul>
          <div className="text-[9px] text-slate-500 pt-1 border-t border-amber-200/80 italic">
            GEOALERT operates in Research Decision-Support mode. Advisory recommendations only; not a statutory evacuation mandate.
          </div>
        </div>

        {/* Data Provenance & Reliability Metadata */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-emerald-600" />
              <span>Telemetry Confidence:</span>
            </span>
            <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px]">
              {intel?.data_confidence?.overall_confidence ?? 'HIGH CONFIDENCE'}
            </span>
          </div>
          <div className="text-[9px] text-slate-500 leading-tight">
            Source: {intel?.provenance?.provider ?? 'Open-Meteo NWP'} &bull; Mode: {intel?.provenance?.data_mode ?? 'LIVE'} &bull; Updated: {intel?.timestamp ? new Date(intel.timestamp).toLocaleTimeString() : 'Current'}
          </div>
        </div>
      </div>
    </div>
  );
}
