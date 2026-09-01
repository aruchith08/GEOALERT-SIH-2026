'use client';

import React from 'react';
import { Info, ShieldCheck, Cpu, Database, CheckCircle2, Lock, FileCode } from 'lucide-react';
import Logo from '@/components/common/Logo';

export default function AboutPage() {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              About GEOALERT &bull; Technical Specifications
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Smart India Hackathon (SIH 2026) Landslide Risk Intelligence Platform
            </p>
          </div>
        </div>
      </div>

      {/* Production Provenance & Cryptographic Hashes */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-600" />
          Cryptographic Integrity &amp; Frozen Model Governance
        </h2>

        <div className="space-y-3 font-mono text-xs text-slate-700">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="font-bold text-indigo-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Model A: Static Susceptibility (Random Forest)</span>
            </div>
            <div className="text-[11px] text-slate-500 break-all">
              Path: <code className="text-slate-800">models/expC_random_forest.joblib</code>
            </div>
            <div className="text-[11px] text-slate-500 break-all">
              SHA-256: <code className="text-blue-700 font-bold">1691cd678c2a9184cf608a9db0e464daee1e9daf237fd2c387b6d936685d5631</code>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="font-bold text-sky-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Model B: Dynamic Rainfall Trigger (Production Pipeline)</span>
            </div>
            <div className="text-[11px] text-slate-500 break-all">
              Path: <code className="text-slate-800">models/modelB_production_pipeline.joblib</code>
            </div>
            <div className="text-[11px] text-slate-500 break-all">
              SHA-256: <code className="text-blue-700 font-bold">e30aacc2f83eaca410a9a782089300ef1e920dd21051c042385d6159d97318f2</code>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Section 34 Regional Spatial Grid (3,156 WGS84 Cells)</span>
            </div>
            <div className="text-[11px] text-slate-500 break-all">
              Path: <code className="text-slate-800">data/phase4/section34_spatial_risk/phase4_section34_regional_risk_surface.geojson</code>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>AI &amp; Backend</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            FastAPI, Scikit-Learn, Joblib, NumPy, Pandas, Pydantic, Python 3.14. Ultra-low latency dual-model inference (&lt;10ms).
          </p>
        </div>

        <div className="p-4 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Geospatial Data</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            SRTM 30m DEM, SoilGrids 250m, ESA WorldCover 10m, GSI Lithology 1:50k, CHIRPS 0.05&deg; Daily Rainfall Telemetry.
          </p>
        </div>

        <div className="p-4 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-purple-600" />
            <span>Frontend &amp; GIS UI</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Next.js 15 (App Router), React 19, Tailwind CSS 3, Leaflet Canvas, Lucide React, Glassmorphic Light Design System.
          </p>
        </div>
      </div>
    </div>
  );
}
