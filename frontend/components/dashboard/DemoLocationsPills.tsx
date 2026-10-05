'use client';

import React from 'react';
import { Mountain, Trees, Truck, Compass, CheckCircle2 } from 'lucide-react';

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
    scientific_lesson: 'High P(S) terrain rapidly amplifies rainfall trigger P(D), driving operational risk into Level 3 (Orange) and Level 4 (Red).'
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
    scientific_lesson: 'Safety floor P(S) < 0.1500 suppresses false alarms: even under cloudburst P(D) > 0.8, coupled risk remains Level 1 (Green).'
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
    scientific_lesson: 'Moderate-high susceptibility terrain where 3-day antecedent rainfall (ARI-3) dictates transport warning thresholds.'
  }
];

interface DemoLocationsPillsProps {
  onSelectLocation: (location: PinnedDemoLocation) => void;
  activeLocationId?: string | null;
}

export default function DemoLocationsPills({
  onSelectLocation,
  activeLocationId
}: DemoLocationsPillsProps) {
  return (
    <div className="bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 shadow-xs text-xs font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-slate-700 font-bold">
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          <span>Evaluator Pinned Demonstration Locations:</span>
        </div>
        <span className="text-[10px] text-slate-500 font-normal">
          One-Click Decision Scenario Audits
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {PINNED_LOCATIONS.map((loc) => {
          const isActive = activeLocationId === loc.id;
          const Icon =
            loc.category === 'HIGH_SUSCEPTIBILITY'
              ? Mountain
              : loc.category === 'LOW_SUSCEPTIBILITY'
              ? Trees
              : Truck;

          return (
            <button
              key={loc.id}
              onClick={() => onSelectLocation(loc)}
              className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between ${
                isActive
                  ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-100 shadow-sm'
                  : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/90 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tight ${
                      loc.category === 'HIGH_SUSCEPTIBILITY'
                        ? 'bg-red-100 text-red-800'
                        : loc.category === 'LOW_SUSCEPTIBILITY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {loc.badge}
                  </span>
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                </div>

                <div className="font-bold text-[11px] text-slate-900 flex items-center gap-1">
                  <Icon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="truncate">{loc.name}</span>
                </div>

                <div className="text-[10px] text-slate-500 mt-0.5">
                  {loc.block} &bull; P(S) = <strong className="text-slate-800">{loc.p_static.toFixed(3)}</strong> &bull; {loc.slope_deg}&deg; slope
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-200/80 text-[9px] text-slate-600 leading-tight">
                {loc.scientific_lesson}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
