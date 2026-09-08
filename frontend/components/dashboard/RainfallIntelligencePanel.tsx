'use client';

import React, { useState, useEffect } from 'react';
import {
  CloudRain,
  Sliders,
  Zap,
  Activity,
  ShieldCheck,
  Flame,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Radio,
  Calendar,
  RefreshCw,
  Sun,
  Droplets,
  Thermometer
} from 'lucide-react';
import {
  DynamicRainfallFeatures,
  WeatherStatus,
  WeatherCurrentResponse,
  DailyWeatherPoint
} from '@/lib/types';
import {
  fetchWeatherStatus,
  fetchCurrentWeather,
  fetchWeatherHistory,
  fetchWeatherForecast,
  evaluateRainfallScenario
} from '@/lib/api';

interface RainfallIntelligencePanelProps {
  onRainfallChange?: (features: DynamicRainfallFeatures, p_d: number) => void;
  selectedStaticP_S?: number;
}

const PRESETS: Record<string, { name: string; description: string; features: DynamicRainfallFeatures }> = {
  dry_season: {
    name: 'Dry Season',
    description: 'Non-monsoon clear skies, low antecedent moisture.',
    features: {
      rainfall_event_day: 0.0,
      ari_3: 0.0,
      ari_7: 0.0,
      ari_15: 2.0,
      ari_30: 5.0,
      max_1day_7d: 0.0,
      max_3day_30d: 2.0,
      rainy_days_7d: 0,
      rainy_days_15d: 1,
      rainy_days_30d: 2
    }
  },
  moderate_monsoon: {
    name: 'Moderate Monsoon',
    description: 'Steady seasonal rain with baseline pore saturation.',
    features: {
      rainfall_event_day: 20.0,
      ari_3: 35.0,
      ari_7: 70.0,
      ari_15: 120.0,
      ari_30: 200.0,
      max_1day_7d: 20.0,
      max_3day_30d: 45.0,
      rainy_days_7d: 3,
      rainy_days_15d: 7,
      rainy_days_30d: 12
    }
  },
  monsoon_surge_section34: {
    name: 'Active Monsoon Surge',
    description: 'Heavy regional episode (45mm event, 110mm ARI-3).',
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
    }
  },
  extreme_cloudburst: {
    name: 'Extreme Cloudburst',
    description: 'High-intensity orographic deluge exceeding 95th percentile.',
    features: {
      rainfall_event_day: 85.0,
      ari_3: 180.0,
      ari_7: 290.0,
      ari_15: 480.0,
      ari_30: 780.0,
      max_1day_7d: 85.0,
      max_3day_30d: 220.0,
      rainy_days_7d: 6,
      rainy_days_15d: 13,
      rainy_days_30d: 24
    }
  }
};

