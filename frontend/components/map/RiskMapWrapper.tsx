'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { GridGeoJSON, GridProperties, MapLayerType } from '@/lib/types';
import { SPATIAL_BLOCKS, ALERT_TIERS } from '@/lib/constants';
import { Filter, RefreshCw, Layers, Eye, AlertTriangle, ShieldCheck, Mountain, CloudRain, Droplets, Calendar, TrendingUp } from 'lucide-react';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-mono text-xs border border-slate-200"
      style={{ height: '580px', minHeight: '580px' }}
    >
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        <span>Initializing GEOALERT Web GIS Canvas...</span>
      </div>
    </div>
  )
});

interface RiskMapWrapperProps {
  geojsonData: GridGeoJSON | null;
  onSelectCell: (cell: GridProperties, coords?: [number, number]) => void;
  selectedCell: GridProperties | null;
  selectedCoords?: [number, number] | null;
  customDynamicPD?: number;
}

export default function RiskMapWrapper({
  geojsonData,
  onSelectCell,
  selectedCell,
  selectedCoords,
  customDynamicPD
}: RiskMapWrapperProps) {
  const [selectedBlock, setSelectedBlock] = useState<string>('All Blocks');
  const [selectedTier, setSelectedTier] = useState<string>('All Tiers');
  const [minRisk, setMinRisk] = useState<number>(0.0);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>('coupled_risk');

  const filteredFeatures = useMemo(() => {
    if (!geojsonData || !geojsonData.features) return [];
    return geojsonData.features.filter((f) => {
      const p = f.properties;
      if (selectedBlock !== 'All Blocks') {
        const blockName = selectedBlock.replace(' Block', '').toLowerCase();
        if (!p.block.toLowerCase().includes(blockName)) return false;
      }
      if (selectedTier !== 'All Tiers') {
        if (p.alert_level !== selectedTier) return false;
      }
      if (minRisk > 0 && p.coupled_risk < minRisk) return false;
      return true;
    });
  }, [geojsonData, selectedBlock, selectedTier, minRisk]);

  return (
    <div className="flex flex-col gap-3">
      {/* Top Filter Bar + Layer Switcher */}
      <div className="p-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        {/* Layer Switcher (6 Layers per Section 14 & 15) */}
        <div className="flex items-center gap-1.5 font-mono flex-wrap">
          <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-slate-600 font-bold mr-1 shrink-0">Layer:</span>
          <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200 gap-1">
            <button
              onClick={() => setActiveLayer('coupled_risk')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 flex items-center gap-1 ${
                activeLayer === 'coupled_risk'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Coupled Risk</span>
            </button>
            <button
              onClick={() => setActiveLayer('static_susceptibility')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 flex items-center gap-1 ${
                activeLayer === 'static_susceptibility'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mountain className="w-3 h-3" />
              <span>Terrain P(S)</span>
            </button>
            <button
              onClick={() => setActiveLayer('dynamic_trigger')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 flex items-center gap-1 ${
                activeLayer === 'dynamic_trigger'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CloudRain className="w-3 h-3" />
              <span>Trigger P(D)</span>
            </button>
            <button
              onClick={() => setActiveLayer('current_rainfall')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 flex items-center gap-1 ${
                activeLayer === 'current_rainfall'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Droplets className="w-3 h-3" />
              <span>Live Rain (mm)</span>
            </button>
            <button
              onClick={() => setActiveLayer('forecast_rainfall')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 flex items-center gap-1 ${
                activeLayer === 'forecast_rainfall'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Forecast Rain</span>
            </button>
            <button
              onClick={() => setActiveLayer('forecast_risk')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 flex items-center gap-1 ${
                activeLayer === 'forecast_risk'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Forecast Risk</span>
            </button>
          </div>
        </div>

        {/* Spatial Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 text-slate-600 font-semibold">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          >
            {SPATIAL_BLOCKS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          >
            {ALERT_TIERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="text-slate-600 font-mono text-xs flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span><strong className="text-slate-900">{filteredFeatures.length}</strong> / 3,156</span>
          </div>
        </div>
      </div>

      {/* Educational False Alarm Suppression Comparison Banner */}
      {activeLayer === 'dynamic_trigger' && (
        <div className="p-3 bg-amber-50/95 border border-amber-300/90 rounded-2xl text-xs font-mono text-amber-900 shadow-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold flex items-center justify-between">
              <span>UNCOUPLED METEOROLOGICAL BASELINE (Rainfall Trigger Alone)</span>
              <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded text-amber-950">
                Evaluation Comparison Mode
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Notice that under heavy antecedent rainfall, raw meteorological models flag all 3,156 grid cells indiscriminately—including flat alluvial basins (e.g. Umsning Valley) with zero physical slope failure hazard. In contrast, <strong>Coupled GEOALERT Risk (P(S) &times; P(D))</strong> incorporates the geotechnical susceptibility floor (P(S) &ge; 0.1500), filtering out non-susceptible valley floodplains and preventing unnecessary civil evacuation alerts.
            </p>
          </div>
        </div>
      )}

      {/* Map Surface */}
      <div
        className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md w-full"
        style={{ minHeight: '580px', height: '580px' }}
      >
        <LeafletMap
          features={filteredFeatures}
          onSelectCell={onSelectCell}
          selectedCellId={selectedCell?.cell_id}
          selectedCoords={selectedCoords ?? undefined}
          activeLayer={activeLayer}
          customDynamicPD={customDynamicPD}
        />

        {/* Floating Glass Legend Matching Active Layer */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3.5 z-[1000] text-xs font-mono shadow-md max-w-[270px]">
          {activeLayer === 'coupled_risk' && (
            <>
              <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
                <span>Coupled Risk Tier</span>
                <span className="text-[10px] text-slate-500 font-normal">P(S) &times; P(D)</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Level 1: Green (&lt; 0.0502)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Level 2: Yellow (0.05–0.15)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Level 3: Orange (0.15–0.35)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Level 4: Red (&ge; 0.3500)</span>
                </div>
              </div>
            </>
          )}

          {activeLayer === 'static_susceptibility' && (
            <>
              <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
                <span>Terrain Susceptibility</span>
                <span className="text-[10px] text-blue-600 font-normal">Model A P(S)</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Low (&lt; 0.15)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Moderate (0.15–0.30)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">High (0.30–0.50)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Very High (&ge; 0.50)</span>
                </div>
              </div>
            </>
          )}

          {activeLayer === 'dynamic_trigger' && (
            <>
              <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
                <span>Dynamic Trigger</span>
                <span className="text-[10px] text-sky-600 font-normal">Model B P(D)</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Dormant (&lt; 0.20)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Elevated (0.20–0.50)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Critical Trigger (&ge; 0.50)</span>
                </div>
              </div>
            </>
          )}

          {activeLayer === 'current_rainfall' && (
            <>
              <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
                <span>Live Rainfall (mm)</span>
                <span className="text-[10px] text-indigo-600 font-normal">12-Station Mesh</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-400 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Light (&lt; 5 mm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Moderate (5–20 mm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Heavy (20–50 mm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-700 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Torrential (&ge; 50 mm)</span>
                </div>
              </div>
            </>
          )}

          {activeLayer === 'forecast_rainfall' && (
            <>
              <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
                <span>Forecast 7D Accumulation</span>
                <span className="text-[10px] text-purple-600 font-normal">Open-Meteo NWP</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-400 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Trace (&lt; 20 mm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Moderate (20–60 mm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Heavy (60–120 mm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-700 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Severe Deluge (&ge; 120 mm)</span>
                </div>
              </div>
            </>
          )}

          {activeLayer === 'forecast_risk' && (
            <>
              <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
                <span>Peak 7D Forecast Risk</span>
                <span className="text-[10px] text-rose-600 font-normal">P(S) &times; Projected P(D)</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Level 1: Green (&lt; 0.0502)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Level 2: Yellow (0.05–0.15)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Level 3: Orange (0.15–0.35)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 shrink-0"></span>
                  <span className="text-slate-700 font-medium">Level 4: Red (&ge; 0.3500)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
