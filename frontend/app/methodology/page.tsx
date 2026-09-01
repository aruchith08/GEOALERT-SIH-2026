'use client';

import React from 'react';
import { BookOpen, Mountain, CloudRain, ShieldCheck, CheckCircle2, Layers, Cpu, Compass } from 'lucide-react';

export default function MethodologyPage() {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            GEOALERT Scientific Methodology &amp; Mathematical Coupling
          </h1>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
            SIH 2026 Core Architecture
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
          Complete dual-model decoupled architecture fusing static environmental slope susceptibility with dynamic precipitation triggering.
        </p>
      </div>

      {/* Core Concept: RAIN ALONE IS NOT LANDSLIDE RISK */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-2 text-slate-800">
        <h2 className="text-base font-extrabold text-blue-950 flex items-center gap-2">
          <Compass className="w-5 h-5 text-blue-600" />
          The Fundamental Principle: Rain Alone &ne; Landslide Risk
        </h2>
        <p className="text-xs leading-relaxed text-slate-700">
          Traditional early-warning systems relying purely on rainfall thresholds trigger excessive false alarms over flat terrains and fail to prioritize critically steep, fractured cut slopes. GEOALERT rigorously separates static predisposition from dynamic meteorological triggers:
        </p>
        <div className="p-3 bg-white/90 border border-blue-200 rounded-xl text-center font-mono text-sm font-bold text-slate-900 mt-2">
          {'Risk(x, y, t) = Model A P(S) \u00D7 Model B P(D)'}
        </div>
      </div>

      {/* Model A vs Model B Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Model A Card */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">MODEL A &bull; Static Susceptibility</h3>
              <p className="text-[11px] text-slate-500">16 Geotechnical &amp; Environmental Features &rarr; P(S)</p>
            </div>
          </div>

          <div className="text-xs space-y-2 text-slate-700 leading-relaxed">
            <p><strong>Artifact:</strong> <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">models/expC_random_forest.joblib</code></p>
            <p><strong>Input Features (16):</strong> Elevation, Slope, Aspect, Plan Curvature, Profile Curvature, TWI, SPI, NDVI Mean, Soil Clay %, Soil Sand %, Soil Bulk Density, Soil pH, Distance to Roads, Distance to Streams, Land Cover Code, Lithology Major.</p>
            <p><strong>Validation Metrics:</strong> ROC-AUC: <strong>0.8427</strong> | PR-AUC: <strong>0.8249</strong></p>
          </div>
        </div>

        {/* Model B Card */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-2 bg-sky-50 border border-sky-200 rounded-xl text-sky-700">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">MODEL B &bull; Dynamic Rainfall Trigger</h3>
              <p className="text-[11px] text-slate-500">10 CHIRPS Precipitation Features &rarr; P(D)</p>
            </div>
          </div>

          <div className="text-xs space-y-2 text-slate-700 leading-relaxed">
            <p><strong>Artifact:</strong> <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">models/modelB_production_pipeline.joblib</code></p>
            <p><strong>Input Features (10):</strong> Rainfall Event Day, ARI-3, ARI-7, ARI-15, ARI-30, Max 1-Day (7d), Max 3-Day (30d), Rainy Days (7d), Rainy Days (15d), Rainy Days (30d).</p>
            <p><strong>Validation Metrics:</strong> ROC-AUC: <strong>0.8712</strong> | Optimal Hazard Cutoff: <strong>0.2000</strong></p>
          </div>
        </div>
      </div>

      {/* 4-Tier Operational Alert Architecture */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          4-Tier Operational Warning Architecture
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
            <div className="font-bold text-emerald-800">Level 1: Green</div>
            <div className="text-[11px] mt-1 text-slate-600">{'Risk < 0.0502 OR P(S) < 0.15'}</div>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">Normal baseline monitoring. Safe slope stability condition.</p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950">
            <div className="font-bold text-amber-800">Level 2: Yellow</div>
            <div className="text-[11px] mt-1 text-slate-600">{'0.0502 \u2264 Risk < 0.1500'}</div>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">Advisory notice. Slope drainage watch and standby.</p>
          </div>

          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-950">
            <div className="font-bold text-orange-800">Level 3: Orange</div>
            <div className="text-[11px] mt-1 text-slate-600">{'0.1500 \u2264 Risk < 0.3500'}</div>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">Heightened warning. Heavy transport limits advised.</p>
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-950">
            <div className="font-bold text-red-800">Level 4: Red</div>
            <div className="text-[11px] mt-1 text-slate-600">{'Risk \u2265 0.3500'}</div>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">Critical landslide hazard. Immediate emergency protocols.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
