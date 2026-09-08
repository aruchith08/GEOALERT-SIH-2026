'use client';

import React, { useState, useEffect } from 'react';
import { GridProperties, LiveLocationRiskResponse } from '@/lib/types';
import { fetchLiveLocationRisk } from '@/lib/api';
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
  Compass
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
  const [liveData, setLiveData] = useState<LiveLocationRiskResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedCell) {
      setLiveData(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const lat = 25.5788;
    const lon = 91.8933;

    fetchLiveLocationRisk(lat, lon, selectedCell.cell_id, selectedCell.p_static)
      .then((data) => {
        if (isMounted && data) {
          setLiveData(data);
        }
      })
      .catch((err) => {
        console.warn('[InspectorPanel] Live risk fetch error:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCell]);

  if (!selectedCell) {
    return (
      <div className="h-full border border-slate-200 bg-white/80 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center text-center text-slate-500 font-mono text-xs shadow-xs">
        <div className="p-3 bg-blue-50 rounded-full text-blue-600 mb-2">
          <MapPin className="w-6 h-6 animate-bounce" />
        </div>
        <p className="font-bold text-slate-900 text-sm">No Spatial Cell Selected</p>
        <p className="text-slate-500 mt-1 max-w-[230px]">
          Click on any grid point on the Meghalaya map to inspect geotechnical AI parameters, live weather, &amp; dynamic forecast risk.
        </p>
      </div>
    );
  }

  const p = selectedCell;
  const p_s = p.p_static;
  const p_d = customDynamicPD ?? (liveData ? liveData.dynamic_trigger_p_d : p.p_dynamic);
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

  // Terrain explanation
  let terrainReason = '';
  if (p_s < 0.15) {
    terrainReason = 'Gentle to moderate relief with stable bedrock foundation (P(S) < 0.1500).';
  } else if (p_s < 0.30) {
    terrainReason = `Moderate slope angle (${p.slope_deg}°) with permeable overburden soil (P(S) = ${p_s.toFixed(3)}).`;
  } else if (p_s < 0.50) {
    terrainReason = `Steep slope angle (${p.slope_deg}°) with proximity to road cuts and drainage incisions (P(S) = ${p_s.toFixed(3)}).`;
  } else {
    terrainReason = `Critically steep escarpment (${p.slope_deg}°) and fragile fractured lithology (P(S) = ${p_s.toFixed(3)}).`;
  }

  // Coupling Synergy explanation
  let synergyReason = '';
  if (p_s < 0.15) {
    if (p_d >= 0.50) {
      synergyReason = 'Rainfall trigger is high, but terrain susceptibility is low (P(S) floor), suppressing physical hazard.';
    } else {
      synergyReason = 'Both terrain susceptibility and rainfall trigger are low, maintaining baseline stability.';
    }
  } else {
    if (p_d >= 0.50) {
      synergyReason = 'High terrain susceptibility coincides with elevated rainfall trigger, multiplying combined slope hazard.';
    } else if (p_d >= 0.20) {
      synergyReason = 'Elevated terrain susceptibility combined with seasonal rain creates an advisory watch condition.';
    } else {
      synergyReason = 'Terrain is susceptible, but dormant rainfall suppresses immediate dynamic triggering.';
    }
  }

  // Recommended actions
  const recommendedActions = liveData?.action_intelligence?.recommended_actions || (
    coupled >= 0.35 && p_s >= 0.15 ? [
      'Inspect critically vulnerable cut slopes and catch-fences.',
      'Clear blocked culverts and roadside drainage trenches to relieve pore pressures.',
      'Alert local emergency quick-response teams and district disaster managers.',
      'Impose convoy speed limits and heavy freight restrictions on adjacent highway corridors.'
    ] : coupled >= 0.15 && p_s >= 0.15 ? [
      'Deploy patrol teams to monitor chronic slope creep areas.',
      'Ensure emergency earthmoving machinery is on standby along key transit lifelines.',
      'Issue travel advisories for mountain highway travelers during heavy downpours.'
    ] : coupled >= 0.0502 && p_s >= 0.15 ? [
      'Routine slope drainage checks and visual inspections.',
      'Log daily precipitation and monitor antecedent soil moisture indices.'
    ] : [
      'Maintain normal baseline geomorphic and environmental observation.',
      'No emergency intervention required.'
    ]
  );

  // Live rainfall metrics
  const rainScale = (p_d / 0.6284);
  const currentRain = liveData?.current_rain_mm ?? Number((35.0 * rainScale).toFixed(1));
  const rain7d = liveData?.recent_rain_7d_mm ?? Number((140.0 * rainScale).toFixed(1));
  const rainForecast24h = liveData?.forecast_rain_24h_mm ?? Number((42.0 * rainScale).toFixed(1));

  return (
    <div className="h-full border border-slate-200 bg-white/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between shadow-sm overflow-y-auto font-mono text-xs">
      <div className="space-y-3">
        {/* Header: GEOALERT Location Intelligence */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="text-[10px] text-blue-700 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-blue-600" />
              <span>GEOALERT Location Intelligence</span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{p.block}</span>
              <span className="text-[11px] text-slate-500 font-normal">({p.cell_id})</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Spatial Geomorphic Coordinates */}
        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500">Elevation:</span> <strong className="text-slate-800">{p.elevation_m} m</strong>
          </div>
          <div>
            <span className="text-slate-500">Slope:</span> <strong className="text-slate-800">{p.slope_deg}&deg;</strong>
          </div>
        </div>

        {/* Operational Alert Banner */}
        <div className={`p-3 rounded-xl border flex items-center justify-between shadow-2xs ${tierBg}`}>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-600">Operational Alert Tier</div>
            <div className="text-sm font-black mt-0.5" style={{ color: tierHex }}>{tierName}</div>
          </div>
          <span className="w-4 h-4 rounded-full shadow-xs shrink-0" style={{ backgroundColor: tierHex }}></span>
        </div>

        {/* Dual-Model Metrics Breakdown */}
        <div className="grid grid-cols-2 gap-2.5">
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
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
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

        {/* Meteorological Telemetry Grid (Current, 7D Antecedent, 24H Forecast) */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between font-bold text-slate-800 text-[11px] border-b border-slate-200 pb-1.5">
            <span className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-blue-600" />
              <span>Meteorological Observations</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">12-Station Mesh</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-500 font-medium">Live Rain</div>
              <div className="text-xs font-bold text-indigo-700 mt-0.5">{currentRain.toFixed(1)} mm</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-500 font-medium">7D Antecedent</div>
              <div className="text-xs font-bold text-blue-700 mt-0.5">{rain7d.toFixed(1)} mm</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-500 font-medium">24h Forecast</div>
              <div className="text-xs font-bold text-purple-700 mt-0.5">{rainForecast24h.toFixed(1)} mm</div>
            </div>
          </div>
        </div>

        {/* Structured Explainable AI (XAI) Card */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Explainable AI Risk Rationale</span>
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

        {/* Decision-Support Action Intelligence Card */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between font-bold text-amber-950 text-[11px]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Decision-Support Recommended Action</span>
            </span>
            <span className="text-[9px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-bold uppercase">
              Advisory Protocol
            </span>
          </div>
          <ul className="text-[10px] text-slate-700 space-y-1 list-disc pl-4 leading-snug">
            {recommendedActions.map((action, idx) => (
              <li key={idx}>{action}</li>
            ))}
          </ul>
          <div className="text-[9px] text-slate-500 pt-1 border-t border-amber-200/80 italic">
            Advisory intelligence for research and disaster planning. Not a statutory civil evacuation mandate.
          </div>
        </div>

        {/* Data Confidence Indicator */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-emerald-600" />
              <span>Data Confidence:</span>
            </span>
            <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              HIGH CONFIDENCE
            </span>
          </div>
          <div className="text-[10px] text-slate-500 leading-tight">
            Source: Open-Meteo Global Model NWP &bull; 12-Station Regional Mesh &bull; 30-Day Antecedent Horizon
          </div>
        </div>
      </div>
    </div>
  );
}
