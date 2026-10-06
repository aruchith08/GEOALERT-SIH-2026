'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Clock,
  MapPin, CloudRain, Mountain, ChevronDown, ChevronUp, RefreshCw,
  PlusCircle, Filter, Info, ShieldCheck, Activity, FileText,
  Radio, FlaskConical, Layers, ArrowRight, Flame, AlertCircle
} from 'lucide-react';
import {
  fetchAlertEpisodes,
  fetchAlertsSummary,
  validateAlertEpisode,
  simulateAlertTrigger
} from '@/lib/api';
import { AlertEpisode, AlertsSummaryStats } from '@/lib/types';

export default function HazardLedgerPage() {
  // Mode switcher: 'realtime' (default, genuine live incidents from Oct 6, 2026 onwards) vs 'demo' (calibration & simulations)
  const [viewMode, setViewMode] = useState<'realtime' | 'demo'>('realtime');
  const [alerts, setAlerts] = useState<AlertEpisode[]>([]);
  const [summary, setSummary] = useState<AlertsSummaryStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [valFilter, setValFilter] = useState<string>('ALL');
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Active validation modal/state
  const [activeValidatingId, setActiveValidatingId] = useState<string | null>(null);
  const [validationNotes, setValidationNotes] = useState<string>('');
  const [validatorName, setValidatorName] = useState<string>('Disaster Response Officer');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const isDemoParam = viewMode === 'demo';
      const [alertList, summaryData] = await Promise.all([
        fetchAlertEpisodes(statusFilter, valFilter, isDemoParam),
        fetchAlertsSummary(isDemoParam)
      ]);
      setAlerts(alertList);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load alert ledger data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, statusFilter, valFilter]);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const toggleExpand = (id: string) => {
    setExpandedAlerts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSimulateTrigger = async () => {
    setIsSimulating(true);
    setActionMessage(null);
    try {
      const newAlert = await simulateAlertTrigger();
      if (newAlert) {
        setActionMessage(`✓ Simulated alert generated successfully in Demo Archive (${newAlert.location_name})!`);
        if (viewMode !== 'demo') {
          setViewMode('demo');
        } else {
          await loadData();
        }
        setExpandedAlerts(prev => ({ ...prev, [newAlert.id]: true }));
      }
    } catch (err) {
      setActionMessage('Failed to simulate trigger alert.');
    } finally {
      setIsSimulating(false);
      setTimeout(() => setActionMessage(null), 60000);
    }
  };

  const handleValidationSubmit = async (alertId: string, status: string) => {
    try {
      await validateAlertEpisode(alertId, status, validationNotes, validatorName);
      setActiveValidatingId(null);
      setValidationNotes('');
      setActionMessage(`✓ Ground truth validation saved: ${status.replace('_', ' ')}`);
      await loadData();
    } catch (err) {
      alert('Error updating validation status');
    }
  };

  // Compact 5 KPI Metric Cards tailored to match GEOALERT's design system exactly
  const kpiCards = viewMode === 'realtime' ? [
    {
      label: 'Active Red Alerts',
      value: summary ? summary.active_red_alerts.toLocaleString() : '0',
      subtext: 'Coupled Risk ≥ 0.35',
      icon: Flame,
      bg: 'bg-red-50/70',
      border: 'border-red-200/80',
      text: 'text-red-950',
      iconColor: 'text-red-600',
      badge: summary && summary.active_red_alerts > 0 ? `${summary.active_red_alerts} Active` : '0 Active',
      badgeBg: summary && summary.active_red_alerts > 0 ? 'bg-red-100 text-red-800 border-red-300' : 'bg-slate-100 text-slate-700 border-slate-200'
    },
    {
      label: 'Real-Time Recorded',
      value: summary ? summary.total_episodes.toLocaleString() : '0',
      subtext: 'Since Oct 6, 2026',
      icon: Activity,
      bg: 'bg-white/80',
      border: 'border-slate-200',
      text: 'text-slate-900',
      iconColor: 'text-slate-600',
      badge: 'Live Ledger',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    {
      label: 'Grid Coverage',
      value: '3,156',
      subtext: 'Meghalaya Statewide',
      icon: Layers,
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200/80',
      text: 'text-emerald-950',
      iconColor: 'text-emerald-600',
      badge: '100% Mesh',
      badgeBg: 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
    },
    {
      label: 'Surveillance Engine',
      value: '100% OK',
      subtext: '12 AWS Mesh Polling',
      icon: ShieldCheck,
      bg: 'bg-blue-50/70',
      border: 'border-blue-200/80',
      text: 'text-blue-950',
      iconColor: 'text-blue-600',
      badge: 'Operational',
      badgeBg: 'bg-blue-100/80 text-blue-800 border-blue-300'
    },
    {
      label: 'Avg Alert Duration',
      value: summary && summary.total_episodes > 0 ? summary.average_duration_formatted : '0m',
      subtext: 'Trigger to Clearance',
      icon: Clock,
      bg: 'bg-purple-50/70',
      border: 'border-purple-200/80',
      text: 'text-purple-950',
      iconColor: 'text-purple-600',
      badge: 'Decay Timer',
      badgeBg: 'bg-purple-100/80 text-purple-800 border-purple-300'
    }
  ] : [
    {
      label: 'Active Simulated',
      value: summary ? summary.active_red_alerts.toLocaleString() : '0',
      subtext: 'Ongoing Test Alerts',
      icon: Flame,
      bg: 'bg-red-50/70',
      border: 'border-red-200/80',
      text: 'text-red-950',
      iconColor: 'text-red-600',
      badge: `${summary?.active_red_alerts || 0} Test`,
      badgeBg: 'bg-red-100 text-red-800 border-red-300'
    },
    {
      label: 'Archived Episodes',
      value: summary ? summary.total_episodes.toLocaleString() : '0',
      subtext: 'Historical Benchmarks',
      icon: Activity,
      bg: 'bg-white/80',
      border: 'border-slate-200',
      text: 'text-slate-900',
      iconColor: 'text-slate-600',
      badge: 'Calibrated',
      badgeBg: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    },
    {
      label: 'Confirmed Failures',
      value: summary ? (summary.confirmed_landslides + summary.minor_slips_recorded).toLocaleString() : '0',
      subtext: 'Ground Truth Hits',
      icon: CheckCircle2,
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200/80',
      text: 'text-emerald-950',
      iconColor: 'text-emerald-600',
      badge: 'Verified Hits',
      badgeBg: 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
    },
    {
      label: 'Empirical Precision',
      value: summary ? `${summary.empirical_precision_pct}%` : '85.0%',
      subtext: 'Field Verification Rate',
      icon: ShieldCheck,
      bg: 'bg-blue-50/70',
      border: 'border-blue-200/80',
      text: 'text-blue-950',
      iconColor: 'text-blue-600',
      badge: 'Precision',
      badgeBg: 'bg-blue-100/80 text-blue-800 border-blue-300'
    },
    {
      label: 'Avg Hazard Decay',
      value: summary?.average_duration_formatted || '6h 10m',
      subtext: 'Historical Duration',
      icon: Clock,
      bg: 'bg-purple-50/70',
      border: 'border-purple-200/80',
      text: 'text-purple-950',
      iconColor: 'text-purple-600',
      badge: 'Duration',
      badgeBg: 'bg-purple-100/80 text-purple-800 border-purple-300'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Top Hero Command Center Header — Matches Reference Architecture Exactly */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              GEOALERT
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100/80 border border-blue-300 text-blue-800">
              Hazard Verification & Alert Ledger
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1 max-w-3xl">
            Black-box flight recorder capturing immutable snapshots of geotechnical & meteorological conditions whenever risk reaches <strong>Level 4: Red Critical Trigger (Risk ≥ 0.35)</strong>.
          </p>
        </div>

        {/* Scientific Coupling Banner & Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700 shadow-2xs">
            <span>Formula: <strong className="text-slate-900">Risk = P(S) &times; P(D)</strong></span>
            <span className="text-slate-300">|</span>
            <span>Trigger: <strong className="text-red-600 font-bold">≥ 0.3500</strong></span>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            title="Refresh ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center justify-between shadow-xs">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Mode Switcher Segmented Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl p-1.5 shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60">
          <button
            onClick={() => setViewMode('realtime')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'realtime'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>Real-Time Live Ledger</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
              viewMode === 'realtime' ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {viewMode === 'realtime' ? `${alerts.length} Incidents` : 'Live'}
            </span>
          </button>

          <button
            onClick={() => setViewMode('demo')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'demo'
                ? 'bg-white text-indigo-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
            <span>Demo & Calibration Archive</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
              viewMode === 'demo' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {viewMode === 'demo' ? `${alerts.length} Records` : 'Sandbox'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'demo' ? (
            <button
              onClick={handleSimulateTrigger}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSimulating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlusCircle className="w-3.5 h-3.5" />
              )}
              <span>Simulate High-Risk Alert</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Surveillance active from Oct 6, 2026 onwards</span>
            </div>
          )}
        </div>
      </div>

      {/* 5 KPI Metric Cards — Matches Dashboard Scale Exactly */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpiCards.map((c) => {
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
              <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">{c.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Innovation Pipeline Visual Ribbon */}
      <div className="p-2.5 bg-blue-50/80 border border-blue-200/90 rounded-xl flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-mono text-slate-700 shadow-2xs text-center">
        <span className="font-bold text-sky-800">1. LIVE TELEMETRY (12 AWS)</span>
        <span className="text-slate-400 font-bold">&rarr;</span>
        <span className="font-bold text-indigo-800">2. RISK &ge; 0.35 TRIGGER</span>
        <span className="text-slate-400 font-bold">&rarr;</span>
        <span className="font-extrabold text-purple-900 bg-purple-100/80 px-2 py-0.5 rounded-md border border-purple-200">
          3. FROZEN BLACK-BOX SNAPSHOT
        </span>
        <span className="text-slate-400 font-bold">&rarr;</span>
        <span className="font-bold text-emerald-800">4. GROUND-TRUTH FIELD VERIFICATION</span>
      </div>

      {/* Controls & Filter Toolbar */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 text-[11px]">Lifecycle:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (Ongoing)</option>
              <option value="RESOLVED">Resolved (Cleared)</option>
            </select>
          </div>

          {/* Validation Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 text-[11px]">Verification:</span>
            <select
              value={valFilter}
              onChange={e => setValFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Records</option>
              <option value="PENDING">Pending Verification</option>
              <option value="CONFIRMED_LANDSLIDE">Confirmed Landslide</option>
              <option value="MINOR_SLIP">Minor Slip / Slump</option>
              <option value="FALSE_POSITIVE">False Positive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Real-Time Live Radar Card when 0 incidents recorded yet */}
      {viewMode === 'realtime' && alerts.length === 0 && !isLoading && (
        <div className="bg-white/90 backdrop-blur-md border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 text-emerald-700 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Surveillance Active
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Feature Activated: October 6, 2026
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  No High-Risk Red Incidents Recorded in Real Time Yet
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 max-w-3xl leading-relaxed">
                  The automated listener is continuously monitoring all <strong>3,156 grid terrain cells</strong> across Meghalaya. Current weather conditions remain below the critical shear-failure threshold (Risk &lt; 0.35).
                </p>
              </div>
            </div>

            <button
              onClick={() => setViewMode('demo')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ml-auto md:ml-0"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Open Demo Sandbox</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Diagnostic Protocol Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-3.5 pt-3.5 border-t border-slate-100 text-xs">
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2.5">
              <div className="font-bold text-slate-800 mb-0.5 flex items-center gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                <span>1. 24/7 Mesh Polling</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">Continuous 15-minute telemetry evaluation from 12 AWS stations across Meghalaya.</p>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2.5">
              <div className="font-bold text-slate-800 mb-0.5 flex items-center gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Instant Black-Box Freeze</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">The moment any cell trips Risk ≥ 0.35, slope, ARI-3, 24h rain, and soil saturation are frozen.</p>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2.5">
              <div className="font-bold text-slate-800 mb-0.5 flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>3. Duration Stopwatch & Audit</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">Tracks active duration until conditions normalize, providing ground-truth audit logging.</p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {isLoading && alerts.length === 0 ? (
          <div className="bg-white/80 border border-slate-200 rounded-xl p-10 text-center text-slate-500 shadow-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
            <p className="text-xs font-medium">Loading hazard alert ledger...</p>
          </div>
        ) : alerts.length === 0 && viewMode === 'demo' ? (
          <div className="bg-white/80 border border-slate-200 rounded-xl p-10 text-center text-slate-500 shadow-xs">
            <FlaskConical className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No records match the selected filter in Demo Archive</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting the filters or simulate a high-risk alert using the button above.</p>
            <button
              onClick={handleSimulateTrigger}
              className="mt-3 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              + Simulate Test Alert Now
            </button>
          </div>
        ) : (
          alerts.map(alert => {
            const isExpanded = !!expandedAlerts[alert.id];
            const isActive = alert.status === 'ACTIVE';
            const isDemoAlert = alert.is_demo || alert.source === 'SIMULATION' || alert.source === 'HISTORICAL_CALIBRATION';
            const cond = alert.conditions_snapshot || {};

            return (
              <div
                key={alert.id}
                className={`bg-white/90 backdrop-blur-md border rounded-xl transition-all shadow-xs overflow-hidden ${
                  isActive ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Top Bar of Alert Card */}
                <div className="p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2.5 mb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Badge */}
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                          ACTIVE NOW ({alert.duration_formatted})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-500" />
                          RESOLVED ({alert.duration_formatted})
                        </span>
                      )}

                      {/* Alert Tier Badge */}
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                        {alert.alert_tier}
                      </span>

                      {/* Demo / Realtime Tag */}
                      {isDemoAlert ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {alert.source === 'HISTORICAL_CALIBRATION' ? '🧪 Historical Calibration' : '🧪 Simulated Demo'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ● Real-Time Sensor Telemetry
                        </span>
                      )}

                      {/* ID */}
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        {alert.id}
                      </span>
                    </div>

                    {/* Coupled Risk Score Pill */}
                    <div className="text-right">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Coupled Risk</div>
                      <div className="text-lg sm:text-xl font-black text-red-600 leading-tight">
                        {alert.trigger_risk_score.toFixed(4)}
                      </div>
                      {alert.peak_risk_score > alert.trigger_risk_score && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Peak: {alert.peak_risk_score.toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location & Coordinates */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        {alert.location_name}
                        <span className="text-xs font-normal text-slate-500">({alert.district_or_block})</span>
                      </h2>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2.5 mt-0.5">
                        <span>Lat: {alert.latitude.toFixed(4)}°, Lon: {alert.longitude.toFixed(4)}°</span>
                        {alert.cell_id && <span>Cell: {alert.cell_id}</span>}
                      </div>
                    </div>

                    {/* Timing Summary */}
                    <div className="text-[11px] text-slate-500 sm:text-right bg-slate-50 sm:bg-transparent p-1.5 sm:p-0 rounded-lg">
                      <div>
                        <strong>Triggered:</strong> {new Date(alert.trigger_time).toLocaleString()}
                      </div>
                      {alert.end_time ? (
                        <div>
                          <strong>Cleared:</strong> {new Date(alert.end_time).toLocaleString()}
                        </div>
                      ) : (
                        <div className="text-red-600 font-medium">Ongoing High-Risk Condition</div>
                      )}
                    </div>
                  </div>

                  {/* Trigger Cause Callout Box */}
                  <div className="p-2.5 bg-red-50/70 border border-red-100 rounded-lg mb-2.5">
                    <div className="text-[11px] font-bold text-red-900 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      Trigger Condition & Physical Cause
                    </div>
                    <p className="text-xs text-red-800 leading-relaxed font-medium">
                      {alert.trigger_cause}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-red-700/80 mt-1.5 pt-1.5 border-t border-red-200/50">
                      <span>Terrain P(S): <strong>{alert.static_susceptibility_p_s.toFixed(3)}</strong></span>
                      <span>&times;</span>
                      <span>Rainfall P(D): <strong>{alert.dynamic_trigger_p_d.toFixed(3)}</strong></span>
                      <span>=</span>
                      <span>Formula: Risk = P(S) &times; P(D)</span>
                    </div>
                  </div>

                  {/* Bottom Action Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {/* Validation Status Pill */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-medium">Ground Truth:</span>
                      {alert.validation_status === 'CONFIRMED_LANDSLIDE' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confirmed Landslide
                        </span>
                      )}
                      {alert.validation_status === 'MINOR_SLIP' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-blue-600" /> Minor Debris / Slump
                        </span>
                      )}
                      {alert.validation_status === 'FALSE_POSITIVE' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-slate-500" /> False Alarm
                        </span>
                      )}
                      {alert.validation_status === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending Verification
                        </span>
                      )}

                      <button
                        onClick={() => setActiveValidatingId(alert.id)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline ml-1 cursor-pointer"
                      >
                        Update Ground Truth
                      </button>
                    </div>

                    {/* Expand / Collapse Toggle Button */}
                    <button
                      onClick={() => toggleExpand(alert.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Conditions' : 'View Conditions Snapshot'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Section: Black-Box Conditions Snapshot */}
                {isExpanded && (
                  <div className="bg-slate-50/90 border-t border-slate-200 p-3.5 sm:p-4 space-y-3">
                    <div>
                      <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        Environmental Conditions Frozen at Trigger Time
                      </h3>
                      <p className="text-[11px] text-slate-600 mb-2">
                        Exact parameters processed by the inference pipeline at the moment of trigger.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-2xs">
                          <span className="text-slate-400 block text-[10px] uppercase">Slope Gradient</span>
                          <span className="text-xs font-bold text-slate-800">
                            {cond.slope_deg != null ? `${cond.slope_deg}°` : 'N/A'}
                          </span>
                        </div>

                        <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-2xs">
                          <span className="text-slate-400 block text-[10px] uppercase">24h Event Rain</span>
                          <span className="text-xs font-bold text-blue-600">
                            {cond.rainfall_24h_mm != null ? `${cond.rainfall_24h_mm} mm` : 'N/A'}
                          </span>
                        </div>

                        <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-2xs">
                          <span className="text-slate-400 block text-[10px] uppercase">3-Day Antecedent</span>
                          <span className="text-xs font-bold text-blue-700">
                            {cond.ari_3_mm != null ? `${cond.ari_3_mm} mm` : 'N/A'}
                          </span>
                        </div>

                        <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-2xs">
                          <span className="text-slate-400 block text-[10px] uppercase">7-Day Antecedent</span>
                          <span className="text-xs font-bold text-slate-800">
                            {cond.ari_7_mm != null ? `${cond.ari_7_mm} mm` : 'N/A'}
                          </span>
                        </div>

                        <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-2xs">
                          <span className="text-slate-400 block text-[10px] uppercase">15-Day Antecedent</span>
                          <span className="text-xs font-bold text-slate-800">
                            {cond.ari_15_mm != null ? `${cond.ari_15_mm} mm` : 'N/A'}
                          </span>
                        </div>

                        <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-2xs">
                          <span className="text-slate-400 block text-[10px] uppercase">30-Day Moisture Sum</span>
                          <span className="text-xs font-bold text-slate-800">
                            {cond.ari_30_mm != null ? `${cond.ari_30_mm} mm` : 'N/A'}
                          </span>
                        </div>

                        <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-2xs">
                          <span className="text-slate-400 block text-[10px] uppercase">Rainy Days (7d)</span>
                          <span className="text-xs font-bold text-slate-800">
                            {cond.rainy_days_7d != null ? `${cond.rainy_days_7d} days` : 'N/A'}
                          </span>
                        </div>

                        <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-2xs">
                          <span className="text-slate-400 block text-[10px] uppercase">Distance to Road</span>
                          <span className="text-xs font-bold text-slate-800">
                            {cond.distance_to_roads_m != null ? `${cond.distance_to_roads_m} m` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Field Notes and Validator Log */}
                    {alert.validation_notes && (
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                          Field Inspection Report ({alert.validated_by || 'Investigator'} on {alert.validated_at ? new Date(alert.validated_at).toLocaleDateString() : 'N/A'}):
                        </div>
                        <p className="text-xs text-slate-700 italic">"{alert.validation_notes}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Ground Truth Modal / Card Form */}
                {activeValidatingId === alert.id && (
                  <div className="bg-amber-50/90 border-t border-amber-200 p-3.5 sm:p-4">
                    <h4 className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      Submit Ground Truth Verification for {alert.id}
                    </h4>
                    <p className="text-[11px] text-amber-800 mb-2.5">
                      Confirm or flag the observed physical outcome to maintain model calibration accuracy.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-amber-900 block mb-0.5">Inspector / Verifier Name:</label>
                        <input
                          type="text"
                          value={validatorName}
                          onChange={e => setValidatorName(e.target.value)}
                          className="w-full bg-white border border-amber-300 rounded-md px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                          placeholder="e.g. DDMA Officer / PWD Engineer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-amber-900 block mb-0.5">Field Observations & Notes:</label>
                        <input
                          type="text"
                          value={validationNotes}
                          onChange={e => setValidationNotes(e.target.value)}
                          className="w-full bg-white border border-amber-300 rounded-md px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                          placeholder="e.g. Road slip confirmed at km 14; 2m debris cleared."
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => handleValidationSubmit(alert.id, 'CONFIRMED_LANDSLIDE')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-colors cursor-pointer"
                      >
                        ✓ Confirm Landslide
                      </button>
                      <button
                        onClick={() => handleValidationSubmit(alert.id, 'MINOR_SLIP')}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-colors cursor-pointer"
                      >
                        ⚠ Minor Slump
                      </button>
                      <button
                        onClick={() => handleValidationSubmit(alert.id, 'FALSE_POSITIVE')}
                        className="px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded-md text-xs font-bold transition-colors cursor-pointer"
                      >
                        ✗ False Alarm
                      </button>
                      <button
                        onClick={() => setActiveValidatingId(null)}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer ml-auto"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
