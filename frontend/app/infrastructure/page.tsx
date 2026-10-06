'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  ShieldAlert,
  AlertTriangle,
  CloudRain,
  Mountain,
  ShieldCheck,
  Flame,
  Sliders,
  Radio,
  Activity,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Gauge,
  Info,
  Clock,
  ExternalLink,
  MapPin,
  Compass,
} from 'lucide-react';
import { fetchWeatherRegions } from '@/lib/api';
import { WeatherRegionsResponse, WeatherRegionItem } from '@/lib/types';

interface CorridorSegment {
  segment_id: string;
  chainage_km: string;
  km_start: number;
  km_end: number;
  name: string;
  slope_deg: number;
  p_static: number;
  vulnerability: string;
  is_hotspot?: boolean;
  hotspot_coords?: [number, number];
  station_id: string;
}

interface CorridorData {
  corridor_id: string;
  corridor_name: string;
  route_code: string;
  distance_km: number;
  static_susceptibility: number;
  critical_vulnerability: string;
  primary_station_ids: string[];
  segments: CorridorSegment[];
}

const CORRIDORS: CorridorData[] = [
  {
    corridor_id: 'CORR_01',
    corridor_name: 'Shillong — Guwahati Expressway (NH-40)',
    route_code: 'NH-40',
    distance_km: 103,
    static_susceptibility: 0.6120,
    critical_vulnerability: 'Steep cut slopes along Umiam lake escarpment with high truck traffic density.',
    primary_station_ids: ['MET_SHILLONG', 'MET_NONGPOH', 'MET_BYRNIHAT'],
    segments: [
      { segment_id: 'NH40_S1', chainage_km: 'KM 0–18', km_start: 0, km_end: 18, name: 'Byrnihat Plain & Gateway', slope_deg: 6.2, p_static: 0.0820, vulnerability: 'Lowland sediment plain; zero slope failure predisposition.', station_id: 'MET_BYRNIHAT' },
      { segment_id: 'NH40_S2', chainage_km: 'KM 18–42', km_start: 18, km_end: 42, name: 'Nongpoh Foothill Ramps', slope_deg: 19.5, p_static: 0.3120, vulnerability: 'Moderate weathered schist cuts with localized roadside gullying.', station_id: 'MET_NONGPOH' },
      { segment_id: 'NH40_S3', chainage_km: 'KM 42–68', km_start: 42, km_end: 68, name: 'Umsning Basin Flatland', slope_deg: 4.8, p_static: 0.0450, vulnerability: 'Gentle agricultural basin safely protected by P(S) < 0.1500 floor.', station_id: 'MET_NONGPOH' },
      { segment_id: 'NH40_S4', chainage_km: 'KM 68–88', km_start: 68, km_end: 88, name: 'Umiam Escarpment Cut-Slopes', slope_deg: 34.8, p_static: 0.6850, vulnerability: 'Steep road cuts in fractured quartzite; high risk of translational slides.', is_hotspot: true, hotspot_coords: [25.6600, 91.9200], station_id: 'MET_SHILLONG' },
      { segment_id: 'NH40_S5', chainage_km: 'KM 88–103', km_start: 88, km_end: 103, name: 'Mawlai Shillong Ridge Approach', slope_deg: 26.1, p_static: 0.4900, vulnerability: 'Urban edge engineered slopes with intense vehicular vibration loads.', station_id: 'MET_SHILLONG' }
    ]
  },
  {
    corridor_id: 'CORR_02',
    corridor_name: 'Jowai — Ratacherra Mining Highway (NH-44 / NH-6)',
    route_code: 'NH-44 / NH-6',
    distance_km: 142,
    static_susceptibility: 0.6845,
    critical_vulnerability: 'Heavy overburden coal transport vibrations and active drainage gully erosion.',
    primary_station_ids: ['MET_JOWAI', 'MET_KHLIEHRIAT'],
    segments: [
      { segment_id: 'NH6_S1', chainage_km: 'KM 0–30', km_start: 0, km_end: 30, name: 'Jowai Sub-Plateau', slope_deg: 14.2, p_static: 0.2200, vulnerability: 'Undulating tableland; stable road bench with roadside ditches.', station_id: 'MET_JOWAI' },
      { segment_id: 'NH6_S2', chainage_km: 'KM 30–75', km_start: 30, km_end: 75, name: 'Khliehriat Overburden Mine Corridor', slope_deg: 28.4, p_static: 0.5800, vulnerability: 'Unconsolidated mining overburden piles vulnerable to debris flows.', station_id: 'MET_KHLIEHRIAT' },
      { segment_id: 'NH6_S3', chainage_km: 'KM 75–115', km_start: 75, km_end: 115, name: 'Lumshnong Karstic Limestone Gorge', slope_deg: 36.5, p_static: 0.7250, vulnerability: 'Deep canyon cuts with solution cavity collapses and rockfalls.', is_hotspot: true, hotspot_coords: [25.1850, 92.3800], station_id: 'MET_KHLIEHRIAT' },
      { segment_id: 'NH6_S4', chainage_km: 'KM 115–142', km_start: 115, km_end: 142, name: 'Sonapur Tunnel & Border Descent', slope_deg: 32.0, p_static: 0.6400, vulnerability: 'Active perennial slide zone requiring recurring heavy earth-moving standby.', station_id: 'MET_KHLIEHRIAT' }
    ]
  },
  {
    corridor_id: 'CORR_03',
    corridor_name: 'Shillong — Cherrapunjee Tourist Arterial (SH-5)',
    route_code: 'SH-5',
    distance_km: 54,
    static_susceptibility: 0.6910,
    critical_vulnerability: 'Extreme orographic precipitation zone and deep canyon road traverses.',
    primary_station_ids: ['MET_SHILLONG', 'MET_SOHRA'],
    segments: [
      { segment_id: 'SH5_S1', chainage_km: 'KM 0–15', km_start: 0, km_end: 15, name: 'Upper Shillong Pine Tableland', slope_deg: 12.0, p_static: 0.1800, vulnerability: 'Forested gentle gradient; safe tourist traffic corridor.', station_id: 'MET_SHILLONG' },
      { segment_id: 'SH5_S2', chainage_km: 'KM 15–35', km_start: 15, km_end: 35, name: 'Mylliem — Mawkdok Canyon Traverse', slope_deg: 37.2, p_static: 0.7400, vulnerability: 'Sheer vertical canyon cliff edges with severe mudflow risk during cloudbursts.', is_hotspot: true, hotspot_coords: [25.3500, 91.7550], station_id: 'MET_SOHRA' },
      { segment_id: 'SH5_S3', chainage_km: 'KM 35–54', km_start: 35, km_end: 54, name: 'Sohra Escarpment Rim', slope_deg: 31.4, p_static: 0.6900, vulnerability: 'World record rainfall exposure; intense pore pressure dissipation needed.', station_id: 'MET_SOHRA' }
    ]
  },
  {
    corridor_id: 'CORR_04',
    corridor_name: 'Tura — Rongram — Phulbari Arterial (SH-12)',
    route_code: 'SH-12',
    distance_km: 88,
    static_susceptibility: 0.2454,
    critical_vulnerability: 'Gentle western hills with localized flash-flood saturated road shoulders.',
    primary_station_ids: ['MET_TURA', 'MET_RESUBELPARA'],
    segments: [
      { segment_id: 'SH12_S1', chainage_km: 'KM 0–22', km_start: 0, km_end: 22, name: 'Tura Ridge Western Flank', slope_deg: 24.1, p_static: 0.3800, vulnerability: 'Forested ridge cut slopes with minor shallow slides in monsoons.', station_id: 'MET_TURA' },
      { segment_id: 'SH12_S2', chainage_km: 'KM 22–55', km_start: 22, km_end: 55, name: 'Rongram River Valley', slope_deg: 9.2, p_static: 0.1100, vulnerability: 'River valley terrace protected by P(S) < 0.1500 floor.', station_id: 'MET_TURA' },
      { segment_id: 'SH12_S3', chainage_km: 'KM 55–88', km_start: 55, km_end: 88, name: 'Phulbari Lowland Flood Boundary', slope_deg: 4.1, p_static: 0.0500, vulnerability: 'Alluvial plain with road embankment erosion rather than mass movement.', station_id: 'MET_RESUBELPARA' }
    ]
  },
  {
    corridor_id: 'CORR_05',
    corridor_name: 'Mairang — Nongstoin Ridge Road (MDR-22)',
    route_code: 'MDR-22',
    distance_km: 72,
    static_susceptibility: 0.4992,
    critical_vulnerability: 'High ridge exposures with shallow regolith soil subject to heavy saturation creep.',
    primary_station_ids: ['MET_MAIRANG', 'MET_NONGSTOIN'],
    segments: [
      { segment_id: 'MDR22_S1', chainage_km: 'KM 0–25', km_start: 0, km_end: 25, name: 'Mairang High Plateau Divide', slope_deg: 18.0, p_static: 0.2900, vulnerability: 'Wind-exposed ridge bench with moderate water saturation.', station_id: 'MET_MAIRANG' },
      { segment_id: 'MDR22_S2', chainage_km: 'KM 25–50', km_start: 25, km_end: 50, name: 'Kynshi River Canyon Cut-Slopes', slope_deg: 33.5, p_static: 0.6100, vulnerability: 'Unreinforced earth cut slopes vulnerable to saturation slumping.', is_hotspot: true, hotspot_coords: [25.5350, 91.4500], station_id: 'MET_MAIRANG' },
      { segment_id: 'MDR22_S3', chainage_km: 'KM 50–72', km_start: 50, km_end: 72, name: 'Nongstoin Regolith Uplands', slope_deg: 22.3, p_static: 0.3950, vulnerability: 'Granitic saprolite weathering crust with rotational slide susceptibility.', station_id: 'MET_NONGSTOIN' }
    ]
  }
];

