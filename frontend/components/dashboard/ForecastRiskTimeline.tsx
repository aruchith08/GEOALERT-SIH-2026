'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CloudRain,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { RiskForecastResponse, RiskForecastPoint } from '@/lib/types';
import { fetchRiskForecast } from '@/lib/api';

interface ForecastRiskTimelineProps {
  latitude?: number;
  longitude?: number;
  cellId?: string;
  staticPS?: number;
  locationName?: string;
}

export default function ForecastRiskTimeline({
  latitude = 25.5788,
  longitude = 91.8933,
  cellId,
  staticPS = 0.42,
  locationName
}: ForecastRiskTimelineProps) {
  const [forecast, setForecast] = useState<RiskForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDay, setSelectedDay] = useState<RiskForecastPoint | null>(null);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const data = await fetchRiskForecast(latitude, longitude, staticPS, cellId, locationName);
      setForecast(data);
      if (data.timeline && data.timeline.length > 0) {
        // Default select peak day or day 1
        const peak = data.timeline.reduce(
          (max, d) => (d.coupled_risk_score > max.coupled_risk_score ? d : max),
          data.timeline[0]
        );
        setSelectedDay(peak);
      }
    } catch (err) {
      console.error('Failed to load risk forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
  }, [latitude, longitude, cellId, staticPS]);

  if (loading && !forecast) {
    return (
      <div className="p-4 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-500 font-mono text-xs shadow-xs">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        <span>Evaluating 7-Day Forecast Coupled Risk (Model B Rolling Window)...</span>
      </div>
    );
  }

  if (!forecast || !forecast.timeline || forecast.timeline.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-sm text-xs font-mono space-y-3">
      {/* Header & Peak Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs tracking-tight flex items-center gap-1.5">
              <span>7-Day Predictive Landslide Risk Timeline</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                +1d to +7d
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">
              Rolling CHIRPS 10-Feature Prediction via Model B &bull; {forecast.location_name || 'Meghalaya Corridor'}
            </p>
          </div>
        </div>

        <button
          onClick={loadForecast}
          disabled={loading}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Trend Alert Callout */}
      <div className="p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 text-[11px]">
          <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-slate-800 font-semibold">{forecast.overall_trend}</span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">Peak Risk</span>
          <strong className="text-xs text-blue-900 font-black">
            {forecast.peak_risk_score.toFixed(3)} ({forecast.peak_day})
          </strong>
        </div>
      </div>

      {/* 7-Day Horizontal Timeline Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {forecast.timeline.map((day) => {
          const isSelected = selectedDay?.day_offset === day.day_offset;
          const isPeak = day.day_offset === forecast.peak_day_offset;

          return (
            <button
              key={day.day_offset}
              onClick={() => setSelectedDay(day)}
              className={`p-2 rounded-xl border text-left transition-all duration-150 relative ${
                isSelected
                  ? 'bg-blue-50/90 border-blue-500 shadow-sm ring-2 ring-blue-100'
                  : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/90 hover:border-slate-300'
              }`}
            >
              {isPeak && (
                <span className="absolute -top-1.5 right-1.5 text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-tight shadow-2xs">
                  Peak
                </span>
              )}

              {/* Day Name & Offset */}
              <div className="font-bold text-[11px] text-slate-900 truncate">
                {day.day_name.split(',')[0]}
              </div>
              <div className="text-[9px] text-slate-500 font-medium">
                {day.date.slice(5)} (+{day.day_offset}d)
              </div>

              {/* Forecast Rain Bar */}
              <div className="mt-1.5 pt-1 border-t border-slate-200/80">
                <div className="flex items-center gap-1 text-[10px] text-sky-800 font-semibold">
                  <CloudRain className="w-3 h-3 text-sky-600 shrink-0" />
                  <span>{day.forecast_rain_mm.toFixed(0)} mm</span>
                </div>
              </div>

              {/* Coupled Risk Metric */}
              <div className="mt-1">
                <div className="text-[9px] text-slate-400">Risk</div>
                <div className="text-sm font-black text-slate-900 leading-tight">
                  {day.coupled_risk_score.toFixed(3)}
                </div>
              </div>

              {/* Tier Badge */}
              <div className="mt-1.5">
                <span
                  className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate w-full text-center"
                  style={{
                    backgroundColor: `${day.alert_color_hex}18`,
                    color: day.alert_color_hex,
                    border: `1px solid ${day.alert_color_hex}40`
                  }}
                >
                  {day.alert_tier_name.replace('Level ', 'L')}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Deep Dive Breakdown */}
      {selectedDay && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Projected Metrics for {selectedDay.day_name} (+{selectedDay.day_offset} Days)</span>
            </span>
            <span
              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${selectedDay.alert_color_hex}20`,
                color: selectedDay.alert_color_hex
              }}
            >
              {selectedDay.alert_tier_name}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block">Forecast Precip</span>
              <strong className="text-xs text-sky-800">{selectedDay.forecast_rain_mm.toFixed(1)} mm</strong>
            </div>

            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block">Rolling ARI-3</span>
              <strong className="text-xs text-sky-800">
                {selectedDay.dynamic_features.ari_3.toFixed(1)} mm
              </strong>
            </div>

            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block">Dynamic P(D)</span>
              <strong className="text-xs text-sky-900 font-mono">
                {selectedDay.dynamic_trigger_p_d.toFixed(4)}
              </strong>
            </div>

            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block">Coupled Risk</span>
              <strong className="text-xs font-mono" style={{ color: selectedDay.alert_color_hex }}>
                {selectedDay.coupled_risk_score.toFixed(4)}
              </strong>
            </div>
          </div>

          <div className="text-[10px] text-slate-600 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
            <span>{selectedDay.warning_summary}</span>
          </div>
        </div>
      )}
    </div>
  );
}
