/**
 * frontend/lib/useWeatherSync.ts
 * ================================
 * Custom React hook for controlled WeatherSyncService status polling.
 *
 * Design:
 * - Polls GET /api/v1/weather/sync-status every POLL_INTERVAL_MS (30s)
 * - Counts down to next sync using a 1s local ticker
 * - Returns: syncStatus, countdown (seconds), dataFreshnessLabel
 * - Does NOT poll heavy weather/risk data — only lightweight status
 * - Cleanup on unmount via clearInterval
 *
 * Strict labeling rule: NEVER show "LIVE" for cached, fallback, or demo data.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SyncStatus, DataFreshnessStatus } from "./types";
import { fetchSyncStatus } from "./api";

const POLL_INTERVAL_MS = 30_000; // Poll status every 30s (lightweight)
const MAX_CONNECTING_MS = 15_000; // Force transition to ERROR if connecting exceeds 15s

export interface WeatherSyncState {
  syncStatus: SyncStatus | null;
  countdown: number | null;   // Seconds until next sync
  dataFreshnessLabel: string; // Human-readable for the Navbar
  dataFreshnessStatus: DataFreshnessStatus | string;
  isLive: boolean;
  dataAgeMinutes: number | null;
  isLoading: boolean;
  lastPolledAt: Date | null;
}

function getFreshnessLabel(prov: string, status: SyncStatus | null, countdown: number | null): string {
  const age = status?.data_age_minutes;
  const ageStr = age != null && age > 0 ? `${age.toFixed(0)} min ago` : "Just now";

  if (prov === "INITIALIZING" || prov === "CONNECTING") return "Fetching live weather…";
  if (prov === "ERROR") {
    return age != null ? `⚠ Weather Provider Unavailable — Last valid: ${ageStr}` : "⚠ Weather Provider Unavailable";
  }
  if (prov === "FALLBACK") {
    return age != null ? `⚠ Fallback Data — Last valid: ${ageStr}` : "⚠ Fallback Data";
  }
  if (prov === "STALE") {
    return age != null ? `⚠ Data Stale — Updated ${ageStr}` : "⚠ Data Stale";
  }
  if (prov === "DEMO_SCENARIO") {
    return "● DEMO / SCENARIO MODE";
  }

  // LIVE or CACHED_LIVE
  const countdownStr = countdown != null && countdown > 0
    ? `Next sync in ${formatCountdown(countdown)}`
    : "";
  const liveLabel = prov === "LIVE" ? "● LIVE WEATHER" : "● CACHED LIVE DATA";
  return [liveLabel, ageStr ? `Updated ${ageStr}` : "", countdownStr]
    .filter(Boolean)
    .join(" · ");
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function useWeatherSync(): WeatherSyncState {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);
  const [isTimedOut, setIsTimedOut] = useState<boolean>(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<number | null>(null);

  const poll = useCallback(async () => {
    try {
      const s = await fetchSyncStatus();
      setSyncStatus(s);
      setLastPolledAt(new Date());

      if (s.provider_status !== "INITIALIZING" && s.provider_status !== "CONNECTING") {
        setIsTimedOut(false);
      }

      // Reset countdown from server-provided next_sync_seconds
      const secs = s.next_sync_seconds ?? null;
      setCountdown(secs);
      countdownRef.current = secs;
    } catch (err) {
      console.debug("[useWeatherSync] Poll failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    poll();

    // 15s connecting timeout safety net
    timeoutRef.current = setTimeout(() => {
      setIsTimedOut(true);
    }, MAX_CONNECTING_MS);

    // Periodic status poll every 30s
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    // 1s countdown ticker
    tickRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev == null) return null;
        const next = Math.max(0, prev - 1);
        countdownRef.current = next;
        return next;
      });
    }, 1000);

    return () => {
      if (pollRef.current != null) clearInterval(pollRef.current);
      if (tickRef.current != null) clearInterval(tickRef.current);
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
    };
  }, [poll]);

  let prov = (syncStatus?.provider_status ?? "CONNECTING") as DataFreshnessStatus | string;
  if ((prov === "INITIALIZING" || prov === "CONNECTING") && isTimedOut) {
    prov = "ERROR";
  }

  const dataFreshnessLabel = getFreshnessLabel(prov, syncStatus, countdown);

  return {
    syncStatus,
    countdown,
    dataFreshnessLabel,
    dataFreshnessStatus: prov,
    isLive: (prov === "LIVE" || prov === "CACHED_LIVE") && (syncStatus?.is_live ?? false),
    dataAgeMinutes: syncStatus?.data_age_minutes ?? null,
    isLoading,
    lastPolledAt,
  };
}
