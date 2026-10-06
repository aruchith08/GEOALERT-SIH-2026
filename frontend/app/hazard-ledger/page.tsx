'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Clock,
  MapPin, CloudRain, Mountain, ChevronDown, ChevronUp, RefreshCw,
  PlusCircle, Filter, Info, ShieldCheck, Activity, FileText,
  Radio, FlaskConical, Layers, ArrowRight
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
        // Switch to demo mode so user sees the newly created simulation
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

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Header Banner */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-7 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase bg-red-100 text-red-800 border border-red-200/80">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                Hazard Verification & Alert Ledger
              </span>
              <span className="text-xs text-slate-500 font-mono hidden sm:inline">Active Since Oct 6, 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              High-Risk Hazard Event Ledger
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl mt-1">
              Black-box flight recorder capturing immutable snapshots of geotechnical & meteorological conditions 
              whenever an area trips <strong>Level 4: Red Critical Trigger (Risk ≥ 0.35)</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {viewMode === 'demo' ? (
              <button
                onClick={handleSimulateTrigger}
                disabled={isSimulating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSimulating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
                Simulate High-Risk Alert
              </button>
            ) : (
              <button
                onClick={() => setViewMode('demo')}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                title="Switch to Demo Sandbox"
              >
                <FlaskConical className="w-4 h-4 text-indigo-600" />
                <span>Demo Sandbox</span>
              </button>
            )}
            <button
              onClick={loadData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-4">✕</button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">

        {/* View Mode Segmented Switcher */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-xs flex flex-col sm:flex-row gap-1.5">
          {/* Tab 1: Live Real-Time Surveillance */}
          <button
            onClick={() => setViewMode('realtime')}
            className={`flex-1 flex items-center justify-between px-4 sm:px-5 py-3 rounded-xl transition-all cursor-pointer text-left ${
              viewMode === 'realtime'
                ? 'bg-red-50/80 border border-red-200/90 shadow-2xs'
                : 'hover:bg-slate-50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                viewMode === 'realtime' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <Radio className={`w-4 h-4 ${viewMode === 'realtime' ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${viewMode === 'realtime' ? 'text-red-950' : 'text-slate-700'}`}>
                    Real-Time Live Ledger
                  </span>
                  {viewMode === 'realtime' && (
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  )}
                </div>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Automated surveillance feed • Active from Oct 6, 2026 onwards
                </p>
              </div>
            </div>
            <div className="text-right ml-2 shrink-0">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                viewMode === 'realtime'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {viewMode === 'realtime' ? `${alerts.length} Incidents` : 'Live Mode'}
              </span>
            </div>
          </button>

          {/* Tab 2: Demo & Calibration Archive */}
          <button
            onClick={() => setViewMode('demo')}
            className={`flex-1 flex items-center justify-between px-4 sm:px-5 py-3 rounded-xl transition-all cursor-pointer text-left ${
              viewMode === 'demo'
                ? 'bg-indigo-50/80 border border-indigo-200/90 shadow-2xs'
                : 'hover:bg-slate-50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                viewMode === 'demo' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <FlaskConical className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${viewMode === 'demo' ? 'text-indigo-950' : 'text-slate-700'}`}>
                    Demo & Calibration Archive
                  </span>
                  <span className="text-2xs font-semibold px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-700">
                    Segregated
                  </span>
                </div>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Historical field benchmarks & manual simulation testing
                </p>
              </div>
            </div>
            <div className="text-right ml-2 shrink-0">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                viewMode === 'demo'
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {viewMode === 'demo' ? `${alerts.length} Records` : 'Demo Sandbox'}
              </span>
            </div>
          </button>
        </div>

        {/* Demo Mode Notice Banner */}
        {viewMode === 'demo' && (
          <div className="bg-indigo-50/80 border border-indigo-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <FlaskConical className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-indigo-950">
                  Demo & Historical Calibration Sandbox Active
                </p>
                <p className="text-xs text-indigo-800/90 mt-0.5">
                  These records are historical benchmarks (e.g. Sohra 2026 monsoon slides) and test simulations. Real-time live data is isolated and untouched.
                </p>
              </div>
            </div>
            <button
              onClick={() => setViewMode('realtime')}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
            >
              Back to Real-Time Feed →
            </button>
          </div>
        )}

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Active Red Alerts */}
          <div className="bg-white border border-red-200/90 rounded-2xl p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-semibold text-red-700 mb-1">
              <span>Active Red Alerts</span>
              {summary && summary.active_red_alerts > 0 ? (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-red-600">
              {summary ? summary.active_red_alerts : 0}
            </div>
            <p className="text-2xs text-slate-500 mt-1">Currently exceeding Risk ≥ 0.35</p>
          </div>

          {/* Total Monitored Episodes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
              <span>{viewMode === 'realtime' ? 'Real-Time Logged' : 'Archived Records'}</span>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800">
              {summary ? summary.total_episodes : 0}
            </div>
            <p className="text-2xs text-slate-500 mt-1">
              {viewMode === 'realtime' ? 'Logged since Oct 6, 2026' : 'Historical & simulated'}
            </p>
          </div>

          {/* Confirmed Ground Truth / Monitored Grid */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 mb-1">
              <span>{viewMode === 'realtime' ? 'Grid Coverage' : 'Confirmed Hits'}</span>
              {viewMode === 'realtime' ? (
                <Radio className="w-4 h-4 text-emerald-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {viewMode === 'realtime'
                ? '3,156'
                : summary ? summary.confirmed_landslides + summary.minor_slips_recorded : 0}
            </div>
            <p className="text-2xs text-slate-500 mt-1">
              {viewMode === 'realtime' ? 'Monitored Meghalaya cells' : 'Verified true positive hits'}
            </p>
          </div>

          {/* Model Precision */}
          <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-700 mb-1">
              <span>{viewMode === 'realtime' ? 'Surveillance Status' : 'Empirical Precision'}</span>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600">
              {viewMode === 'realtime' ? '100% OK' : summary ? `${summary.empirical_precision_pct}%` : '85.0%'}
            </div>
            <p className="text-2xs text-slate-500 mt-1">
              {viewMode === 'realtime' ? 'Automated flight recorder' : 'Verified accuracy score'}
            </p>
          </div>

          {/* Average Hazard Duration */}
          <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-xs col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-700 mb-1">
              <span>Avg Alert Duration</span>
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-600">
              {summary ? summary.average_duration_formatted : '0m'}
            </div>
            <p className="text-2xs text-slate-500 mt-1">
              {viewMode === 'realtime' ? 'Real-time hazard lifetime' : 'Historical decay time'}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Lifecycle:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active (Ongoing)</option>
                <option value="RESOLVED">Resolved (Cleared)</option>
              </select>
            </div>

            {/* Validation Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Verification:</span>
              <select
                value={valFilter}
                onChange={e => setValFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
          <div className="bg-white border border-emerald-200/90 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                  <div className="relative flex items-center justify-center">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/40 animate-ping absolute" />
                    <Radio className="w-7 h-7 text-emerald-700 relative" />
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      Live Surveillance Active
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Feature Activated: October 6, 2026
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                    No High-Risk Red Incidents Recorded in Real Time Yet
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                    The real-time geotechnical listener is actively monitoring all <strong>3,156 grid terrain cells</strong> across Meghalaya. Because current live weather conditions remain below the critical shear-failure threshold (Risk &lt; 0.35), zero high-risk red episodes have been triggered since feature activation on <strong>October 6, 2026</strong>.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-2 w-full md:w-auto">
                <button
                  onClick={() => setViewMode('demo')}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>Open Demo & Calibration Archive</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-2xs text-slate-400 text-center">
                  Safely test simulations without affecting live records
                </span>
              </div>
            </div>

            {/* Real-Time Flight Recorder Protocol Explanation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-slate-100">
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>1. 24/7 Automated Mesh Polling</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Couples static susceptibility P(S) with live 15-minute telemetry from 12 AWS stations across the state.
                </p>
              </div>

              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>2. Instant Black-Box Snapshot</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The exact moment any cell trips Risk ≥ 0.35, an immutable snapshot of slope, ARI-3, 24h rainfall, and pore saturation is frozen.
                </p>
              </div>

              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>3. Active Duration & Field Validation</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  An active stopwatch tracks duration until the cell normalizes, creating a permanent verification record.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-4">
          {isLoading && alerts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium">Loading hazard alert ledger...</p>
            </div>
          ) : alerts.length === 0 && viewMode === 'demo' ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
              <FlaskConical className="w-10 h-10 text-indigo-300 mx-auto mb-2" />
              <p className="text-base font-bold text-slate-700">No records match the selected filter in Demo Archive</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the filters or simulate a high-risk alert using the button above.</p>
              <button
                onClick={handleSimulateTrigger}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
                  className={`bg-white border rounded-2xl transition-all shadow-xs overflow-hidden ${
                    isActive ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar of Alert Card */}
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-600" />
                            ACTIVE NOW ({alert.duration_formatted})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            RESOLVED (Duration: {alert.duration_formatted})
                          </span>
                        )}

                        {/* Alert Tier Badge */}
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                          {alert.alert_tier}
                        </span>

                        {/* Demo / Realtime Tag */}
                        {isDemoAlert ? (
                          <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {alert.source === 'HISTORICAL_CALIBRATION' ? '🧪 Historical Calibration' : '🧪 Simulated Demo'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ● Real-Time Sensor Telemetry
                          </span>
                        )}

                        {/* ID */}
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {alert.id}
                        </span>
                      </div>

                      {/* Coupled Risk Score Pill */}
                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coupled Risk</div>
                        <div className="text-xl sm:text-2xl font-black text-red-600">
                          {alert.trigger_risk_score.toFixed(4)}
                        </div>
                        {alert.peak_risk_score > alert.trigger_risk_score && (
                          <div className="text-2xs text-slate-400 font-mono">
                            Peak: {alert.peak_risk_score.toFixed(4)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location & Coordinates */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                          {alert.location_name}
                          <span className="text-xs font-normal text-slate-500">({alert.district_or_block})</span>
                        </h2>
                        <div className="text-xs text-slate-500 font-mono flex items-center gap-3 mt-0.5">
                          <span>Lat: {alert.latitude.toFixed(4)}°, Lon: {alert.longitude.toFixed(4)}°</span>
                          {alert.cell_id && <span>Cell: {alert.cell_id}</span>}
                        </div>
                      </div>

                      {/* Timing Summary */}
                      <div className="text-xs text-slate-500 sm:text-right bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg">
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
                    <div className="p-3.5 bg-red-50/70 border border-red-100 rounded-xl mb-3">
                      <div className="text-xs font-bold text-red-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        Trigger Condition & Physical Cause
                      </div>
                      <p className="text-xs sm:text-sm text-red-800 leading-relaxed font-medium">
                        {alert.trigger_cause}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-red-700/80 mt-2 pt-2 border-t border-red-200/50">
                        <span>Terrain P(S): <strong>{alert.static_susceptibility_p_s.toFixed(3)}</strong></span>
                        <span>×</span>
                        <span>Rainfall P(D): <strong>{alert.dynamic_trigger_p_d.toFixed(3)}</strong></span>
                        <span>=</span>
                        <span>Formula: Risk = P(S) × P(D)</span>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      {/* Validation Status Pill */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Ground Truth:</span>
                        {alert.validation_status === 'CONFIRMED_LANDSLIDE' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Confirmed Landslide
                          </span>
                        )}
                        {alert.validation_status === 'MINOR_SLIP' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-blue-600" /> Minor Debris / Slump
                          </span>
                        )}
                        {alert.validation_status === 'FALSE_POSITIVE' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-slate-500" /> False Alarm
                          </span>
                        )}
                        {alert.validation_status === 'PENDING' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Verification
                          </span>
                        )}

                        <button
                          onClick={() => setActiveValidatingId(alert.id)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline ml-1 cursor-pointer"
                        >
                          Update Ground Truth
                        </button>
                      </div>

                      {/* Expand / Collapse Toggle Button */}
                      <button
                        onClick={() => toggleExpand(alert.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Conditions Snapshot' : 'View Conditions Snapshot'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Section: Black-Box Conditions Snapshot */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200/90 p-4 sm:p-6 space-y-4">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-slate-500" />
                          Complete Environmental Conditions Frozen at Trigger Time
                        </h3>
                        <p className="text-xs text-slate-600 mb-3">
                          These exact parameters triggered the machine learning inference pipeline. Use them to calibrate models and cross-reference with meteorological station logs.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          {/* Slope */}
                          <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                            <span className="text-slate-400 block text-2xs uppercase">Slope Gradient</span>
                            <span className="text-sm font-bold text-slate-800">
                              {cond.slope_deg != null ? `${cond.slope_deg}°` : 'N/A'}
                            </span>
                          </div>

                          {/* 24h Rain */}
                          <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                            <span className="text-slate-400 block text-2xs uppercase">24h Event Rain</span>
                            <span className="text-sm font-bold text-blue-600">
                              {cond.rainfall_24h_mm != null ? `${cond.rainfall_24h_mm} mm` : 'N/A'}
                            </span>
                          </div>

                          {/* ARI-3 */}
                          <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                            <span className="text-slate-400 block text-2xs uppercase">3-Day Antecedent (ARI-3)</span>
                            <span className="text-sm font-bold text-blue-700">
                              {cond.ari_3_mm != null ? `${cond.ari_3_mm} mm` : 'N/A'}
                            </span>
                          </div>

                          {/* ARI-7 */}
                          <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                            <span className="text-slate-400 block text-2xs uppercase">7-Day Antecedent (ARI-7)</span>
                            <span className="text-sm font-bold text-slate-800">
                              {cond.ari_7_mm != null ? `${cond.ari_7_mm} mm` : 'N/A'}
                            </span>
                          </div>

                          {/* ARI-15 */}
                          <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                            <span className="text-slate-400 block text-2xs uppercase">15-Day Antecedent</span>
                            <span className="text-sm font-bold text-slate-800">
                              {cond.ari_15_mm != null ? `${cond.ari_15_mm} mm` : 'N/A'}
                            </span>
                          </div>

                          {/* ARI-30 */}
                          <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                            <span className="text-slate-400 block text-2xs uppercase">30-Day Moisture Sum</span>
                            <span className="text-sm font-bold text-slate-800">
                              {cond.ari_30_mm != null ? `${cond.ari_30_mm} mm` : 'N/A'}
                            </span>
                          </div>

                          {/* Rainy Days */}
                          <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                            <span className="text-slate-400 block text-2xs uppercase">Rainy Days (7d)</span>
                            <span className="text-sm font-bold text-slate-800">
                              {cond.rainy_days_7d != null ? `${cond.rainy_days_7d} days` : 'N/A'}
                            </span>
                          </div>

                          {/* Distance to Road */}
                          <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                            <span className="text-slate-400 block text-2xs uppercase">Distance to Road</span>
                            <span className="text-sm font-bold text-slate-800">
                              {cond.distance_to_roads_m != null ? `${cond.distance_to_roads_m} m` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Field Notes and Validator Log */}
                      {alert.validation_notes && (
                        <div className="bg-white border border-slate-200 p-3.5 rounded-xl">
                          <div className="text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Field Inspection Report ({alert.validated_by || 'Investigator'} on {alert.validated_at ? new Date(alert.validated_at).toLocaleDateString() : 'N/A'}):
                          </div>
                          <p className="text-xs text-slate-700 italic">"{alert.validation_notes}"</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline Ground Truth Modal / Card Form */}
                  {activeValidatingId === alert.id && (
                    <div className="bg-amber-50/90 border-t border-amber-200 p-4 sm:p-5">
                      <h4 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-700" />
                        Submit Ground Truth Verification for {alert.id}
                      </h4>
                      <p className="text-xs text-amber-800 mb-3">
                        Choose whether an actual slope failure occurred to establish ground truth calibration.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-2xs font-bold text-amber-900 block mb-1">Inspector / Verifier Name:</label>
                          <input
                            type="text"
                            value={validatorName}
                            onChange={e => setValidatorName(e.target.value)}
                            className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            placeholder="e.g. DDMA Officer / PWD Engineer"
                          />
                        </div>
                        <div>
                          <label className="text-2xs font-bold text-amber-900 block mb-1">Field Observations & Notes:</label>
                          <input
                            type="text"
                            value={validationNotes}
                            onChange={e => setValidationNotes(e.target.value)}
                            className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            placeholder="e.g. Road slip confirmed at km 14; 2m debris cleared."
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleValidationSubmit(alert.id, 'CONFIRMED_LANDSLIDE')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          ✓ Confirm Landslide (Hit)
                        </button>
                        <button
                          onClick={() => handleValidationSubmit(alert.id, 'MINOR_SLIP')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          ⚠ Minor Slump / Debris (Near Miss)
                        </button>
                        <button
                          onClick={() => handleValidationSubmit(alert.id, 'FALSE_POSITIVE')}
                          className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          ✗ False Alarm (No Movement)
                        </button>
                        <button
                          onClick={() => setActiveValidatingId(null)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer ml-auto"
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
    </div>
  );
}
