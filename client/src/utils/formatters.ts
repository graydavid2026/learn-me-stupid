// Centralized formatters and heat-level color coding
// Adapted from Grid Wars chartStyles + metricDefinitions

import { TIER_LABELS } from '@shared/types';

// ─── Heat levels (good/mid/bad) ──────────────────────────────────────────────

export type HeatLevel = 'good' | 'mid' | 'bad';

export const HEAT_THRESHOLDS = { good: 80, mid: 50 } as const;

export const HEAT_CSS: Record<HeatLevel, string> = {
  good: 'bg-green-500/20 text-green-400',
  mid: 'bg-amber-500/20 text-amber-400',
  bad: 'bg-red-500/20 text-red-400',
};

export const HEAT_COLORS: Record<HeatLevel, string> = {
  good: '#22c55e',
  mid: '#f59e0b',
  bad: '#ef4444',
};

export function getHeatLevel(value: number, thresholds = HEAT_THRESHOLDS): HeatLevel {
  if (value >= thresholds.good) return 'good';
  if (value >= thresholds.mid) return 'mid';
  return 'bad';
}

export function getAccuracyHeat(accuracy: number): HeatLevel {
  return getHeatLevel(accuracy);
}

export function getStreakHeat(streak: number): HeatLevel {
  if (streak >= 7) return 'good';
  if (streak >= 3) return 'mid';
  return 'bad';
}

// ─── Tier colors ─────────────────────────────────────────────────────────────

export const TIER_COLORS: Record<number, string> = {
  0: '#ef4444', 1: '#f97316', 2: '#f59e0b', 3: '#eab308',
  4: '#84cc16', 5: '#22c55e', 6: '#14b8a6', 7: '#06b6d4', 8: '#22c55e',
};

export function getTierHeat(tier: number): HeatLevel {
  if (tier >= 6) return 'good';
  if (tier >= 3) return 'mid';
  return 'bad';
}

// ─── Formatters ──────────────────────────────────────────────────────────────

export const fmt = {
  pct: (v: number) => `${Math.round(v)}%`,
  pctDecimal: (v: number) => `${v.toFixed(1)}%`,
  count: (v: number) => v.toLocaleString(),
  tier: (t: number) => TIER_LABELS[t] ?? `T${t}`,
  streak: (days: number) => `${days} day${days !== 1 ? 's' : ''}`,
  interval: (ms: number) => {
    const hours = ms / (1000 * 60 * 60);
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = hours / 24;
    if (days < 7) return `${Math.round(days)}d`;
    const weeks = days / 7;
    if (weeks < 5) return `${Math.round(weeks)}w`;
    const months = days / 30;
    return `${Math.round(months)}mo`;
  },
  duration: (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  },
  date: (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },
  dateTime: (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  },
  relativeTime: (iso: string) => {
    const now = new Date();
    const then = new Date(iso);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.abs(diffMs) / (1000 * 60);
    const past = diffMs > 0;
    const prefix = past ? '' : 'in ';
    const suffix = past ? ' ago' : '';

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${prefix}${Math.round(diffMins)}m${suffix}`;
    const hours = diffMins / 60;
    if (hours < 24) return `${prefix}${Math.round(hours)}h${suffix}`;
    const days = hours / 24;
    if (days < 7) return `${prefix}${Math.round(days)}d${suffix}`;
    return `${prefix}${Math.round(days / 7)}w${suffix}`;
  },
};

// ─── Chart styles ────────────────────────────────────────────────────────────

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1a1d27',
  border: '1px solid #2e3348',
  borderRadius: 8,
  fontSize: 11,
  fontFamily: 'IBM Plex Mono, monospace',
};

export const AXIS_TICK = { fill: '#6b7280', fontSize: 11 };
export const CHART_GRID_STROKE = '#2e3348';