export default function RainfallIntelligencePanel({
  onRainfallChange,
  selectedStaticP_S = 0.7152
}: RainfallIntelligencePanelProps) {
  // Mode: 'LIVE' or 'DEMO'
  const [activeTab, setActiveTab] = useState<'LIVE' | 'DEMO'>('LIVE');
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus | null>(null);
  const [liveWeather, setLiveWeather] = useState<WeatherCurrentResponse | null>(null);
  const [historySeries, setHistorySeries] = useState<DailyWeatherPoint[]>([]);
  const [forecastSeries, setForecastSeries] = useState<DailyWeatherPoint[]>([]);
  const [loadingLive, setLoadingLive] = useState<boolean>(false);

  // Scenario Mode State
  const [activePreset, setActivePreset] = useState<string>('monsoon_surge_section34');
  const [features, setFeatures] = useState<DynamicRainfallFeatures>(
    PRESETS.monsoon_surge_section34.features
  );
  const [dynamicPD, setDynamicPD] = useState<number>(0.6284);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Initial load of weather status and live weather
  useEffect(() => {
    loadWeatherData();
  }, []);

  const loadWeatherData = async () => {
    setLoadingLive(true);
    try {
      const [status, curr, hist, fore] = await Promise.all([
        fetchWeatherStatus(),
        fetchCurrentWeather(25.5788, 91.8933),
        fetchWeatherHistory(25.5788, 91.8933, 7),
        fetchWeatherForecast(25.5788, 91.8933, 7)
      ]);

      setWeatherStatus(status);
      setLiveWeather(curr);
      setHistorySeries(hist);
      setForecastSeries(fore);

      // If in LIVE mode, automatically set current features and P(D)
      if (activeTab === 'LIVE' && curr) {
        setFeatures(curr.features);
        setDynamicPD(curr.dynamic_trigger_p_d);
        if (onRainfallChange) {
          onRainfallChange(curr.features, curr.dynamic_trigger_p_d);
        }
      }
    } catch (err) {
      console.error('Failed to load weather telemetry:', err);
    } finally {
      setLoadingLive(false);
    }
  };

  const handleTabSwitch = (tab: 'LIVE' | 'DEMO') => {
    setActiveTab(tab);
    if (tab === 'LIVE' && liveWeather) {
      setFeatures(liveWeather.features);
      setDynamicPD(liveWeather.dynamic_trigger_p_d);
      if (onRainfallChange) {
        onRainfallChange(liveWeather.features, liveWeather.dynamic_trigger_p_d);
      }
    } else if (tab === 'DEMO') {
      const p = PRESETS[activePreset];
      setFeatures(p.features);
      runEvaluation(p.features, p.name);
    }
  };

  const runEvaluation = async (updatedFeats: DynamicRainfallFeatures, name?: string) => {
    setIsEvaluating(true);
    try {
      const res = await evaluateRainfallScenario(updatedFeats, name);
      setDynamicPD(res.dynamic_trigger_p_d);
      if (onRainfallChange) {
        onRainfallChange(updatedFeats, res.dynamic_trigger_p_d);
      }
    } catch (err) {
      console.error('Evaluation failed', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSelectPreset = (key: string) => {
    setActivePreset(key);
    const p = PRESETS[key];
    setFeatures(p.features);
    runEvaluation(p.features, p.name);
  };

  const handleFeatureChange = (key: keyof DynamicRainfallFeatures, value: number) => {
    const updated = { ...features, [key]: value };
    setFeatures(updated);
    setActivePreset('custom');
    runEvaluation(updated, 'Custom User Scenario');
  };

  // Coupled Risk Calculation for display
  const coupledRisk = Number((selectedStaticP_S * dynamicPD).toFixed(4));
  let tierLabel = 'Level 1: Green';
  let tierHex = '#16a34a';
  let tierBg = 'bg-emerald-50 border-emerald-200 text-emerald-900';
  let tierName = 'Low / Baseline Normal';

  if (coupledRisk >= 0.35 && selectedStaticP_S >= 0.15) {
    tierLabel = 'Level 4: Red';
    tierHex = '#dc2626';
    tierBg = 'bg-red-50 border-red-200 text-red-900';
    tierName = 'Critical / Immediate Trigger';
  } else if (coupledRisk >= 0.15 && selectedStaticP_S >= 0.15) {
    tierLabel = 'Level 3: Orange';
    tierHex = '#ea580c';
    tierBg = 'bg-orange-50 border-orange-200 text-orange-900';
    tierName = 'Warning / Heightened Hazard';
  } else if (coupledRisk >= 0.0502 && selectedStaticP_S >= 0.15) {
    tierLabel = 'Level 2: Yellow';
    tierHex = '#ca8a04';
    tierBg = 'bg-amber-50 border-amber-200 text-amber-900';
    tierName = 'Advisory / Early Watch';
  }

  return (
    <div className="bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-sm text-xs space-y-4 font-mono">
      {/* Header & Mode Switcher Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 shadow-2xs">
            <CloudRain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight font-sans">
              Rainfall Intelligence &amp; Dynamic Trigger Engine
            </h3>
            <p className="text-[11px] font-medium text-slate-500 font-sans">
              Model B (10 CHIRPS Predictors) &bull; Real-Time Telemetry &amp; Scenario Intelligence
            </p>
          </div>
        </div>

        {/* Mode Toggle Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-full border border-slate-200 shadow-inner text-[11px]">
          <button
            onClick={() => handleTabSwitch('LIVE')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all duration-150 ${
              activeTab === 'LIVE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>LIVE WEATHER</span>
          </button>

          <button
            onClick={() => handleTabSwitch('DEMO')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all duration-150 ${
              activeTab === 'DEMO'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>DEMO SCENARIOS</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE WEATHER TELEMETRY */}
      {activeTab === 'LIVE' && (
        <div className="space-y-3">
          {/* Live Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50/60 border border-blue-200/80 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-800 text-[11px]">
                {weatherStatus?.is_live ? 'Connected to Open-Meteo NWP Stream' : 'Calibrated Regional Baseline'}
              </span>
              <span className="text-[10px] text-slate-500">
                &bull; Shillong Weather Station (25.58°N, 91.89°E)
              </span>
            </div>

            <button
              onClick={loadWeatherData}
              disabled={loadingLive}
              className="flex items-center gap-1 text-[10px] text-blue-700 hover:text-blue-900 font-semibold"
            >
              <RefreshCw className={`w-3 h-3 ${loadingLive ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>

          {/* Current Real-World Weather Cards */}
          {liveWeather && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] font-semibold">
                  <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                  <span>Temperature</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {liveWeather.current.temperature_c.toFixed(1)}&deg;C
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {liveWeather.current.weather_description}
                </div>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] font-semibold">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                  <span>Relative Humidity</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {liveWeather.current.relative_humidity_pct.toFixed(0)}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Soil evaporation index</div>
              </div>

              <div className="p-2.5 bg-white border border-sky-200 rounded-xl shadow-2xs">
                <div className="flex items-center justify-center gap-1 text-sky-700 text-[10px] font-bold">
                  <CloudRain className="w-3.5 h-3.5 text-sky-600" />
                  <span>Today's Rain (P0)</span>
                </div>
                <div className="text-lg font-black text-sky-900 mt-0.5">
                  {liveWeather.features.rainfall_event_day.toFixed(1)} mm
                </div>
                <div className="text-[10px] text-sky-600 mt-0.5">24h Event Accumulation</div>
              </div>

              <div className="p-2.5 bg-white border border-indigo-200 rounded-xl shadow-2xs">
                <div className="flex items-center justify-center gap-1 text-indigo-700 text-[10px] font-bold">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Antecedent Moisture</span>
                </div>
                <div className="text-lg font-black text-indigo-900 mt-0.5">
                  {liveWeather.features.ari_7.toFixed(0)} mm
                </div>
                <div className="text-[10px] text-indigo-600 mt-0.5">
                  7-Day ARI-7 ({liveWeather.features.rainy_days_7d} rainy days)
                </div>
              </div>
            </div>
          )}

          {/* Real-time Precipitation Timeline: Past 7 Days & Next 7 Days */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-1.5">
              <span>Observed Antecedent (Past 7d) vs Numerical Forecast (Next 7d)</span>
              <span className="text-[10px] font-normal text-slate-500">Unit: mm / day</span>
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-14 gap-1 text-center">
              {/* Past 7 days */}
              {historySeries.map((h, i) => (
                <div key={`hist-${i}`} className="p-1 rounded bg-slate-200/80 text-[9px]">
                  <div className="text-slate-500 truncate">{h.date.slice(5)}</div>
                  <div className="font-bold text-slate-800 mt-0.5">{h.precipitation_sum_mm.toFixed(0)}</div>
                  <div className="text-[8px] text-slate-400">Obs</div>
                </div>
              ))}

              {/* Next 7 forecast days */}
              {forecastSeries.map((f, i) => (
                <div key={`fore-${i}`} className="p-1 rounded bg-sky-100 border border-sky-200 text-[9px]">
                  <div className="text-sky-800 font-semibold truncate">{f.date.slice(5)}</div>
                  <div className="font-bold text-sky-950 mt-0.5">{f.precipitation_sum_mm.toFixed(0)}</div>
                  <div className="text-[8px] text-sky-600">+{i + 1}d</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEMO / SCENARIO SIMULATION */}
      {activeTab === 'DEMO' && (
        <div className="space-y-3">
          {/* Preset Scenario Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 text-xs">Meteorological Presets:</span>
              <span className="text-[11px] text-slate-400">Calibrated CHIRPS Scenarios</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => handleSelectPreset(key)}
                  className={`p-2.5 rounded-xl border text-left transition-all duration-150 ${
                    activePreset === key
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm ring-2 ring-blue-100'
                      : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className={`font-bold text-xs truncate ${activePreset === key ? 'text-white' : 'text-slate-900'}`}>
                    {p.name}
                  </div>
                  <div className={`text-[10px] mt-0.5 truncate ${activePreset === key ? 'text-blue-100' : 'text-slate-500'}`}>
                    {p.features.rainfall_event_day}mm / 24h &bull; {p.features.ari_3}mm ARI-3
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Feature Sliders */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-1.5 font-bold">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Fine-Tune Rainfall Predictors:</span>
              </div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>{showAdvanced ? 'Collapse' : 'All 10 Features'}</span>
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="flex justify-between text-slate-700 mb-1 font-semibold">
                  <span>Event Day Rain (P0):</span>
                  <strong className="text-blue-700">{features.rainfall_event_day.toFixed(1)} mm</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={150}
                  step={1}
                  value={features.rainfall_event_day}
                  onChange={(e) => handleFeatureChange('rainfall_event_day', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="flex justify-between text-slate-700 mb-1 font-semibold">
                  <span>3-Day Antecedent (ARI-3):</span>
                  <strong className="text-blue-700">{features.ari_3.toFixed(1)} mm</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={300}
                  step={5}
                  value={features.ari_3}
                  onChange={(e) => handleFeatureChange('ari_3', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="flex justify-between text-slate-700 mb-1 font-semibold">
                  <span>7-Day Antecedent (ARI-7):</span>
                  <strong className="text-blue-700">{features.ari_7.toFixed(1)} mm</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={10}
                  value={features.ari_7}
                  onChange={(e) => handleFeatureChange('ari_7', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="flex justify-between text-slate-700 mb-1 font-semibold">
                  <span>30-Day Antecedent (ARI-30):</span>
                  <strong className="text-blue-700">{features.ari_30.toFixed(1)} mm</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1200}
                  step={20}
                  value={features.ari_30}
                  onChange={(e) => handleFeatureChange('ari_30', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] p-2.5 bg-slate-100 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-slate-600">ARI-15 (mm):</span>
                  <input
                    type="number"
                    value={features.ari_15}
                    onChange={(e) => handleFeatureChange('ari_15', parseFloat(e.target.value) || 0)}
                    className="w-full mt-0.5 p-1 bg-white border rounded"
                  />
                </div>
                <div>
                  <span className="text-slate-600">Max 1-Day (7d):</span>
                  <input
                    type="number"
                    value={features.max_1day_7d}
                    onChange={(e) => handleFeatureChange('max_1day_7d', parseFloat(e.target.value) || 0)}
                    className="w-full mt-0.5 p-1 bg-white border rounded"
                  />
                </div>
                <div>
                  <span className="text-slate-600">Max 3-Day (30d):</span>
                  <input
                    type="number"
                    value={features.max_3day_30d}
                    onChange={(e) => handleFeatureChange('max_3day_30d', parseFloat(e.target.value) || 0)}
                    className="w-full mt-0.5 p-1 bg-white border rounded"
                  />
                </div>
                <div>
                  <span className="text-slate-600">Rainy Days 7d:</span>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    value={features.rainy_days_7d}
                    onChange={(e) => handleFeatureChange('rainy_days_7d', parseInt(e.target.value) || 0)}
                    className="w-full mt-0.5 p-1 bg-white border rounded"
                  />
                </div>
                <div>
                  <span className="text-slate-600">Rainy Days 15d:</span>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={features.rainy_days_15d}
                    onChange={(e) => handleFeatureChange('rainy_days_15d', parseInt(e.target.value) || 0)}
                    className="w-full mt-0.5 p-1 bg-white border rounded"
                  />
                </div>
                <div>
                  <span className="text-slate-600">Rainy Days 30d:</span>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={features.rainy_days_30d}
                    onChange={(e) => handleFeatureChange('rainy_days_30d', parseInt(e.target.value) || 0)}
                    className="w-full mt-0.5 p-1 bg-white border rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DUAL-MODEL REAL-TIME INFERENCE CHAIN */}
      <div className="p-3 bg-slate-50/90 border border-slate-200/90 rounded-xl space-y-2">
        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1">
          <span>Dual-Model Real-Time Inference Output</span>
          {isEvaluating && <span className="text-blue-600 text-[10px] animate-pulse">Running Model B...</span>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 bg-white border border-sky-200 rounded-xl shadow-2xs">
            <div className="text-[10px] font-bold text-sky-700 uppercase">1. Dynamic Hazard P(D)</div>
            <div className="text-xl font-black text-sky-900 mt-0.5">{dynamicPD.toFixed(4)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Model B (CHIRPS)</div>
          </div>

          <div className="p-2 bg-white border border-indigo-200 rounded-xl shadow-2xs">
            <div className="text-[10px] font-bold text-indigo-700 uppercase">2. Terrain P(S)</div>
            <div className="text-xl font-black text-indigo-900 mt-0.5">{selectedStaticP_S.toFixed(4)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Model A (16 Feats)</div>
          </div>

          <div className="p-2 bg-white border border-purple-200 rounded-xl shadow-2xs">
            <div className="text-[10px] font-bold text-purple-700 uppercase">3. Coupled Risk</div>
            <div className="text-xl font-black text-purple-900 mt-0.5">{coupledRisk.toFixed(4)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">P(S) &times; P(D)</div>
          </div>

          <div className={`p-2 rounded-xl border shadow-2xs ${tierBg}`}>
            <div className="text-[10px] font-bold uppercase" style={{ color: tierHex }}>4. Alert Tier</div>
            <div className="text-sm font-extrabold mt-0.5 truncate" style={{ color: tierHex }}>{tierLabel}</div>
            <div className="text-[10px] font-medium text-slate-600 mt-0.5 truncate">{tierName}</div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600" />
          <span>
            {activeTab === 'LIVE'
              ? `Live Ingestion Mode: ${liveWeather?.provider || 'Open-Meteo'}`
              : 'Interactive Scenario Mode: Presets + Sliders'}
          </span>
        </div>
        <div>T_coup = 0.0502 | Floor P(S) = 0.1500</div>
      </div>
    </div>
  );
}
