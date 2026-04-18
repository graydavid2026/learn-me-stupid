import { useEffect, useState, useRef, useCallback } from 'react';
import { Check, X, Minus, AlertTriangle, ChevronDown, ChevronRight, Clock, Sparkles } from 'lucide-react';

const SLOT_COLORS: Record<number, string> = {
  0: '#6b7280', 1: '#ef4444', 2: '#f97316', 3: '#f59e0b',
  4: '#eab308', 5: '#a3e635', 6: '#84cc16', 7: '#22c55e',
  8: '#10b981', 9: '#14b8a6', 10: '#06b6d4', 11: '#3b82f6',
  12: '#8b5cf6', 13: '#a855f7',
};

const SLOT_LABELS: Record<number, string> = {
  0: 'New', 1: '10m', 2: '1h', 3: '4h', 4: '1d', 5: '3d', 6: '1w',
  7: '2w', 8: '1mo', 9: '2mo', 10: '4mo', 11: '8mo', 12: '1yr', 13: '2yr',
};

// Slots shown in the timeline. Start at 1d — anything shorter (New, 5m,
// 1h, 4h) is noise in the tranche strip.
const TIMELINE_SLOTS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

type Chip = {
  id: string;
  slot: number;
  due_at: string;
  last_reviewed_at: string | null;
  last_result: 'correct' | 'wrong' | null;
};

type Tranche = {
  slot: number;
  label: string;
  dueCount: number;
  dueIn24hCount: number;
  soonestDueAt: string | null;
  cards: Chip[];
};

type Dashboard = {
  tranches: Tranche[];
  totals: { dueNow: number; dueIn24h: number; dueIn48h: number };
  newToday: { used: number; usedGlobal: number; available: number };
  lastStudiedAt: string | null;
};

interface Props {
  dailyNewCardLimit: number;
  globalNewCardLimit: number;
  topicId?: string | null;
  onStartSelected: (cardIds: string[]) => void;
}

// Treat server datetimes as UTC ("YYYY-MM-DD HH:MM:SS" → append "Z")
function parseServerDate(s: string | null): Date | null {
  if (!s) return null;
  return new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
}

function formatRelative(target: Date, now: Date = new Date(), pastLabel = 'ago'): string {
  const diffMs = target.getTime() - now.getTime();
  const absMin = Math.round(Math.abs(diffMs) / 60000);
  const isPast = diffMs < 0;
  let str: string;
  if (absMin < 60) str = `${absMin}m`;
  else if (absMin < 60 * 24) str = `${Math.round(absMin / 60)}h`;
  else str = `${Math.round(absMin / (60 * 24))}d`;
  return isPast ? `${str} ${pastLabel}` : `in ${str}`;
}

