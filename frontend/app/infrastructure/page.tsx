'use client';

import React from 'react';
import { Truck, ShieldAlert, AlertTriangle, CheckCircle2, Flame, MapPin } from 'lucide-react';

const CORRIDORS = [
  {
    corridor_id: 'CORR_01',
    corridor_name: 'Shillong — Guwahati Expressway (NH-40)',
    route_code: 'NH-40',
    distance_km: 103,
    static_susceptibility: 0.6120,
    dry_risk: 0.0116,
    dry_tier: 'Level 1: Green',
    monsoon_risk: 0.3846,
    monsoon_tier: 'Level 4: Red',
    cloudburst_risk: 0.4576,
    cloudburst_tier: 'Level 4: Red',
    critical_vulnerability: 'Steep cut slopes along Umiam lake escarpment with high truck traffic density.'
  },
  {
    corridor_id: 'CORR_02',
    corridor_name: 'Jowai — Ratacherra Mining Highway (NH-44 / NH-6)',
    route_code: 'NH-44 / NH-6',
    distance_km: 142,
    static_susceptibility: 0.6845,
    dry_risk: 0.0129,
    dry_tier: 'Level 1: Green',
    monsoon_risk: 0.4301,
    monsoon_tier: 'Level 4: Red',
    cloudburst_risk: 0.5118,
    cloudburst_tier: 'Level 4: Red',
    critical_vulnerability: 'Heavy overburden coal transport vibrations and active drainage gully erosion.'
  },
  {
    corridor_id: 'CORR_03',
    corridor_name: 'Shillong — Cherrapunjee Tourist Arterial (SH-5)',
    route_code: 'SH-5',
    distance_km: 54,
    static_susceptibility: 0.6910,
    dry_risk: 0.0131,
    dry_tier: 'Level 1: Green',
    monsoon_risk: 0.4342,
    monsoon_tier: 'Level 4: Red',
    cloudburst_risk: 0.5167,
    cloudburst_tier: 'Level 4: Red',
    critical_vulnerability: 'Extreme orographic precipitation zone and deep canyon road traverses.'
  },
  {
    corridor_id: 'CORR_04',
    corridor_name: 'Tura — Rongram — Phulbari Arterial (SH-12)',
    route_code: 'SH-12',
    distance_km: 88,
    static_susceptibility: 0.2454,
    dry_risk: 0.0046,
    dry_tier: 'Level 1: Green',
    monsoon_risk: 0.1542,
    monsoon_tier: 'Level 3: Orange',
    cloudburst_risk: 0.1835,
    cloudburst_tier: 'Level 3: Orange',
    critical_vulnerability: 'Gentle western hills with localized flash-flood saturated road shoulders.'
  },
  {
    corridor_id: 'CORR_05',
    corridor_name: 'Mairang — Nongstoin Ridge Road (MDR-22)',
    route_code: 'MDR-22',
    distance_km: 72,
    static_susceptibility: 0.4992,
    dry_risk: 0.0094,
    dry_tier: 'Level 1: Green',
    monsoon_risk: 0.3137,
    monsoon_tier: 'Level 3: Orange',
    cloudburst_risk: 0.3733,
    cloudburst_tier: 'Level 4: Red',
    critical_vulnerability: 'High ridge exposures with shallow regolith soil subject to heavy saturation creep.'
  }
];

export default function InfrastructurePage() {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            GEOALERT Infrastructure Risk &bull; Critical Transport Corridors
          </h1>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
            5 Highway Simulations
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
          Multi-scenario stress test across critical Northeast highway lifelines. Evaluates how changing meteorological forcing pushes transport corridors across risk alert thresholds.
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>SCENARIO STRESS TEST &bull; Not an official live road closure order.</span>
        </div>
      </div>

      {/* Corridor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CORRIDORS.map((c) => (
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

              {/* Static Susceptibility */}
              <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600 font-medium">Model A Terrain P(S):</span>
                <strong className="text-indigo-700 font-bold">{c.static_susceptibility.toFixed(4)}</strong>
              </div>

              {/* 3-Scenario Stress Test Matrix */}
              <div className="mt-3 space-y-2 text-xs font-mono">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Scenario Progression:
                </div>

                <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 font-semibold">
                  <span>1. Dry Season:</span>
                  <div className="flex items-center gap-1.5">
                    <strong>{c.dry_risk.toFixed(4)}</strong>
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded font-bold">Green</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 font-semibold">
                  <span>2. Active Monsoon:</span>
                  <div className="flex items-center gap-1.5">
                    <strong>{c.monsoon_risk.toFixed(4)}</strong>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      c.monsoon_tier.includes('Red') ? 'bg-red-200 text-red-900' : 'bg-orange-200 text-orange-900'
                    }`}>
                      {c.monsoon_tier.split(': ')[1]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-xl text-red-950 font-semibold">
                  <span>3. Cloudburst:</span>
                  <div className="flex items-center gap-1.5">
                    <strong>{c.cloudburst_risk.toFixed(4)}</strong>
                    <span className="text-[10px] bg-red-200 text-red-900 px-1.5 py-0.5 rounded font-bold">Red</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Geotechnical Vulnerability Note */}
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 leading-normal font-sans">
              <strong className="text-slate-800">Key Vulnerability:</strong> {c.critical_vulnerability}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
