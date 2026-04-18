import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, Calendar, Flame, BookOpen, Target, Clock, Award,
  CalendarClock, ChevronRight, Play, AlertTriangle, Zap, ArrowUpRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { useStore } from '../../stores/useStore';
import { InfoTooltip } from '../ui/InfoTooltip';
import { SLOT_COLORS, HEAT_COLORS, getAccuracyHeat, getStreakHeat, fmt } from '../../utils/formatters';

// ─── Daily Goal helpers ─────────────────────────────────────────────────────

function getDailyGoal(): number {
  try {
    const raw = localStorage.getItem('lms.dailyGoal');
    const n = raw == null ? 20 : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 20;
  } catch { return 20; }
}

function setDailyGoalStorage(n: number) {
  try { localStorage.setItem('lms.dailyGoal', String(Math.max(1, Math.floor(n)))); } catch {}
}

// ─── Best streak helpers ────────────────────────────────────────────────────

function getBestStreak(): number {
  try {
    const raw = localStorage.getItem('lms.bestStreak');
    return raw ? Number(raw) || 0 : 0;
  } catch { return 0; }
}

function updateBestStreak(current: number): number {
  const best = Math.max(getBestStreak(), current);
  try { localStorage.setItem('lms.bestStreak', String(best)); } catch {}
  return best;
}

// ─── Daily Goal Card ────────────────────────────────────────────────────────

