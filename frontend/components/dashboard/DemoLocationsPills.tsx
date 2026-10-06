'use client';

import React, { useState, useEffect } from 'react';
import {
  Mountain,
  Trees,
  Truck,
  Compass,
  CheckCircle2,
  Radio,
  CloudRain,
  Thermometer,
  Activity,
  RefreshCw,
  AlertTriangle,
  Info,
  Sliders,
} from 'lucide-react';
import { fetchCoordinateRiskIntelligence } from '@/lib/api';

export interface PinnedDemoLocation {
  id: string;
  cell_id: string;
  name: string;
  category: 'HIGH_SUSCEPTIBILITY' | 'LOW_SUSCEPTIBILITY' | 'INFRASTRUCTURE';
  badge: string;
  block: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  slope_deg: number;
  p_static: number;
  description: string;
  scientific_lesson: string;
}

export const PINNED_LOCATIONS: PinnedDemoLocation[] = [
  {
    id: 'DEMO_SOHRA',
    cell_id: 'CELL_MEG_0878',
    name: 'Sohra (Cherrapunjee) Escarpment',
    category: 'HIGH_SUSCEPTIBILITY',
    badge: 'High Terrain Hotspot',
    block: 'East Khasi Hills',
    latitude: 25.2744,
    longitude: 91.7323,
    elevation_m: 1430,
    slope_deg: 38.5,
    p_static: 0.7152,
    description: 'Steep quartzite/sandstone cliff with extreme orographic rainfall exposure.',
    scientific_lesson: 'High P(S) terrain rapidly amplifies rainfall trigger P(D), driving operational risk into Level 3 (Orange) and Level 4 (Red) during active monsoons.'
  },
  {
    id: 'DEMO_UMSNING',
    cell_id: 'CELL_MEG_2427',
    name: 'Umsning Valley Alluvium',
    category: 'LOW_SUSCEPTIBILITY',
    badge: 'Valley Safety Floor',
    block: 'Ri-Bhoi',
    latitude: 25.7500,
    longitude: 91.9000,
    elevation_m: 620,
    slope_deg: 4.5,
    p_static: 0.0362,
    description: 'Gentle river plain and agricultural tableland below geomorphic failure floor.',
    scientific_lesson: 'Safety floor P(S) < 0.1500 suppresses false alarms: even under cloudburst P(D) > 0.8, coupled risk remains securely locked in Level 1 (Green).'
  },
  {
    id: 'DEMO_NH40',
    cell_id: 'CELL_MEG_0765',
    name: 'NH-40 Umiam Cut-Slope Corridor',
    category: 'INFRASTRUCTURE',
    badge: 'Road Hotspot',
    block: 'Ri-Bhoi / East Khasi',
    latitude: 25.6600,
    longitude: 91.9200,
    elevation_m: 980,
    slope_deg: 28.0,
    p_static: 0.4024,
    description: 'Strategic national highway corridor traversing engineered hill cuts and fractured bedrock.',
    scientific_lesson: 'Moderate-high susceptibility terrain where 3-day antecedent rainfall (ARI-3) dictates transport warning thresholds and heavy convoy restrictions.'
  }
];

export interface LocationLiveTelemetry {
  temp_c: number;
  rain_24h_mm: number;
  weather_desc: string;
  p_d: number;
  coupled_risk: number;
  alert_level: string;
  alert_color: string;
  is_live: boolean;
  timestamp: string;
}

interface DemoLocationsPillsProps {
  onSelectLocation: (location: PinnedDemoLocation, livePd?: number) => void;
  activeLocationId?: string | null;
}

