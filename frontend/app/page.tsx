'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { GridGeoJSON, GridProperties, DynamicRainfallFeatures } from '@/lib/types';
import { fetchSpatialGrid } from '@/lib/api';
import KPICards from '@/components/dashboard/KPICards';
import RiskMapWrapper from '@/components/map/RiskMapWrapper';
import InspectorPanel from '@/components/dashboard/InspectorPanel';
import RainfallIntelligencePanel from '@/components/dashboard/RainfallIntelligencePanel';

export default function DashboardPage() {
  const [geojsonData, setGeojsonData] = useState<GridGeoJSON | null>(null);
  const [selectedCell, setSelectedCell] = useState<GridProperties | null>(null);
  const [customDynamicPD, setCustomDynamicPD] = useState<number>(0.6284);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchSpatialGrid();
        setGeojsonData(data);
        if (data.features && data.features.length > 0) {
          const sorted = [...data.features].sort((a, b) => b.properties.coupled_risk - a.properties.coupled_risk);
          setSelectedCell(sorted[0].properties);
        }
      } catch (err) {
        console.error('Failed to load spatial surface', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRainfallChange = (features: DynamicRainfallFeatures, p_d: number) => {
    setCustomDynamicPD(p_d);
  };

  // Dynamically compute KPI card counts across all 3,156 cells using Model A P(S) * Model B P(D)
  const kpiStats = useMemo(() => {
    if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
      return { totalCells: 3156, greenCount: 2899, yellowCount: 137, orangeCount: 110, redCount: 10 };
    }
    let green = 0, yellow = 0, orange = 0, red = 0;
    for (const f of geojsonData.features) {
      const ps = f.properties.p_static;
      const pd = customDynamicPD;
      const coupled = ps * pd;

      if (coupled < 0.0502 || ps < 0.1500) {
        green++;
      } else if (coupled < 0.1500) {
        yellow++;
      } else if (coupled < 0.3500) {
        orange++;
      } else {
        red++;
      }
    }
    return {
      totalCells: geojsonData.features.length,
      greenCount: green,
      yellowCount: yellow,
      orangeCount: orange,
      redCount: red
    };
  }, [geojsonData, customDynamicPD]);

  return (
    <div className="space-y-5">
      {/* Top Hero Command Center Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              GEOALERT
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100/80 border border-blue-300 text-blue-800">
              Geospatial Hazard Intelligence
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1 max-w-3xl">
            Dual-Model Spatio-Temporal Early Warning Platform: Static Susceptibility (Model A) coupled with Dynamic Antecedent Precipitation Hazard (Model B) across 3,156 regional cells.
          </p>
        </div>

        {/* Scientific Coupling Banner (Pill) */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-700 shadow-2xs shrink-0">
          <span>Formula: <strong className="text-slate-900">Risk = P(S) &times; P(D)</strong></span>
          <span className="text-slate-300">|</span>
          <span>Threshold: <strong className="text-slate-900">T_coup = 0.0502</strong></span>
        </div>
      </div>

      {/* Hero KPI Metrics Cards — 100% Dynamically Computed from Model A * Model B */}
      <KPICards
        totalCells={kpiStats.totalCells}
        greenCount={kpiStats.greenCount}
        yellowCount={kpiStats.yellowCount}
        orangeCount={kpiStats.orangeCount}
        redCount={kpiStats.redCount}
      />

      {/* Core Innovation Visual Ribbon: RAIN + TERRAIN -> COUPLED RISK */}
      <div className="p-3 bg-blue-50/80 border border-blue-200/90 rounded-2xl flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-mono text-slate-700 shadow-2xs text-center">
        <span className="font-bold text-sky-800">1. RAINFALL &rarr; MODEL B &rarr; P(D)</span>
        <span className="text-slate-400 font-bold">+</span>
        <span className="font-bold text-indigo-800">2. TERRAIN &rarr; MODEL A &rarr; P(S)</span>
        <span className="text-slate-400 font-bold">&rarr;</span>
        <span className="font-extrabold text-purple-900 bg-purple-100/80 px-2 py-0.5 rounded-md border border-purple-200">
          3. P(S) &times; P(D) = FINAL RISK
        </span>
        <span className="text-slate-400 font-bold">&rarr;</span>
        <span className="font-bold text-red-700">4. 4-TIER WARNING</span>
      </div>

      {/* Dedicated Rainfall Intelligence Panel */}
      <RainfallIntelligencePanel
        onRainfallChange={handleRainfallChange}
        selectedStaticP_S={selectedCell ? selectedCell.p_static : 0.7152}
      />

      {/* Main Grid: Map + Side Location Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RiskMapWrapper
            geojsonData={geojsonData}
            onSelectCell={setSelectedCell}
            selectedCell={selectedCell}
            customDynamicPD={customDynamicPD}
          />
        </div>

        <div className="lg:col-span-1 h-[640px]">
          <InspectorPanel
            selectedCell={selectedCell}
            onClose={() => setSelectedCell(null)}
            customDynamicPD={customDynamicPD}
          />
        </div>
      </div>
    </div>
  );
}