function DailyGoalCard({ reviewed, goal, onGoalChange }: {
  reviewed: number; goal: number; onGoalChange: (n: number) => void;
}) {
  const pct = Math.min(100, Math.round((reviewed / goal) * 100));
  const goalReached = reviewed >= goal;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="card p-3 sm:p-4 text-left">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Target className="w-3.5 h-3.5 text-text-tertiary" />
        <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider">Daily Goal</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={radius} fill="none" stroke="#151720" strokeWidth="5" />
            <circle
              cx="32" cy="32" r={radius} fill="none"
              stroke={goalReached ? '#3d9a6e' : '#d4a853'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-mono font-bold text-text-primary">{pct}%</span>
          </div>
        </div>
        <div>
          <p className="text-lg font-bold font-mono text-text-primary">{reviewed}<span className="text-text-tertiary text-sm">/{goal}</span></p>
          {goalReached ? (
            <p className="text-xs font-medium text-success">Goal reached!</p>
          ) : (
            <p className="text-xs text-text-tertiary">{goal - reviewed} more to go</p>
          )}
          <button
            onClick={() => {
              const input = prompt('Set daily card goal:', String(goal));
              if (input) {
                const n = parseInt(input, 10);
                if (n > 0) onGoalChange(n);
              }
            }}
            className="text-[10px] text-text-tertiary hover:text-text-secondary mt-0.5"
          >
            edit goal
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Streak Display (prominent) ─────────────────────────────────────────────

function StreakDisplay({ streak, bestStreak }: { streak: number; bestStreak: number }) {
  const heat = getStreakHeat(streak);
  const color = HEAT_COLORS[heat];

  return (
    <div className="card p-3 sm:p-4 text-left">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Flame className="w-3.5 h-3.5 text-text-tertiary" />
        <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider">Streak</span>
      </div>
      <div className="flex items-center gap-3">
        {/* Fire visual — CSS triangle/shape */}
        <div className="relative w-10 h-12 shrink-0 flex items-end justify-center">
          <div
            className="w-6 h-8 rounded-full"
            style={{
              background: `radial-gradient(ellipse at bottom, ${color} 0%, ${color}88 40%, transparent 70%)`,
              filter: 'blur(1px)',
            }}
          />
          <div
            className="absolute bottom-0.5 w-3 h-5 rounded-full"
            style={{
              background: `radial-gradient(ellipse at bottom, #fbbf24 0%, ${color}aa 60%, transparent 80%)`,
            }}
          />
        </div>
        <div>
          <p className="text-2xl font-bold font-mono" style={{ color }}>
            {streak}
            <span className="text-sm text-text-tertiary ml-1">day{streak !== 1 ? 's' : ''}</span>
          </p>
          <p className="text-[10px] text-text-tertiary">
            Best: {bestStreak} day{bestStreak !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

const SLOT_LABELS: Record<number, string> = {
  0: 'New', 1: '10m', 2: '1h', 3: '4h', 4: '1d', 5: '3d', 6: '1w',
  7: '2w', 8: '1mo', 9: '2mo', 10: '4mo', 11: '8mo', 12: '1yr', 13: '2yr',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface TopicForecast {
  id: string;
  name: string;
  color: string;
  total_cards: number;
  due_now: number;
  mastered: number;
  new_cards?: number;
  avg_slot?: number;
  overdue: number;
  next_due?: string | null;
  tranches?: { tranche: number; count: number }[];
}

const TRANCHE_NAMES: Record<number, string> = {
  1: 'Immediate', 2: 'Short-Term', 3: 'Medium-Term', 4: 'Long-Term', 5: 'Mastery',
};

const TRANCHE_COLORS: Record<number, string> = {
  1: '#c75a5a', 2: '#c9943b', 3: '#3d9a6e', 4: '#5b8a9a', 5: '#8a6a9a',
};

interface WeekDay {
  day: string;
  label: string;
  count: number;
}

interface CalendarEntry {
  day: string;
  topicId: string;
  topicName: string;
  topicColor: string;
  count: number;
}

interface HistoryEntry {
  day: string;
  topicId: string;
  topicName: string;
  topicColor: string;
  total: number;
  correct: number;
}

interface Stats {
  total: number;
  dueToday: number;
  overdue: number;
  mastered: number;
  newCards: number;
  reviewsToday: number;
  correctToday: number;
  streak: number;
  slotDistribution: { slot: number; count: number }[];
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, tooltip, onClick, urgent }: {
  icon: any; label: string; value: number | string; color?: string; tooltip?: string;
  onClick?: () => void; urgent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`card p-3 sm:p-4 text-left transition-all ${onClick ? 'hover:border-accent/30 active:scale-[0.98] cursor-pointer' : ''} ${urgent ? 'border-error/25 bg-error/[0.03]' : ''}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-text-tertiary" />
        <span className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider">{label}</span>
        {tooltip && <InfoTooltip fieldId={tooltip} />}
      </div>
      <p className="text-xl sm:text-2xl font-bold font-mono" style={{ color: color || '#e4e4e7' }}>{value}</p>
    </button>
  );
}

// ─── Topic Card (mini dashboard per topic) ───────────────────────────────────

function TopicCard({ topic, onClick }: { topic: TopicForecast; onClick: () => void }) {
  const masteryPct = topic.total_cards > 0 ? Math.round((topic.mastered / topic.total_cards) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="card p-4 text-left hover:border-accent/30 active:scale-[0.98] transition-all cursor-pointer w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: topic.color }} />
          <h3 className="font-medium text-text-primary text-sm truncate">{topic.name}</h3>
        </div>
        <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
      </div>

      {/* Due count with tranche breakdown */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {topic.due_now > 0 ? (
            <span className={`text-sm font-mono font-bold ${topic.overdue > 0 ? 'text-error' : 'text-warning'}`}>
              {topic.due_now} due
            </span>
          ) : (
            <span className="text-sm text-success font-medium">All caught up</span>
          )}
        </div>
        <span className="text-[11px] text-text-tertiary">{topic.total_cards} cards</span>
      </div>

      {/* Tranche breakdown mini-bar */}
      {topic.tranches && topic.due_now > 0 && (
        <div className="flex gap-1 mb-2">
          {topic.tranches.filter(t => t.count > 0).map(t => (
            <div
              key={t.tranche}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${TRANCHE_COLORS[t.tranche]}15`, color: TRANCHE_COLORS[t.tranche] }}
            >
              <span className="font-mono font-bold">{t.count}</span>
              <span className="opacity-70">{TRANCHE_NAMES[t.tranche]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full bg-surface-base rounded-full h-1.5 mb-1.5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{
            width: `${masteryPct}%`,
            backgroundColor: masteryPct >= 80 ? '#3d9a6e' : masteryPct >= 40 ? '#c9943b' : '#c75a5a',
          }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-text-tertiary">
        <span>{masteryPct}% mastered</span>
        {topic.next_due && <span>Next: {fmt.relativeTime(topic.next_due)}</span>}
      </div>
    </button>
  );
}

// ─── Week Forecast Bar ───────────────────────────────────────────────────────

function WeekForecast({ data }: { data: WeekDay[] }) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">This Week</h3>
      </div>
      <div className="flex items-end gap-1.5 sm:gap-2 h-[100px]">
        {data.map((d, i) => {
          const height = d.count > 0 ? Math.max(8, (d.count / maxCount) * 100) : 4;
          const isToday = i === 0;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-text-secondary">{d.count || ''}</span>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${height}%`,
                  backgroundColor: isToday ? '#d4a853' : d.count > 0 ? '#5b8a9a' : '#1a1d27',
                  minHeight: d.count > 0 ? 8 : 2,
                }}
              />
              <span className={`text-[10px] ${isToday ? 'text-accent font-bold' : 'text-text-tertiary'}`}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Calendar Heatmap ────────────────────────────────────────────────────────

function CalendarHeatmap({ history }: { history: HistoryEntry[] }) {
  // Aggregate by day
  const dayMap = new Map<string, number>();
  for (const h of history) {
    dayMap.set(h.day, (dayMap.get(h.day) || 0) + h.total);
  }

  const weeks: { date: Date; count: number }[][] = [];
  const today = new Date();
  for (let w = 11; w >= 0; w--) {
    const week: { date: Date; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7 + (6 - d)));
      const key = date.toISOString().slice(0, 10);
      week.push({ date, count: dayMap.get(key) || 0 });
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...Array.from(dayMap.values()));

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Activity (12 weeks)</h3>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => {
              const intensity = day.count / maxCount;
              const bg = day.count === 0
                ? '#1a1d27'
                : `rgba(212, 168, 83, ${0.2 + intensity * 0.8})`;
              return (
                <div
                  key={di}
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: bg }}
                  title={`${day.date.toLocaleDateString()}: ${day.count} reviews`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-text-tertiary">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: i === 0 ? '#1a1d27' : `rgba(212, 168, 83, ${0.2 + i * 0.8})` }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export function DashboardView() {
  const { selectedTopicId, topics, selectTopic } = useStore();
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats | null>(null);
  const [forecast, setForecast] = useState<{ topics: TopicForecast[]; weekForecast: WeekDay[] } | null>(null);
  const [calendar, setCalendar] = useState<{ upcoming: CalendarEntry[]; history: HistoryEntry[] } | null>(null);
  const [topicSR, setTopicSR] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Fire decay check in background (don't block dashboard load)
        fetch('/api/study/decay-check', { method: 'POST' }).catch(() => {});

        const params = selectedTopicId ? `?topic=${selectedTopicId}` : '';

        // Load all data in parallel
        const fetches: Promise<Response>[] = [
          fetch(`/api/study/stats${params}`),
          fetch('/api/study/master-dashboard'),
          fetch('/api/study/forecast'),
        ];
        if (selectedTopicId) {
          fetches.push(fetch(`/api/study/topic-dashboard/${selectedTopicId}`));
        }

        const results = await Promise.all(fetches);
        const [statsData, masterData, forecastData] = await Promise.all(
          results.slice(0, 3).map(r => r.json())
        );

        setStats(statsData);
        setForecast({ topics: masterData.topics, weekForecast: forecastData.weekForecast });

        if (selectedTopicId && results[3]) {
          setTopicSR(await results[3].json());
        } else {
          setTopicSR(null);
        }

        // Calendar loads in background (non-critical)
        fetch('/api/study/calendar?days=60').then(r => r.json()).then(setCalendar).catch(() => {});
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedTopicId]);

  if (loading || !stats || !forecast) {
    return <div className="text-text-secondary text-center py-20">Loading dashboard...</div>;
  }

  const accuracy = stats.reviewsToday > 0
    ? Math.round((stats.correctToday / stats.reviewsToday) * 100) : 0;

  const totalDueAllTopics = forecast.topics.reduce((sum, t) => sum + t.due_now, 0);
  const totalOverdue = forecast.topics.reduce((sum, t) => sum + t.overdue, 0);

  // Daily goal
  const [dailyGoal, setDailyGoalState] = useState(getDailyGoal);
  const handleGoalChange = (n: number) => {
    setDailyGoalStorage(n);
    setDailyGoalState(n);
  };

  // Best streak
  const bestStreak = updateBestStreak(stats.streak);

  // Slot distribution for charts
  const slotData = Array.from({ length: 14 }, (_, i) => {
    const found = stats.slotDistribution.find((s) => s.slot === i);
    return { slot: i, label: SLOT_LABELS[i], count: found?.count || 0, color: SLOT_COLORS[i] };
  });

  const goStudy = () => navigate('/study');
  const goStudyTopic = (topicId: string) => {
    selectTopic(topicId);
    navigate('/study');
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary">
            {selectedTopic ? selectedTopic.name : 'Command Center'}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            {selectedTopic ? 'Topic SR overview' : 'Your learning intelligence across all topics'}
          </p>
        </div>
        {totalDueAllTopics > 0 && (
          <button
            onClick={goStudy}
            className="btn-primary flex items-center gap-2 text-sm active:scale-[0.98]"
          >
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Study Now</span>
            <span className="sm:hidden">Study</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">{totalDueAllTopics}</span>
          </button>
        )}
      </div>

      {/* Urgent banner if overdue */}
      {totalOverdue > 0 && (
        <button
          onClick={goStudy}
          className="w-full card border-error/30 bg-error/[0.05] p-3 sm:p-4 mb-4 sm:mb-6 flex items-center gap-3 hover:bg-error/[0.08] active:scale-[0.99] transition-all"
        >
          <AlertTriangle className="w-5 h-5 text-error shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-error">
              {totalOverdue} card{totalOverdue !== 1 ? 's' : ''} overdue — past grace period
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">Review now to prevent slot regression</p>
          </div>
          <ChevronRight className="w-4 h-4 text-error shrink-0" />
        </button>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <DailyGoalCard reviewed={stats.reviewsToday} goal={dailyGoal} onGoalChange={handleGoalChange} />
        <StreakDisplay streak={stats.streak} bestStreak={bestStreak} />
        <StatCard icon={Clock} label="Due Now" value={stats.dueToday} color={stats.dueToday > 0 ? '#c9943b' : '#3d9a6e'} tooltip="due-today" onClick={stats.dueToday > 0 ? goStudy : undefined} urgent={stats.dueToday > 10} />
        <StatCard icon={BarChart3} label="Accuracy" value={fmt.pct(accuracy)} color={HEAT_COLORS[getAccuracyHeat(accuracy)]} tooltip="accuracy" />
        <StatCard icon={Target} label="Mastered" value={stats.mastered} color="#3d9a6e" tooltip="mastered" />
        <StatCard icon={BookOpen} label="Total Cards" value={stats.total} color="#e4e4e7" />
      </div>

      {/* Week Forecast + Quick Stats */}
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <WeekForecast data={forecast.weekForecast} />

        {/* Tier Distribution */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Tier Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={slotData} barSize={20}>
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {slotData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Topics Grid — the core Palantir-style view */}
      {!selectedTopicId && forecast.topics.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Topics</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {forecast.topics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onClick={() => {
                  selectTopic(topic.id);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Per-Topic Detail (when a topic is selected) */}
      {selectedTopicId && topicSR && (
        <div className="mb-4 sm:mb-6">
          {/* Study button for this topic */}
          {topicSR.sets && topicSR.sets.some((s: any) => s.due > 0) && (
            <button
              onClick={() => goStudyTopic(selectedTopicId)}
              className="w-full card border-accent/30 bg-accent/[0.05] p-3 mb-4 flex items-center gap-3 hover:bg-accent/[0.08] active:scale-[0.99] transition-all"
            >
              <Play className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium text-accent">Study this topic</span>
              <ChevronRight className="w-4 h-4 text-accent ml-auto" />
            </button>
          )}

          {/* Topic summary */}
          {topicSR.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="card p-3">
                <p className="text-xs text-text-tertiary uppercase">Total</p>
                <p className="text-lg font-bold font-mono text-text-primary">{topicSR.summary.total || 0}</p>
              </div>
              <div className="card p-3">
                <p className="text-xs text-text-tertiary uppercase">Due</p>
                <p className="text-lg font-bold font-mono text-warning">{topicSR.summary.due || 0}</p>
              </div>
              <div className="card p-3">
                <p className="text-xs text-text-tertiary uppercase">Overdue</p>
                <p className="text-lg font-bold font-mono text-error">{topicSR.summary.overdue || 0}</p>
              </div>
              <div className="card p-3">
                <p className="text-xs text-text-tertiary uppercase">Mastered</p>
                <p className="text-lg font-bold font-mono text-secondary">{topicSR.summary.mastered || 0}</p>
              </div>
            </div>
          )}

          {/* Sets breakdown with tranche drill-down */}
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Card Sets</h3>
          <div className="space-y-2 mb-6">
            {topicSR.sets?.map((set: any) => {
              const masteryPct = set.total > 0 ? Math.round((set.mastered / set.total) * 100) : 0;
              return (
                <button
                  key={set.id}
                  onClick={() => {
                    selectTopic(selectedTopicId!);
                    navigate(`/study?set=${set.id}`);
                  }}
                  className="card p-3 w-full text-left hover:border-accent/40 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-text-primary truncate">{set.name}</p>
                    <div className="flex items-center gap-2">
                      {set.due > 0 && (
                        <span className={`text-xs font-mono font-bold ${set.overdue > 0 ? 'text-error' : 'text-warning'}`}>
                          {set.due} due
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
                    </div>
                  </div>
                  {/* Tranche breakdown for this set */}
                  {set.tranches && set.due > 0 && (
                    <div className="flex gap-1 mb-1.5">
                      {set.tranches.filter((t: any) => t.count > 0).map((t: any) => (
                        <div
                          key={t.tranche}
                          className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded"
                          style={{ backgroundColor: `${TRANCHE_COLORS[t.tranche]}15`, color: TRANCHE_COLORS[t.tranche] }}
                        >
                          <span className="font-mono font-bold">{t.count}</span>
                          <span className="opacity-70">{TRANCHE_NAMES[t.tranche]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-text-tertiary">{set.total} cards</span>
                    <span className="text-text-tertiary">{masteryPct}% mastered</span>
                    <div className="flex-1" />
                    <div className="w-16 bg-surface-base rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${masteryPct}%`,
                          backgroundColor: masteryPct >= 80 ? '#3d9a6e' : masteryPct >= 40 ? '#c9943b' : '#c75a5a',
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Accuracy trend for this topic */}
          {topicSR.accuracy?.length > 0 && (
            <div className="card p-4 sm:p-5 mb-6">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Accuracy Trend (30d)</h3>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={topicSR.accuracy.map((a: any) => ({
                  day: a.day.slice(5),
                  accuracy: a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0,
                }))}>
                  <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="accuracy" stroke="#d4a853" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* SR Pipeline — cards in the system */}
          {topicSR.cards?.length > 0 && (
            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                SR Pipeline ({topicSR.cards.length} cards)
              </h3>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {topicSR.cards.slice(0, 50).map((card: any) => {
                  const isDue = !card.sr_next_due_at || new Date(card.sr_next_due_at) <= new Date();
                  const dueLabel = card.sr_next_due_at
                    ? fmt.relativeTime(card.sr_next_due_at)
                    : 'now';
                  return (
                    <div key={card.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: SLOT_COLORS[card.sr_slot] }}
                      />
                      <span className="text-xs text-text-primary truncate flex-1">
                        {card.preview?.slice(0, 50) || `Card (${card.set_name})`}
                      </span>
                      <span className="text-[10px] text-text-tertiary font-mono shrink-0">{SLOT_LABELS[card.sr_slot]}</span>
                      <span className={`text-[10px] font-mono shrink-0 ${isDue ? 'text-warning' : 'text-text-tertiary'}`}>
                        {dueLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Heatmap */}
      {calendar && <CalendarHeatmap history={calendar.history} />}
    </div>
  );
}
