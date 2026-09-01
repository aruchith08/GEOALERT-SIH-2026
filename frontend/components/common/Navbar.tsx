'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, BarChart3, Truck, BookOpen, Info, ShieldAlert, Activity } from 'lucide-react';
import Logo from './Logo';

const NAV_ITEMS = [
  { name: 'Risk Map', href: '/', icon: Map },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Infrastructure', href: '/infrastructure', icon: Truck },
  { name: 'Methodology', href: '/methodology', icon: BookOpen },
  { name: 'About', href: '/about', icon: Info },
];

export default function Navbar() {
  const pathname = usePathname();

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

            <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full font-semibold shadow-2xs">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span>DEMO / SCENARIO</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