function formatAbsolute(d: Date): string {
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function TrancheDashboard({ dailyNewCardLimit, globalNewCardLimit, topicId, onStartSelected }: Props) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Drag-to-pan for desktop
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ active: boolean; startX: number; startScroll: number }>({
    active: false, startX: 0, startScroll: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const url = topicId
        ? `/api/study/tranche-dashboard?topic=${encodeURIComponent(topicId)}`
        : '/api/study/tranche-dashboard';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed');
      const json = (await res.json()) as Dashboard;
      setData(json);
      setError(null);
    } catch (e) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleExpand = (slot: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot); else next.add(slot);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelected = () => setSelected(new Set());

  // Desktop drag-to-pan
  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    // Don't hijack chip clicks
    const target = e.target as HTMLElement;
    if (target.closest('[data-chip], [data-header]')) return;
    dragState.current = {
      active: true,
      startX: e.pageX,
      startScroll: scrollRef.current.scrollLeft,
    };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.active || !scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft =
      dragState.current.startScroll - (e.pageX - dragState.current.startX);
  };
  const endDrag = () => { dragState.current.active = false; };

  if (loading) {
    return <div className="text-center text-gray-500 py-12">Loading dashboard…</div>;
  }
  if (error || !data) {
    return <div className="text-center text-red-400 py-12">{error || 'No data'}</div>;
  }

  const { tranches, totals, newToday, lastStudiedAt } = data;
  const topicRemaining = Math.max(0, dailyNewCardLimit - newToday.used);
  const globalRemaining = Math.max(0, globalNewCardLimit - (newToday.usedGlobal ?? 0));
  const lastStudied = parseServerDate(lastStudiedAt);
  const selectedCount = selected.size;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Top strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <div className="card p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Due now</div>
          <div className="text-3xl font-bold text-white">{totals.dueNow}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Due in 24h</div>
          <div className="text-3xl font-bold text-white">{totals.dueIn24h}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Due in 48h</div>
          <div className="text-3xl font-bold text-white">{totals.dueIn48h}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> New today
          </div>
          <div className="text-3xl font-bold text-white">
            {newToday.usedGlobal ?? 0} <span className="text-base text-gray-500">/ {globalNewCardLimit}</span>
          </div>
          {topicId && (
            <div className="text-[11px] text-gray-500 mt-0.5">
              This topic: {newToday.used} / {dailyNewCardLimit}
            </div>
          )}
          <div className="text-[11px] text-gray-500 mt-0.5">
            {globalRemaining <= 0
              ? 'Limit hit (12h window) — review upcoming early'
              : topicRemaining <= 0 && topicId
                ? 'Topic limit hit — try another topic'
                : `${globalRemaining} new card${globalRemaining === 1 ? '' : 's'} left`}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Last studied
          </div>
          <div className="text-base font-medium text-white">
            {lastStudied ? formatRelative(lastStudied, new Date(), 'ago') : '—'}
          </div>
        </div>
      </div>

      {/* Tranche timeline — always rendered, one column per slot 1–13 */}
      {(() => {
        const bySlot = new Map<number, Tranche>();
        for (const t of tranches) bySlot.set(t.slot, t);
        const displayTranches: Tranche[] = TIMELINE_SLOTS.map(
          (slot) =>
            bySlot.get(slot) ?? {
              slot,
              label: SLOT_LABELS[slot],
              dueCount: 0,
              dueIn24hCount: 0,
              soonestDueAt: null,
              cards: [],
            }
        );
        return (
        <div
          ref={scrollRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          className="overflow-x-auto overflow-y-visible touch-pan-x select-none -mx-3 px-3 pb-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="flex gap-3 items-start min-w-min">
            {displayTranches.map((t) => {
              const isOpen = expanded.has(t.slot);
              const color = SLOT_COLORS[t.slot] ?? '#6b7280';
              const soonest = parseServerDate(t.soonestDueAt);
              const has24hWarning = t.dueIn24hCount > 0;
              return (
                <div
                  key={t.slot}
                  className="flex flex-col flex-shrink-0"
                  style={{ width: isOpen ? 220 : 168 }}
                >
                  <button
                    data-header
                    onClick={() => toggleExpand(t.slot)}
                    className="card p-3 text-left transition-all hover:border-accent/50"
                    style={{
                      borderColor: has24hWarning ? color : undefined,
                      boxShadow: has24hWarning ? `0 0 0 1px ${color}` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-mono text-gray-400">{t.label}</span>
                      {isOpen ? (
                        <ChevronDown className="w-3 h-3 text-gray-500 ml-auto" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-gray-500 ml-auto" />
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white leading-tight">{t.dueCount}</div>
                    <div className="text-[11px] text-gray-500">due card{t.dueCount === 1 ? '' : 's'}</div>
                    {soonest && (
                      <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        next: {formatRelative(soonest)}
                      </div>
                    )}
                    {has24hWarning && (
                      <div
                        className="mt-1 text-[11px] flex items-center gap-1 font-medium"
                        style={{ color }}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {t.dueIn24hCount} within 24h
                      </div>
                    )}
                  </button>

                  {/* Expanded chip column */}
                  {isOpen && (
                    <div className="mt-2 flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto">
                      {t.cards.map((c) => {
                        const isSel = selected.has(c.id);
                        const due = parseServerDate(c.due_at)!;
                        const ResultIcon =
                          c.last_result === 'correct' ? Check :
                          c.last_result === 'wrong' ? X : Minus;
                        const resultColor =
                          c.last_result === 'correct' ? 'text-green-400' :
                          c.last_result === 'wrong' ? 'text-red-400' : 'text-gray-600';
                        return (
                          <button
                            key={c.id}
                            data-chip
                            onClick={() => toggleSelect(c.id)}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left border transition-colors ${
                              isSel
                                ? 'bg-accent/15 border-accent'
                                : 'bg-surface-elevated border-border hover:border-accent/40'
                            }`}
                          >
                            <ResultIcon className={`w-4 h-4 shrink-0 ${resultColor}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white font-medium leading-tight">
                                {formatRelative(due)}
                              </div>
                              <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                                {formatAbsolute(due)}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      {/* Sticky action bar — only when cards are selected. The launcher's
          "Start Studying" button handles the default all-due case, so we
          don't show a second, buried button beneath it. */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-surface-base/95 backdrop-blur border-t border-border p-3 z-30">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <button
              onClick={clearSelected}
              className="text-sm text-gray-400 hover:text-white px-3 py-2"
            >
              Clear
            </button>
            <button
              onClick={() => onStartSelected(Array.from(selected))}
              className="btn-primary flex-1 py-3 text-base"
            >
              Study selected ({selectedCount})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
