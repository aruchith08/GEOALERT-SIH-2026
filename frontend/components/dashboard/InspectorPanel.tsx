'use client';

import React from 'react';
import { GridProperties } from '@/lib/types';
import {
  MapPin,
  Mountain,
  CloudRain,
  ShieldAlert,
  X,
  Sparkles
} from 'lucide-react';

interface InspectorPanelProps {
  selectedCell: GridProperties | null;
  onClose: () => void;
  customDynamicPD?: number;
}

export default function InspectorPanel({
  selectedCell,
  onClose,
  customDynamicPD
}: InspectorPanelProps) {
  if (!selectedCell) {
    return (
      <div className="h-full border border-slate-200 bg-white/80 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center text-center text-slate-500 font-mono text-xs shadow-xs">
        <div className="p-3 bg-blue-50 rounded-full text-blue-600 mb-2">
          <MapPin className="w-6 h-6 animate-bounce" />
        </div>
        <p className="font-bold text-slate-900 text-sm">No Spatial Cell Selected</p>
        <p className="text-slate-500 mt-1 max-w-[230px]">
          Click on any grid point on the Meghalaya map to inspect geotechnical AI parameters &amp; dynamic rainfall triggering.
        </p>
      </div>
    );
  }

  const p = selectedCell;
  const p_d = customDynamicPD ?? p.p_dynamic;
  const p_s = p.p_static;
  const coupled = Number((p_s * p_d).toFixed(4));

  let tierName = 'Level 1: Green';
  let tierHex = '#16a34a';
  let tierBg = 'bg-emerald-50 border-emerald-200 text-emerald-950';
  let tierDesc = 'Routine baseline monitoring. Safe terrain condition.';

  if (coupled >= 0.35 && p_s >= 0.15) {
    tierName = 'Level 4: Red';
    tierHex = '#dc2626';
    tierBg = 'bg-red-50 border-red-200 text-red-950';
    tierDesc = 'Critical landslide hazard. Immediate emergency protocols and slope closures.';
  } else if (coupled >= 0.15 && p_s >= 0.15) {
    tierName = 'Level 3: Orange';
    tierHex = '#ea580c';
    tierBg = 'bg-orange-50 border-orange-200 text-orange-950';
    tierDesc = 'Heightened warning. Travel caution and heavy transport limits.';
  } else if (coupled >= 0.0502 && p_s >= 0.15) {
    tierName = 'Level 2: Yellow';
    tierHex = '#ca8a04';
    tierBg = 'bg-amber-50 border-amber-200 text-amber-950';
    tierDesc = 'Advisory notice. Maintenance standby and slope drainage watch.';
  }

  let terrainReason = '';
  if (p_s < 0.15) {
    terrainReason = 'Gentle to moderate relief with stable bedrock foundation (P(S) < 0.15).';
  } else if (p_s < 0.30) {
    terrainReason = `Moderate slope angle with permeable overburden soil (P(S) = ${p_s.toFixed(3)}).`;
  } else if (p_s < 0.50) {
    terrainReason = `Steep slope angle with proximity to road cuts and drainage incisions (P(S) = ${p_s.toFixed(3)}).`;
  } else {
    terrainReason = `Critically steep escarpment and fragile fractured lithology (P(S) = ${p_s.toFixed(3)}).`;
  }

  let synergyReason = '';
  if (p_s < 0.15) {
    if (p_d >= 0.50) {
      synergyReason = 'Rainfall trigger is high, but static terrain susceptibility is low, suppressing the combined risk.';
    } else {
      synergyReason = 'Both terrain susceptibility and rainfall trigger are low, maintaining baseline stability.';
    }
  } else {
    if (p_d >= 0.50) {
      synergyReason = 'High terrain susceptibility coincides with elevated rainfall trigger, multiplying the combined landslide risk.';
    } else if (p_d >= 0.20) {
      synergyReason = 'Elevated terrain susceptibility combined with seasonal rain creates an advisory watch condition.';
    } else {
      synergyReason = 'Terrain is susceptible, but dormant rainfall suppresses immediate dynamic triggering.';
    }
  }

  return (
    <div className="h-full border border-slate-200 bg-white/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between shadow-sm overflow-y-auto font-mono text-xs">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3 mb-3">
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{p.cell_id}</div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              {p.block}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Operational Alert Banner */}
        <div className={`p-3 rounded-xl border mb-3 flex items-center justify-between shadow-2xs ${tierBg}`}>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-600">Operational Alert Tier</div>
            <div className="text-sm font-black mt-0.5" style={{ color: tierHex }}>{tierName}</div>
          </div>
          <span className="w-4 h-4 rounded-full shadow-xs" style={{ backgroundColor: tierHex }}></span>
        </div>

        {/* Dual-Model Metrics Breakdown */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div className="p-2.5 bg-slate-50 border border-indigo-200/80 rounded-xl shadow-2xs">
            <div className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
              <Mountain className="w-3 h-3" />
              Model A: Static
            </div>
            <div className="text-lg font-black text-indigo-950 mt-0.5">{p_s.toFixed(4)}</div>
            <div className="text-[10px] text-slate-500">Terrain P(S) (16 feats)</div>
          </div>

          <div className="p-2.5 bg-slate-50 border border-sky-200/80 rounded-xl shadow-2xs">
            <div className="text-[10px] font-bold text-sky-700 flex items-center gap-1">
              <CloudRain className="w-3 h-3" />
              Model B: Dynamic
            </div>
            <div className="text-lg font-black text-sky-950 mt-0.5">{p_d.toFixed(4)}</div>
            <div className="text-[10px] text-slate-500">Rainfall P(D) (CHIRPS)</div>
          </div>
        </div>

        {/* Coupled Risk Score & Progress */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 shadow-2xs">
          <div className="flex justify-between text-slate-700 mb-1 font-semibold">
            <span>Coupled Risk [P(S) &times; P(D)]</span>
            <strong className="text-slate-900">{coupled.toFixed(4)}</strong>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(coupled * 200, 100)}%`,
                backgroundColor: tierHex
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
            <span>0.0 (Safe)</span>
            <span>Threshold T_coup: 0.0502</span>
            <span>1.0 (Critical)</span>
          </div>
        </div>

        {/* Geotechnical Terrain Parameters */}
        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-3">
          <div>
            <span className="text-slate-500">Elevation:</span> <strong className="text-slate-800">{p.elevation_m} m</strong>
          </div>
          <div>
            <span className="text-slate-500">Slope:</span> <strong className="text-slate-800">{p.slope_deg}&deg;</strong>
          </div>
        </div>

        {/* "Why is this location at risk?" Explainability Card */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Why is this location at risk?</span>
          </div>

          <div className="text-[11px] text-slate-700 space-y-1.5 leading-relaxed">
            <div>
              &bull; <strong className="text-blue-950">Terrain Factor:</strong> {terrainReason}
            </div>
            <div>
              &bull; <strong className="text-sky-950">Coupling Synergy:</strong> {synergyReason}
            </div>
          </div>
        </div>
      </div>

      {/* Advisory Action Notice */}
      <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-600 leading-normal">
        <div className="flex items-center gap-1 font-bold text-slate-900 mb-0.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          <span>Recommended Protocol:</span>
        </div>
        <p>{tierDesc}</p>
      </div>
    </div>
  );
}
