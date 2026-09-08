'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Map, BarChart3, Truck, BookOpen, Info, ShieldAlert,
  Activity, AlertTriangle, CloudOff, RefreshCw, Wifi, WifiOff
} from 'lucide-react';
import Logo from './Logo';
import { useWeatherSync } from '@/lib/useWeatherSync';

const NAV_ITEMS = [
  { name: 'Risk Map', href: '/', icon: Map },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Infrastructure', href: '/infrastructure', icon: Truck },
  { name: 'Methodology', href: '/methodology', icon: BookOpen },
  { name: 'About', href: '/about', icon: Info },
];

function formatCountdown(secs: number | null): string {
  if (secs == null) return '';
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Navbar() {
  const pathname = usePathname();
  const { syncStatus, countdown, dataFreshnessStatus, isLive, dataAgeMinutes, isLoading } = useWeatherSync();

  const prov = dataFreshnessStatus;
  const age = dataAgeMinutes;
  const ageStr = age != null && age > 0 ? `${Math.round(age)} min ago` : null;

  const renderWeatherIndicator = () => {
    if (isLoading) {
      return (
        <span className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-full font-semibold shadow-2xs">
          <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
          <span>Connecting…</span>
        </span>
      );
    }

    // INITIALIZING / CONNECTING
    if (prov === 'INITIALIZING' || prov === 'CONNECTING') {
      return (
        <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full font-semibold shadow-2xs">
          <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
          <span className="hidden sm:inline">↻ Fetching live weather...</span>
          <span className="sm:hidden">Connecting...</span>
        </span>
      );
    }

    // ERROR / UNAVAILABLE
    if (prov === 'ERROR') {
      return (
        <span
          className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 text-rose-800 px-3 py-1 rounded-full font-semibold shadow-2xs"
          title="External weather provider unreachable. Retained data active."
        >
          <CloudOff className="w-3.5 h-3.5 text-rose-600" />
          <span className="hidden lg:inline">
            {ageStr ? `⚠ WEATHER PROVIDER UNAVAILABLE — Last valid: ${ageStr}` : '⚠ WEATHER PROVIDER UNAVAILABLE'}
          </span>
          <span className="lg:hidden">UNAVAILABLE</span>
        </span>
      );
    }

    // FALLBACK
    if (prov === 'FALLBACK') {
      return (
        <span
          className="flex items-center gap-1.5 bg-orange-50 border border-orange-300 text-orange-900 px-3 py-1 rounded-full font-semibold shadow-2xs"
          title="Serving calibrated terrain fallback data. Provider connectivity degraded."
        >
          <WifiOff className="w-3.5 h-3.5 text-orange-600" />
          <span className="hidden lg:inline">
            {ageStr ? `⚠ FALLBACK DATA — Last valid: ${ageStr}` : '⚠ FALLBACK DATA'}
          </span>
          <span className="lg:hidden">FALLBACK</span>
        </span>
      );
    }

    // STALE
    if (prov === 'STALE') {
      return (
        <span
          className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1 rounded-full font-semibold shadow-2xs"
          title={`Weather data is stale (>${syncStatus?.interval_seconds ? Math.round(syncStatus.interval_seconds / 60) : 20} min old).`}
        >
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span className="hidden lg:inline">
            ⚠ STALE WEATHER DATA{ageStr ? ` — Updated ${ageStr}` : ''}
          </span>
          <span className="lg:hidden">STALE</span>
        </span>
      );
    }

    // DEMO_SCENARIO
    if (prov === 'DEMO_SCENARIO') {
      return (
        <span
          className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-full font-semibold shadow-2xs"
          title="Operating with scenario presets. Connect to a live provider for telemetry."
        >
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span>DEMO / SCENARIO MODE</span>
        </span>
      );
    }

    // CACHED_LIVE
    if (prov === 'CACHED_LIVE') {
      return (
        <span
          className="flex items-center gap-1.5 bg-teal-50 border border-teal-300 text-teal-800 px-3 py-1 rounded-full font-semibold shadow-2xs"
          title="Source: Open-Meteo (Cached). Next sync in progress."
        >
          <span className="w-2 h-2 rounded-full bg-teal-400" />
          <span className="hidden lg:inline">
            ● CACHED LIVE{ageStr ? ` — Last successful update: ${ageStr}` : ''}
            {countdown != null && countdown > 0 ? ` · Next in ${formatCountdown(countdown)}` : ''}
          </span>
          <span className="lg:hidden">CACHED LIVE</span>
        </span>
      );
    }

    // LIVE — authentic external telemetry
    return (
      <span
        className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1 rounded-full font-semibold shadow-2xs"
        title="Source: Open-Meteo"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="hidden xl:inline">
          ● LIVE WEATHER — {ageStr ? `Updated ${ageStr}` : 'Updated just now'}
          {countdown != null && countdown > 0 ? ` · Next in ${formatCountdown(countdown)}` : ''}
        </span>
        <span className="hidden lg:inline xl:hidden">
          LIVE{ageStr ? ` — ${ageStr}` : ' — Just now'}
        </span>
        <span className="lg:hidden">LIVE</span>
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Logo size={34} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                  GEOALERT
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 uppercase tracking-wide">
                  SIH 2026
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block -mt-0.5">
                AI Geospatial Landslide Risk Intelligence
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 font-medium text-xs">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Status Indicators (Pills) */}
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="hidden lg:flex items-center gap-1.5 bg-slate-100/90 border border-slate-200 text-slate-700 px-3 py-1 rounded-full font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
              <span>RESEARCH / ADVISORY</span>
            </span>

            {/* Live Freshness Indicator with Countdown */}
            {renderWeatherIndicator()}
          </div>
        </div>
      </div>
    </header>
  );
}


