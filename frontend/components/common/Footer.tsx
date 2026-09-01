import React from 'react';
import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-white/80 backdrop-blur-md border-t border-slate-200/80 text-slate-600 text-xs mt-12 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <div>
              <div className="font-extrabold text-slate-900 text-base tracking-tight">GEOALERT</div>
              <p className="text-slate-500 text-[11px]">
                Dual-Model Spatio-Temporal Landslide Intelligence & Precipitation Trigger System
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Risk Map</Link>
            <Link href="/analytics" className="hover:text-blue-600 transition-colors">Analytics</Link>
            <Link href="/infrastructure" className="hover:text-blue-600 transition-colors">Corridors</Link>
            <Link href="/methodology" className="hover:text-blue-600 transition-colors">Methodology</Link>
            <Link href="/about" className="hover:text-blue-600 transition-colors">Provenance & Models</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] font-mono text-slate-500">
          <div>
            <strong className="text-slate-800">Operational Formula:</strong>
            <p className="mt-0.5">Risk(x,y,t) = Model A P(S) × Model B P(D)</p>
          </div>
          <div>
            <strong className="text-slate-800">Frozen Thresholds:</strong>
            <p className="mt-0.5">T_coup = 0.0502 | Safety Floor P(S) = 0.1500</p>
          </div>
          <div>
            <strong className="text-slate-800">Spatial Extent:</strong>
            <p className="mt-0.5">3,156 Regional Cells (Meghalaya EPSG:4326)</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-200 text-slate-500 text-[11px]">
          <div>
            &copy; 2026 <strong>GEOALERT</strong> &bull; Powered by Smart India Hackathon (SIH 2026) Research Architecture.
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Research & Advisory Prototype &bull; Not a Live Operational Public Broadcast</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
