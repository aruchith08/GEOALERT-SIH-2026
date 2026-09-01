'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { GridGeoJSON, GridProperties, MapLayerType } from '@/lib/types';
import { SPATIAL_BLOCKS, ALERT_TIERS } from '@/lib/constants';
import { Filter, RefreshCw, Layers, Eye } from 'lucide-react';

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
  onSelectCell: (cell: GridProperties) => void;
  selectedCell: GridProperties | null;
  customDynamicPD?: number;
}

export default function RiskMapWrapper({
  geojsonData,
  onSelectCell,
  selectedCell,
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
        {/* Layer Switcher (Floating Glass Pills) */}
        <div className="flex items-center gap-1.5 font-mono">
          <Eye className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-slate-600 font-bold mr-1">Layer:</span>
          <div className="inline-flex rounded-full bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setActiveLayer('coupled_risk')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-150 ${
                activeLayer === 'coupled_risk'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Coupled Risk P(S)&times;P(D)
            </button>
            <button
              onClick={() => setActiveLayer('static_susceptibility')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-150 ${
                activeLayer === 'static_susceptibility'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Terrain P(S)
            </button>
            <button
              onClick={() => setActiveLayer('dynamic_trigger')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-150 ${
                activeLayer === 'dynamic_trigger'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rainfall P(D)
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

      {/* Map Surface */}
      <div
        className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md w-full"
        style={{ minHeight: '580px', height: '580px' }}
      >
        <LeafletMap
          features={filteredFeatures}
          onSelectCell={onSelectCell}
          selectedCellId={selectedCell?.cell_id}
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
        </div>
      </div>
    </div>
  );
}
