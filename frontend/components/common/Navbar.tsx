'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, BarChart3, Truck, BookOpen, Info, ShieldAlert, Activity, AlertTriangle, CloudOff } from 'lucide-react';
import Logo from './Logo';
import { WeatherStatus } from '@/lib/types';
import { fetchWeatherStatus } from '@/lib/api';

const NAV_ITEMS = [
  { name: 'Risk Map', href: '/', icon: Map },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Infrastructure', href: '/infrastructure', icon: Truck },
  { name: 'Methodology', href: '/methodology', icon: BookOpen },
  { name: 'About', href: '/about', icon: Info },
];

export default function Navbar() {
  const pathname = usePathname();
  const [weatherStatus, setWeatherStatus] = React.useState<WeatherStatus | null>(null);
  const [isError, setIsError] = React.useState<boolean>(false);

  React.useEffect(() => {
    async function checkStatus() {
      try {
        const s = await fetchWeatherStatus();
        setWeatherStatus(s);
        setIsError(false);
      } catch {
        setIsError(true);
      }
    }
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

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

            {/* Section 11: 4-State Weather Status Indicator */}
            {(() => {
              if (isError || weatherStatus?.mode === 'ERROR' || weatherStatus?.mode === 'UNAVAILABLE') {
                return (
                  <span className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 text-rose-800 px-3 py-1 rounded-full font-semibold shadow-2xs" title="External weather provider unreachable. Check API configuration.">
                    <CloudOff className="w-3.5 h-3.5 text-rose-600" />
                    <span>WEATHER PROVIDER UNAVAILABLE</span>
                  </span>
                );
              }

              if (weatherStatus?.mode === 'DEMO_SCENARIO' || weatherStatus?.mode === 'DEMO' || !weatherStatus?.is_live) {
                return (
                  <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-full font-semibold shadow-2xs" title="Operating with geomorphic scenarios and scenario presets.">
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    <span>DEMO / SCENARIO MODE</span>
                  </span>
                );
              }

              const age = weatherStatus?.data_age_minutes ?? 0;
              const isStale = age > 30 || weatherStatus?.mode === 'CACHED_LIVE';

              if (isStale) {
                return (
                  <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1 rounded-full font-semibold shadow-2xs" title="Telemetry cached beyond 30 min window. Fallback active.">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>WEATHER DATA STALE — Last Updated: {age > 0 ? `${age}m ago` : '35m ago'}</span>
                  </span>
                );
              }

              // State 1: Authentic Live Weather
              return (
                <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1 rounded-full font-semibold shadow-2xs" title={`Connected to ${weatherStatus?.provider_name || 'Open-Meteo NWP'}`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>LIVE WEATHER — Last Updated: {age > 0 ? `${age}m ago` : 'Just now'}</span>
                </span>
              );
            })()}
          </div>
        </div>
      </div>
    </header>
  );
}

