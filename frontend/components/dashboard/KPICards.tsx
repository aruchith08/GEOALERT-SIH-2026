'use client';

import React from 'react';
import { Layers, ShieldCheck, AlertCircle, AlertTriangle, Flame } from 'lucide-react';

interface KPICardsProps {
  totalCells?: number;
  greenCount?: number;
  yellowCount?: number;
  orangeCount?: number;
  redCount?: number;
}

export default function KPICards({
  totalCells = 3156,
  greenCount = 2899,
  yellowCount = 137,
  orangeCount = 110,
  redCount = 10,
}: KPICardsProps) {
  const cards = [
    {
      label: 'Regional Grid Extent',
      value: totalCells.toLocaleString(),
      subtext: 'EPSG:4326 Spatial Grid',
      icon: Layers,
      bg: 'bg-white/80',
      border: 'border-slate-200',
      text: 'text-slate-900',
      iconColor: 'text-blue-600',
      badge: 'Meghalaya Statewide',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    {
      label: 'Level 1: Green',
      value: greenCount.toLocaleString(),
      subtext: 'Safe / Baseline Monitoring',
      icon: ShieldCheck,
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200/80',
      text: 'text-emerald-950',
      iconColor: 'text-emerald-600',
      badge: `${((greenCount / totalCells) * 100).toFixed(1)}%`,
      badgeBg: 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
    },
    {
      label: 'Level 2: Yellow',
      value: yellowCount.toLocaleString(),
      subtext: 'Advisory Early Watch',
      icon: AlertCircle,
      bg: 'bg-amber-50/70',
      border: 'border-amber-200/80',
      text: 'text-amber-950',
      iconColor: 'text-amber-600',
      badge: `${((yellowCount / totalCells) * 100).toFixed(1)}%`,
      badgeBg: 'bg-amber-100/80 text-amber-800 border-amber-300'
    },
    {
      label: 'Level 3: Orange',
      value: orangeCount.toLocaleString(),
      subtext: 'Warning Hazard Alert',
      icon: AlertTriangle,
      bg: 'bg-orange-50/70',
      border: 'border-orange-200/80',
      text: 'text-orange-950',
      iconColor: 'text-orange-600',
      badge: `${((orangeCount / totalCells) * 100).toFixed(1)}%`,
      badgeBg: 'bg-orange-100/80 text-orange-800 border-orange-300'
    },
    {
      label: 'Level 4: Red',
      value: redCount.toLocaleString(),
      subtext: 'Critical Action Trigger',
      icon: Flame,
      bg: 'bg-red-50/70',
      border: 'border-red-200/80',
      text: 'text-red-950',
      iconColor: 'text-red-600',
      badge: `${((redCount / totalCells) * 100).toFixed(1)}%`,
      badgeBg: 'bg-red-100/80 text-red-800 border-red-300'
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className={`p-3.5 rounded-xl border backdrop-blur-md shadow-xs glass-card-hover ${c.bg} ${c.border}`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-600 truncate">{c.label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.badgeBg}`}>
                {c.badge}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-2xl font-black tracking-tight ${c.text}`}>{c.value}</span>
              <Icon className={`w-4 h-4 ${c.iconColor}`} />
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">{c.subtext}</p>
          </div>
        );
      })}
    </div>
  );
}