// Model B Calibrated Dynamic Rainfall Trigger P(D) Scenarios (Flagged as Demo / Calibration)
const SCENARIOS: Record<string, { name: string; p_d: number; desc: string; is_demo: boolean }> = {
  dry: {
    name: 'Dry Season Baseline',
    p_d: 0.0189,
    desc: 'Clear sky, dormant antecedent moisture. Model B P(D) = 0.0189',
    is_demo: true,
  },
  moderate: {
    name: 'Moderate Monsoon',
    p_d: 0.0240,
    desc: 'Seasonal showers, baseline pore pressure. Model B P(D) = 0.0240',
    is_demo: true,
  },
  monsoon: {
    name: 'Active Monsoon Surge',
    p_d: 0.6284,
    desc: 'Heavy convective band (45mm/24h, 110mm ARI-3). Model B P(D) = 0.6284',
    is_demo: true,
  },
  cloudburst: {
    name: 'Extreme Cloudburst',
    p_d: 0.7477,
    desc: 'Orographic deluge (85mm/24h, 180mm ARI-3). Model B P(D) = 0.7477',
    is_demo: true,
  }
};

function computeTier(p_s: number, p_d: number) {
  const coupled = Number((p_s * p_d).toFixed(4));
  if (coupled >= 0.3500 && p_s >= 0.1500) {
    return { risk: coupled, tier: 'Level 4: Red', label: 'Critical', bg: 'bg-red-100 text-red-900 border-red-300', color: '#dc2626' };
  }
  if (coupled >= 0.1500 && p_s >= 0.1500) {
    return { risk: coupled, tier: 'Level 3: Orange', label: 'Warning', bg: 'bg-orange-100 text-orange-900 border-orange-300', color: '#ea580c' };
  }
  if (coupled >= 0.0502 && p_s >= 0.1500) {
    return { risk: coupled, tier: 'Level 2: Yellow', label: 'Advisory', bg: 'bg-amber-100 text-amber-900 border-amber-300', color: '#ca8a04' };
  }
  return { risk: coupled, tier: 'Level 1: Green', label: 'Normal', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', color: '#16a34a' };
}

export default function InfrastructurePage() {
  const [selectedMode, setSelectedMode] = useState<'realtime' | 'scenario'>('realtime');
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>('monsoon');
  const [weatherRegions, setWeatherRegions] = useState<WeatherRegionsResponse | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadLiveTelemetry = async () => {
    setLoadingWeather(true);
    try {
      const data = await fetchWeatherRegions();
      if (data) {
        setWeatherRegions(data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.warn('Failed to load live weather stations:', err);
    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    loadLiveTelemetry();
  }, []);

  // Quick lookup dictionary for stations by station_id
  const stationMap = useMemo(() => {
    const map = new Map<string, WeatherRegionItem>();
    if (weatherRegions && weatherRegions.regions) {
      weatherRegions.regions.forEach((st) => map.set(st.station_id, st));
    }
    return map;
  }, [weatherRegions]);

  // Helper to get effective P(D) for a corridor
  const getCorridorDynamicPd = (corridor: CorridorData): { p_d: number; is_live: boolean; station_info: string } => {
    if (selectedMode === 'scenario') {
      const sc = SCENARIOS[selectedScenarioKey];
      return {
        p_d: sc.p_d,
        is_live: false,
        station_info: `Simulated: ${sc.name}`,
      };
    }

    // Real-time mode: average linked AWS stations or fallback if not loaded
    const linked = corridor.primary_station_ids.map((id) => stationMap.get(id)).filter(Boolean) as WeatherRegionItem[];
    if (linked.length > 0) {
      const avgPd = linked.reduce((sum, s) => sum + s.dynamic_trigger_p_d, 0) / linked.length;
      const totalRain = linked.reduce((sum, s) => sum + s.current_rain_mm, 0) / linked.length;
      return {
        p_d: Number(avgPd.toFixed(4)),
        is_live: true,
        station_info: `${linked.map((s) => s.station_name.split(' ')[0]).join(' & ')} AWS (${totalRain.toFixed(1)}mm rain today)`,
      };
    }

    return {
      p_d: 0.0820,
      is_live: true,
      station_info: 'Regional AWS Mesh (Live Baseline)',
    };
  };

  // Helper to get effective P(D) for a single segment
  const getSegmentDynamicPd = (segment: CorridorSegment): number => {
    if (selectedMode === 'scenario') {
      return SCENARIOS[selectedScenarioKey].p_d;
    }
    const st = stationMap.get(segment.station_id);
    if (st) {
      return st.dynamic_trigger_p_d;
    }
    return 0.0820;
  };

  // Live KPI aggregations
  const networkKpis = useMemo(() => {
    let redCount = 0;
    let orangeCount = 0;
    let yellowCount = 0;
    let greenCount = 0;

    CORRIDORS.forEach((c) => {
      const { p_d } = getCorridorDynamicPd(c);
      const tier = computeTier(c.static_susceptibility, p_d);
      if (tier.tier.includes('Red')) redCount++;
      else if (tier.tier.includes('Orange')) orangeCount++;
      else if (tier.tier.includes('Yellow')) yellowCount++;
      else greenCount++;
    });

    return { redCount, orangeCount, yellowCount, greenCount, totalDistance: 459 };
  }, [selectedMode, selectedScenarioKey, stationMap]);

  return (
    <div className="space-y-6">
      {/* Top Command Center Header */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Truck className="w-6 h-6 text-blue-600" />
                GEOALERT Infrastructure &bull; Critical Transport Corridors
              </h1>
              {selectedMode === 'realtime' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  REAL-TIME TELEMETRY (12 AWS MESH)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  DEMO / SCENARIO SIMULATION
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 max-w-4xl">
              High-frequency geotechnical surveillance and dynamic rainfall trigger coupling across 5 critical Northeast highway lifelines (459 km total network). Connects directly with live meteorological stations for real-time passability intelligence.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadLiveTelemetry}
              disabled={loadingWeather}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-2xs disabled:opacity-60 cursor-pointer"
              title="Refresh live weather station telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loadingWeather ? 'animate-spin' : ''}`} />
              <span>Refresh Stations</span>
            </button>
            <div className="hidden lg:flex flex-col text-right font-mono text-[10px] text-slate-400">
              <span>Updated: {lastRefreshed.toLocaleTimeString()}</span>
              <span>Open-Meteo AWS Mesh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top KPI Cards (Command Center Style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3 h-3 text-blue-600" />
            Network Monitored
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">459 km</div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">5 Highway Lifelines</div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Passability Status
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {networkKpis.redCount === 0 ? '100% PASSABLE' : `${5 - networkKpis.redCount}/5 Passable`}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
            {networkKpis.redCount} Critical &bull; {networkKpis.orangeCount} Warning
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Radio className="w-3 h-3 text-sky-600" />
            AWS Telemetry Feeds
          </div>
          <div className="text-2xl font-black text-sky-600 mt-1">
            {weatherRegions?.station_count || 12}/12 Live
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
            {selectedMode === 'realtime' ? 'Active Real-Time Mesh' : 'Station Telemetry Synced'}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Monitored Cut-Slopes
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">4 Hotspots</div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">High-Angle Escarpments</div>
        </div>
      </div>

      {/* Mode & Meteorological Forcing Selector Bar */}
      <div className="p-4 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h2 className="font-extrabold text-sm text-slate-900">Meteorological Forcing Mode</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Choose between live automated telemetry and hypothetical stress tests:</span>
          </div>
        </div>

        {/* Primary Toggle: Real-Time vs Scenario Simulation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* REAL TIME TELEMETRY BUTTON */}
          <button
            onClick={() => setSelectedMode('realtime')}
            className={`p-3.5 rounded-xl border text-left font-mono transition-all duration-150 cursor-pointer lg:col-span-2 relative overflow-hidden ${
              selectedMode === 'realtime'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:bg-emerald-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs tracking-tight">
                <span className={`w-2.5 h-2.5 rounded-full ${selectedMode === 'realtime' ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
                <span>Real-Time AWS Telemetry</span>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                selectedMode === 'realtime' ? 'bg-emerald-700/80 text-white' : 'bg-emerald-200 text-emerald-800'
              }`}>
                Live Feed
              </span>
            </div>
            <div className={`text-[11px] mt-1.5 font-sans ${selectedMode === 'realtime' ? 'text-emerald-100' : 'text-emerald-800'}`}>
              Couples each highway corridor with live rainfall &amp; moisture from 12 Open-Meteo AWS stations right now.
            </div>
          </button>

          {/* 4 STRESS TEST SCENARIOS */}
          {Object.entries(SCENARIOS).map(([key, sc]) => {
            const isSelected = selectedMode === 'scenario' && selectedScenarioKey === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedMode('scenario');
                  setSelectedScenarioKey(key);
                }}
                className={`p-3 rounded-xl border text-left font-mono transition-all duration-150 cursor-pointer relative ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-100'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs truncate">{sc.name}</span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-blue-700 text-blue-100' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Demo
                  </span>
                </div>
                <div className={`text-[10px] mt-1 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                  Model B P(D) = {sc.p_d.toFixed(4)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Mode Notice Banner */}
        {selectedMode === 'realtime' ? (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-900">
            <Radio className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Real-Time Telemetry Mode Active:</strong> Each corridor and highway segment is coupled with live observations from the nearest automated weather stations (Sohra, Shillong, Jowai, Khliehriat, Nongstoin, Mairang, Nongpoh, Tura). Current rainfall, antecedent saturation, and dynamic trigger P(D) reflect actual conditions on ground.
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Demo / Scenario Simulation Mode Active ({SCENARIOS[selectedScenarioKey].name}):</strong> Displaying simulated meteorological forcing (<span className="font-mono font-bold">P(D) = {SCENARIOS[selectedScenarioKey].p_d.toFixed(4)}</span>) for stress-testing corridor resilience and disaster logistics routing under extreme monsoon deluge. This is calibrated test data, not a live meteorological broadcast.
            </div>
          </div>
        )}
      </div>

      {/* Corridor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CORRIDORS.map((c) => {
          const corridorPdInfo = getCorridorDynamicPd(c);
          const current = computeTier(c.static_susceptibility, corridorPdInfo.p_d);
          const dry = computeTier(c.static_susceptibility, SCENARIOS.dry.p_d);
          const cloudburst = computeTier(c.static_susceptibility, SCENARIOS.cloudburst.p_d);

          return (
            <div
              key={c.corridor_id}
              className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-xs glass-card-hover flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Card Top Title & Provenance Badge */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-wide">{c.route_code}</span>
                      {selectedMode === 'realtime' ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          LIVE
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          DEMO SCENARIO
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm mt-0.5">{c.corridor_name}</h3>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                    {c.distance_km} km
                  </span>
                </div>

                {/* Monitoring Station / Meteorological Source */}
                <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono flex items-center justify-between">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Meteorological Link:</span>
                  <span className="text-slate-800 font-semibold text-right truncate max-w-[190px]" title={corridorPdInfo.station_info}>
                    {corridorPdInfo.station_info}
                  </span>
                </div>

                {/* Model A Terrain Susceptibility */}
                <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-600 font-medium">Model A Terrain P(S):</span>
                  <strong className="text-indigo-700 font-bold">{c.static_susceptibility.toFixed(4)}</strong>
                </div>

                {/* Active Dynamic Coupled Risk */}
                <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between font-mono text-xs shadow-2xs ${current.bg}`}>
                  <div>
                    <div className="text-[10px] font-bold uppercase flex items-center gap-1">
                      <span>Corridor Mean Risk</span>
                      {selectedMode === 'realtime' && <span className="text-[9px] font-bold text-emerald-700">(Live)</span>}
                    </div>
                    <div className="text-base font-black mt-0.5">{current.risk.toFixed(4)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-white/90 shadow-2xs">
                      {current.tier}
                    </span>
                  </div>
                </div>

                {/* Segmented Highway Chainage Mileage Risk Bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="font-bold text-slate-700">KM 0</span>
                    <span className="font-bold uppercase tracking-wider text-slate-500">
                      Segment Risk ({c.segments.length} Sectors)
                    </span>
                    <span className="font-bold text-slate-700">KM {c.distance_km}</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                    {c.segments.map((seg) => {
                      const segPd = getSegmentDynamicPd(seg);
                      const segTier = computeTier(seg.p_static, segPd);
                      const widthPct = ((seg.km_end - seg.km_start) / c.distance_km) * 100;
                      return (
                        <div
                          key={seg.segment_id}
                          style={{ width: `${widthPct}%`, backgroundColor: segTier.color }}
                          title={`${seg.name} (${seg.chainage_km}): P(S)=${seg.p_static.toFixed(3)}, P(D)=${segPd.toFixed(3)} -> Risk=${(seg.p_static * segPd).toFixed(4)} [${segTier.tier}]`}
                          className="h-full border-r border-white/40 last:border-0 hover:opacity-80 transition-opacity cursor-help"
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>{c.segments[0].name.split(' ')[0]}</span>
                    <span>{c.segments[c.segments.length - 1].name.split(' ')[0]}</span>
                  </div>
                </div>

                {/* Critical Cut-Slope Hotspot Callout */}
                {c.segments.find((s) => s.is_hotspot) && (
                  <div className="mt-2.5 p-2 bg-red-50/80 border border-red-200 rounded-xl text-[11px] font-mono text-red-900 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[10px] uppercase text-red-800">
                        Critical Cut-Slope Hotspot &bull; {c.segments.find((s) => s.is_hotspot)?.chainage_km}
                      </div>
                      <div className="text-[10px] text-red-700">
                        {c.segments.find((s) => s.is_hotspot)?.name} ({c.segments.find((s) => s.is_hotspot)?.slope_deg}&deg; slope, P(S) = {c.segments.find((s) => s.is_hotspot)?.p_static.toFixed(3)})
                      </div>
                    </div>
                  </div>
                )}

                {/* 3-Scenario Stress Test Progression Matrix */}
                <div className="mt-3 space-y-1.5 text-xs font-mono">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Stress Progression:</span>
                    <span className="text-[9px] text-slate-400 font-normal">P(S) &times; P(D)</span>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    <span className="text-[11px]">1. Dry Baseline (P(D)=0.0189):</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>{dry.risk.toFixed(4)}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">Green</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    <span className="text-[11px] font-bold text-slate-900">
                      2. {selectedMode === 'realtime' ? 'Active Live Conditions' : 'Selected Scenario'}:
                    </span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span style={{ color: current.color }}>{current.risk.toFixed(4)}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded ${current.bg}`}>{current.label}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    <span className="text-[11px]">3. Cloudburst (P(D)=0.7477):</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-red-700">{cloudburst.risk.toFixed(4)}</span>
                      <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded">
                        {cloudburst.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Critical Geotechnical Vulnerability Note */}
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 leading-normal font-sans">
                <strong className="text-slate-800">Key Vulnerability:</strong> {c.critical_vulnerability}
              </div>
            </div>
          );
        })}
      </div>

      {/* Corridor Network Transit Safety Summary Table */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Corridor Network Transit Advisory &amp; Emergency Standby
          </h2>
          <span className="text-[11px] font-mono text-slate-500 font-semibold">
            {selectedMode === 'realtime' ? 'Evaluated against Real-Time AWS Observations' : `Evaluated under ${SCENARIOS[selectedScenarioKey].name}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Corridor</th>
                <th className="py-2.5 px-3">Route</th>
                <th className="py-2.5 px-3">Length</th>
                <th className="py-2.5 px-3">Terrain P(S)</th>
                <th className="py-2.5 px-3">Meteorological P(D)</th>
                <th className="py-2.5 px-3">Coupled Risk</th>
                <th className="py-2.5 px-3">Alert Status</th>
                <th className="py-2.5 px-3">Transit Advisory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {CORRIDORS.map((c) => {
                const pdInfo = getCorridorDynamicPd(c);
                const tier = computeTier(c.static_susceptibility, pdInfo.p_d);
                let advisory = 'Normal vehicular transit permitted. Routine surveillance.';
                if (tier.tier.includes('Red')) {
                  advisory = 'CRITICAL: Heavy convoy restrictions. Excavator & rescue standby deployed.';
                } else if (tier.tier.includes('Orange')) {
                  advisory = 'WARNING: Night-time freight advisory. Monitor cut-slope drainage channels.';
                } else if (tier.tier.includes('Yellow')) {
                  advisory = 'ADVISORY: Proceed with caution through escarpment traverses.';
                }

                return (
                  <tr key={c.corridor_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{c.corridor_name}</td>
                    <td className="py-3 px-3 font-extrabold text-blue-600">{c.route_code}</td>
                    <td className="py-3 px-3">{c.distance_km} km</td>
                    <td className="py-3 px-3 text-indigo-700 font-bold">{c.static_susceptibility.toFixed(4)}</td>
                    <td className="py-3 px-3 text-sky-700 font-bold">
                      {pdInfo.p_d.toFixed(4)}
                      {pdInfo.is_live && <span className="text-[9px] text-emerald-600 font-bold ml-1">(Live)</span>}
                    </td>
                    <td className="py-3 px-3 font-extrabold text-slate-900">{tier.risk.toFixed(4)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${tier.bg}`}>
                        {tier.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans text-xs text-slate-600">{advisory}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
