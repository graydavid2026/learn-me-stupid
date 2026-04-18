// Centralized formatters and heat-level color coding
// Adapted from Grid Wars chartStyles + metricDefinitions

import { SLOT_LABELS } from '@shared/types';

// ─── Heat levels (good/mid/bad) ──────────────────────────────────────────────

export type HeatLevel = 'good' | 'mid' | 'bad';

export const HEAT_THRESHOLDS = { good: 80, mid: 50 } as const;

export const HEAT_CSS: Record<HeatLevel, string> = {
  good: 'bg-green-500/15 text-success',
  mid: 'bg-amber-500/15 text-warning',
  bad: 'bg-red-500/15 text-error',
};

export const HEAT_COLORS: Record<HeatLevel, string> = {
  good: '#3d9a6e',
  mid: '#c9943b',
  bad: '#c75a5a',
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

// ─── Slot colors (13-slot SR system) ─────────────────────────────────────────

export const SLOT_COLORS: Record<number, string> = {
  0: '#6b7280', 1: '#c75a5a', 2: '#c97a3b', 3: '#c9943b',
  4: '#b8a44a', 5: '#8aab5a', 6: '#6aab6a', 7: '#3d9a6e',
  8: '#3a8a7a', 9: '#3a8a8a', 10: '#4a8aaa', 11: '#5b8a9a',
  12: '#7a7aaa', 13: '#8a6a9a',
};

// Backward compat alias
export const TIER_COLORS = SLOT_COLORS;

export function getSlotHeat(slot: number): HeatLevel {
  if (slot >= 10) return 'good';
  if (slot >= 4) return 'mid';
  return 'bad';
}

export const getTierHeat = getSlotHeat;

// ─── Formatters ──────────────────────────────────────────────────────────────

export const fmt = {
  pct: (v: number) => `${Math.round(v)}%`,
  pctDecimal: (v: number) => `${v.toFixed(1)}%`,
  count: (v: number) => v.toLocaleString(),
  tier: (t: number) => SLOT_LABELS[t] ?? `S${t}`,
  slot: (s: number) => SLOT_LABELS[s] ?? `S${s}`,
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
  background: '#151720',
  border: '1px solid #232638',
  borderRadius: 8,
  fontSize: 11,
  fontFamily: 'IBM Plex Mono, monospace',
};

export const AXIS_TICK = { fill: '#5c5e6e', fontSize: 11 };
export const CHART_GRID_STROKE = '#232638';
