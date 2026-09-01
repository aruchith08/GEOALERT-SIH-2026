'use client';

import React, { useState } from 'react';
import { Truck, ShieldAlert, AlertTriangle, CloudRain, Mountain, ShieldCheck, Flame, Sliders } from 'lucide-react';

interface CorridorData {
  corridor_id: string;
  corridor_name: string;
  route_code: string;
  distance_km: number;
  static_susceptibility: number;
  critical_vulnerability: string;
}

const CORRIDORS: CorridorData[] = [
  {
    corridor_id: 'CORR_01',
    corridor_name: 'Shillong — Guwahati Expressway (NH-40)',
    route_code: 'NH-40',
    distance_km: 103,
    static_susceptibility: 0.6120,
    critical_vulnerability: 'Steep cut slopes along Umiam lake escarpment with high truck traffic density.'
  },
  {
    corridor_id: 'CORR_02',
    corridor_name: 'Jowai — Ratacherra Mining Highway (NH-44 / NH-6)',
    route_code: 'NH-44 / NH-6',
    distance_km: 142,
    static_susceptibility: 0.6845,
    critical_vulnerability: 'Heavy overburden coal transport vibrations and active drainage gully erosion.'
  },
  {
    corridor_id: 'CORR_03',
    corridor_name: 'Shillong — Cherrapunjee Tourist Arterial (SH-5)',
    route_code: 'SH-5',
    distance_km: 54,
    static_susceptibility: 0.6910,
    critical_vulnerability: 'Extreme orographic precipitation zone and deep canyon road traverses.'
  },
  {
    corridor_id: 'CORR_04',
    corridor_name: 'Tura — Rongram — Phulbari Arterial (SH-12)',
    route_code: 'SH-12',
    distance_km: 88,
    static_susceptibility: 0.2454,
    critical_vulnerability: 'Gentle western hills with localized flash-flood saturated road shoulders.'
  },
  {
    corridor_id: 'CORR_05',
    corridor_name: 'Mairang — Nongstoin Ridge Road (MDR-22)',
    route_code: 'MDR-22',
    distance_km: 72,
    static_susceptibility: 0.4992,
    critical_vulnerability: 'High ridge exposures with shallow regolith soil subject to heavy saturation creep.'
  }
];

// Model B Calibrated Dynamic Rainfall Trigger P(D) Scenarios
const SCENARIOS: Record<string, { name: string; p_d: number; desc: string }> = {
  dry: {
    name: 'Dry Season (Baseline)',
    p_d: 0.0189,
    desc: 'Clear sky, dormant moisture. Model B P(D) = 0.0189'
  },
  moderate: {
    name: 'Moderate Monsoon',
    p_d: 0.0240,
    desc: 'Seasonal rain, baseline pore pressure. Model B P(D) = 0.0240'
  },
  monsoon: {
    name: 'Active Monsoon Surge',
    p_d: 0.6284,
    desc: 'Heavy convective band (45mm/24h, 110mm ARI-3). Model B P(D) = 0.6284'
  },
  cloudburst: {
    name: 'Extreme Cloudburst',
    p_d: 0.7477,
    desc: 'Orographic deluge (85mm/24h, 180mm ARI-3). Model B P(D) = 0.7477'
  }
};

function computeTier(p_s: number, p_d: number) {
  const coupled = Number((p_s * p_d).toFixed(4));
  if (coupled >= 0.3500 && p_s >= 0.1500) {
    return { risk: coupled, tier: 'Level 4: Red', bg: 'bg-red-100 text-red-900 border-red-300', color: '#dc2626' };
  }
  if (coupled >= 0.1500 && p_s >= 0.1500) {
    return { risk: coupled, tier: 'Level 3: Orange', bg: 'bg-orange-100 text-orange-900 border-orange-300', color: '#ea580c' };
  }
  if (coupled >= 0.0502 && p_s >= 0.1500) {
    return { risk: coupled, tier: 'Level 2: Yellow', bg: 'bg-amber-100 text-amber-900 border-amber-300', color: '#ca8a04' };
  }
  return { risk: coupled, tier: 'Level 1: Green', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', color: '#16a34a' };
}

export default function InfrastructurePage() {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>('monsoon');
  const currentScenario = SCENARIOS[selectedScenarioKey];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            GEOALERT Infrastructure Risk &bull; Critical Transport Corridors
          </h1>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
            5 Highway Lifelines &bull; ML Multi-Scenario Evaluation
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
          Multi-scenario stress test across critical Northeast highway lifelines. Evaluates how changing meteorological forcing pushes transport corridors across risk alert thresholds via Model A &times; Model B coupling.
        </p>
      </div>

      {/* Interactive Scenario Bar */}
      <div className="p-4 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Select Model B Meteorological Forcing:</span>
          </div>
          <span className="font-mono text-xs text-blue-700 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Model B P(D) = {currentScenario.p_d.toFixed(4)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(SCENARIOS).map(([key, sc]) => (
            <button
              key={key}
              onClick={() => setSelectedScenarioKey(key)}
              className={`p-3 rounded-xl border text-left font-mono transition-all duration-150 ${
                selectedScenarioKey === key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-100'
                  : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="font-bold text-xs">{sc.name}</div>
              <div className={`text-[10px] mt-0.5 ${selectedScenarioKey === key ? 'text-blue-100' : 'text-slate-500'}`}>
                P(D) = {sc.p_d.toFixed(4)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Corridor Cards Grid — 100% Model Computed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CORRIDORS.map((c) => {
          const dry = computeTier(c.static_susceptibility, SCENARIOS.dry.p_d);
          const current = computeTier(c.static_susceptibility, currentScenario.p_d);
          const cloudburst = computeTier(c.static_susceptibility, SCENARIOS.cloudburst.p_d);

          return (
            <div
              key={c.corridor_id}
              className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-xs glass-card-hover flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">{c.route_code}</span>
                    <h3 className="font-extrabold text-slate-900 text-sm mt-0.5">{c.corridor_name}</h3>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {c.distance_km} km
                  </span>
                </div>

                {/* Model A Terrain Susceptibility */}
                <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-600 font-medium">Model A Terrain P(S):</span>
                  <strong className="text-indigo-700 font-bold">{c.static_susceptibility.toFixed(4)}</strong>
                </div>

                {/* Active Dynamic Coupled Risk */}
                <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between font-mono text-xs shadow-2xs ${current.bg}`}>
                  <div>
                    <div className="text-[10px] font-bold uppercase">Active Coupled Risk</div>
                    <div className="text-base font-black mt-0.5">{current.risk.toFixed(4)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-white/80 shadow-2xs">
                      {current.tier}
                    </span>
                  </div>
                </div>

                {/* 3-Scenario Stress Test Matrix */}
                <div className="mt-3 space-y-1.5 text-xs font-mono">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Model Forcing Progression:
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    <span>1. Dry (P(D)=0.0189):</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>{dry.risk.toFixed(4)}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">Green</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    <span>2. Selected Scenario:</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span style={{ color: current.color }}>{current.risk.toFixed(4)}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded ${current.bg}`}>{current.tier.split(': ')[1]}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    <span>3. Cloudburst (P(D)=0.7477):</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-red-700">{cloudburst.risk.toFixed(4)}</span>
                      <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded">
                        {cloudburst.tier.split(': ')[1]}
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
    </div>
  );
}