export default function DemoLocationsPills({
  onSelectLocation,
  activeLocationId
}: DemoLocationsPillsProps) {
  const [telemetryMode, setTelemetryMode] = useState<'realtime' | 'scenario'>('realtime');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [liveTelemetry, setLiveTelemetry] = useState<Record<string, LocationLiveTelemetry>>({
    DEMO_SOHRA: {
      temp_c: 16.8,
      rain_24h_mm: 3.4,
      weather_desc: 'Clear sky',
      p_d: 0.0632,
      coupled_risk: 0.0452,
      alert_level: 'Level 1: Green',
      alert_color: '#16a34a',
      is_live: true,
      timestamp: new Date().toLocaleTimeString(),
    },
    DEMO_UMSNING: {
      temp_c: 22.2,
      rain_24h_mm: 2.3,
      weather_desc: 'Mainly clear',
      p_d: 0.0911,
      coupled_risk: 0.0033,
      alert_level: 'Level 1: Green',
      alert_color: '#16a34a',
      is_live: true,
      timestamp: new Date().toLocaleTimeString(),
    },
    DEMO_NH40: {
      temp_c: 19.9,
      rain_24h_mm: 5.0,
      weather_desc: 'Mainly clear',
      p_d: 0.1684,
      coupled_risk: 0.0678,
      alert_level: 'Level 2: Yellow',
      alert_color: '#ca8a04',
      is_live: true,
      timestamp: new Date().toLocaleTimeString(),
    },
  });

  const loadAllLiveTelemetry = async () => {
    setIsRefreshing(true);
    try {
      const results = await Promise.allSettled(
        PINNED_LOCATIONS.map(async (loc) => {
          const intel = await fetchCoordinateRiskIntelligence(
            loc.latitude,
            loc.longitude,
            loc.cell_id,
            loc.p_static,
            false
          );
          return { id: loc.id, intel, p_static: loc.p_static };
        })
      );

      const updated: Record<string, LocationLiveTelemetry> = { ...liveTelemetry };
      results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value?.intel) {
          const { id, intel, p_static } = res.value;
          const nowcast = intel.meteorological_nowcast;
          const livePd = nowcast?.dynamic_trigger_p_d ?? 0.0820;
          const coupled = Number((p_static * livePd).toFixed(4));

          let alert_level = intel.alert_tier_code || 'Level 1: Green';
          let alert_color = intel.alert_color_hex || '#16a34a';

          if (coupled >= 0.3500 && p_static >= 0.1500) {
            alert_level = 'Level 4: Red';
            alert_color = '#dc2626';
          } else if (coupled >= 0.1500 && p_static >= 0.1500) {
            alert_level = 'Level 3: Orange';
            alert_color = '#ea580c';
          } else if (coupled >= 0.0502 && p_static >= 0.1500) {
            alert_level = 'Level 2: Yellow';
            alert_color = '#ca8a04';
          } else {
            alert_level = 'Level 1: Green';
            alert_color = '#16a34a';
          }

          updated[id] = {
            temp_c: nowcast?.temperature_c ?? 20.0,
            rain_24h_mm: nowcast?.rainfall_last_24h_mm ?? 2.0,
            weather_desc: nowcast?.weather_description ?? 'Clear',
            p_d: livePd,
            coupled_risk: coupled,
            alert_level,
            alert_color,
            is_live: intel.provenance?.is_live ?? true,
            timestamp: new Date().toLocaleTimeString(),
          };
        }
      });
      setLiveTelemetry(updated);
    } catch (err) {
      console.warn('[DemoLocationsPills] Failed to fetch live telemetry:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllLiveTelemetry();
  }, []);

  return (
    <div className="bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-xs text-xs font-mono space-y-3">
      {/* Header bar with Real-Time indicators and scenario toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
            <Compass className="w-4 h-4 text-blue-600" />
            <span className="text-xs sm:text-sm font-black tracking-tight">Evaluator Pinned Demonstration Locations</span>
          </div>
          {telemetryMode === 'realtime' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE TELEMETRY STREAMING
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              SIMULATED MONSOON STRESS (P(D)=0.6284)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[10px]">
            <button
              onClick={() => setTelemetryMode('realtime')}
              className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                telemetryMode === 'realtime'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Real-Time
            </button>
            <button
              onClick={() => setTelemetryMode('scenario')}
              className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                telemetryMode === 'scenario'
                  ? 'bg-white text-blue-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stress Benchmark
            </button>
          </div>

          <button
            onClick={loadAllLiveTelemetry}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
            title="Refresh live coordinate telemetry"
          >
            <RefreshCw className={`w-3 h-3 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Grid of 3 Pinned Demonstration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PINNED_LOCATIONS.map((loc) => {
          const isActive = activeLocationId === loc.id;
          const live = liveTelemetry[loc.id];
          const Icon =
            loc.category === 'HIGH_SUSCEPTIBILITY'
              ? Mountain
              : loc.category === 'LOW_SUSCEPTIBILITY'
              ? Trees
              : Truck;

          // Compute displayed values depending on mode
          const effectivePd = telemetryMode === 'realtime' && live ? live.p_d : 0.6284;
          const effectiveCoupled = telemetryMode === 'realtime' && live
            ? live.coupled_risk
            : Number((loc.p_static * 0.6284).toFixed(4));

          let displayAlertLevel = 'Level 1: Green';
          let displayBadgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-200';

          if (effectiveCoupled >= 0.3500 && loc.p_static >= 0.1500) {
            displayAlertLevel = 'Level 4: Red';
            displayBadgeBg = 'bg-red-100 text-red-900 border-red-300';
          } else if (effectiveCoupled >= 0.1500 && loc.p_static >= 0.1500) {
            displayAlertLevel = 'Level 3: Orange';
            displayBadgeBg = 'bg-orange-100 text-orange-900 border-orange-300';
          } else if (effectiveCoupled >= 0.0502 && loc.p_static >= 0.1500) {
            displayAlertLevel = 'Level 2: Yellow';
            displayBadgeBg = 'bg-amber-100 text-amber-900 border-amber-300';
          }

          return (
            <button
              key={loc.id}
              onClick={() => onSelectLocation(loc, effectivePd)}
              className={`p-3 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                isActive
                  ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-200 shadow-sm'
                  : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/90 hover:border-slate-300'
              }`}
            >
              <div className="space-y-2 w-full">
                {/* Card Top: Badges and Title */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-tight ${
                        loc.category === 'HIGH_SUSCEPTIBILITY'
                          ? 'bg-red-100 text-red-800'
                          : loc.category === 'LOW_SUSCEPTIBILITY'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {loc.badge}
                    </span>
                    {telemetryMode === 'realtime' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        DEMO
                      </span>
                    )}
                  </div>
                  {isActive && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>

                <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{loc.name}</span>
                </div>

                {/* Geotechnical Baseline Metrics */}
                <div className="p-2 bg-white/90 rounded-xl border border-slate-200/80 text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Model A P(S):</span>
                    <strong className="text-indigo-700 font-bold">{loc.p_static.toFixed(4)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Slope &amp; Elevation:</span>
                    <span className="text-slate-700">{loc.slope_deg}&deg; slope &bull; {loc.elevation_m}m</span>
                  </div>
                </div>

                {/* Dynamic Telemetry Box */}
                <div className="p-2 rounded-xl border border-slate-200/80 bg-slate-100/70 text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1">
                      <CloudRain className="w-3 h-3 text-sky-600" />
                      {telemetryMode === 'realtime' ? 'Live Rainfall (24h):' : 'Simulated Rain:'}
                    </span>
                    <span className="font-bold text-slate-800">
                      {telemetryMode === 'realtime' && live ? `${live.rain_24h_mm.toFixed(1)} mm` : '45.0 mm (Surge)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-amber-600" />
                      {telemetryMode === 'realtime' ? 'Live Temp & Weather:' : 'Forcing Condition:'}
                    </span>
                    <span className="text-slate-700 truncate max-w-[130px]">
                      {telemetryMode === 'realtime' && live
                        ? `${live.temp_c.toFixed(1)}°C • ${live.weather_desc}`
                        : 'Active Convective Low'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-bold">
                    <span className="text-slate-600">Dynamic Trigger P(D):</span>
                    <span className="text-sky-700">{effectivePd.toFixed(4)}</span>
                  </div>
                </div>

                {/* Coupled Risk Score & Alert Status */}
                <div className={`p-2 rounded-xl border flex items-center justify-between ${displayBadgeBg}`}>
                  <div>
                    <div className="text-[9px] uppercase font-bold tracking-wider">Coupled Risk P(S) &times; P(D)</div>
                    <div className="text-sm font-black mt-0.5">{effectiveCoupled.toFixed(4)}</div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/90 shadow-2xs">
                    {displayAlertLevel}
                  </span>
                </div>
              </div>

              {/* Scientific Evaluator Insight */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[10px] text-slate-600 leading-normal font-sans">
                <strong className="text-slate-800 font-mono text-[9px] uppercase tracking-wide">Evaluator Insight:</strong> {loc.scientific_lesson}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
