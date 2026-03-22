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
import { TIER_COLORS, HEAT_COLORS, getAccuracyHeat, getStreakHeat, fmt } from '../../utils/formatters';

const TIER_LABELS: Record<number, string> = {
  0: 'New', 1: '4h', 2: '1d', 3: '2d', 4: '1w', 5: '2w', 6: '1mo', 7: '3mo', 8: '6mo',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface TopicForecast {
  id: string;
  name: string;
  color: string;
  total_cards: number;
  due_now: number;
  mastered: number;
  new_cards: number;
  avg_tier: number;
  overdue: number;
}

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
  tierDistribution: { tier: number; count: number }[];
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
      className={`card p-3 sm:p-4 text-left transition-all ${onClick ? 'hover:border-accent/40 active:scale-[0.98] cursor-pointer' : ''} ${urgent ? 'border-red-500/30 bg-red-500/[0.03]' : ''}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        {tooltip && <InfoTooltip fieldId={tooltip} />}
      </div>
      <p className="text-xl sm:text-2xl font-bold font-mono" style={{ color: color || '#e5e7eb' }}>{value}</p>
    </button>
  );
}

// ─── Topic Card (mini dashboard per topic) ───────────────────────────────────

function TopicCard({ topic, onClick }: { topic: TopicForecast; onClick: () => void }) {
  const masteryPct = topic.total_cards > 0 ? Math.round((topic.mastered / topic.total_cards) * 100) : 0;
  const avgTier = Math.round((topic.avg_tier || 0) * 10) / 10;

  return (
    <button
      onClick={onClick}
      className="card p-4 text-left hover:border-accent/40 active:scale-[0.98] transition-all cursor-pointer w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: topic.color }} />
          <h3 className="font-medium text-white text-sm truncate">{topic.name}</h3>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-base rounded-full h-2 mb-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: `${masteryPct}%`,
            backgroundColor: masteryPct >= 80 ? '#22c55e' : masteryPct >= 40 ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3">
          {topic.due_now > 0 && (
            <span className={`font-mono font-medium ${topic.overdue > 0 ? 'text-red-400' : 'text-amber-400'}`}>
              {topic.due_now} due
            </span>
          )}
          {topic.due_now === 0 && (
            <span className="text-green-400 font-medium">All caught up</span>
          )}
          <span className="text-gray-500">{topic.total_cards} cards</span>
        </div>
        <span className="text-gray-500 font-mono">{masteryPct}%</span>
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
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">This Week</h3>
      </div>
      <div className="flex items-end gap-1.5 sm:gap-2 h-[100px]">
        {data.map((d, i) => {
          const height = d.count > 0 ? Math.max(8, (d.count / maxCount) * 100) : 4;
          const isToday = i === 0;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-gray-400">{d.count || ''}</span>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${height}%`,
                  backgroundColor: isToday ? '#6366f1' : d.count > 0 ? '#f59e0b' : '#1a1d27',
                  minHeight: d.count > 0 ? 8 : 2,
                }}
              />
              <span className={`text-[10px] ${isToday ? 'text-accent font-bold' : 'text-gray-500'}`}>
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
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Activity (12 weeks)</h3>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => {
              const intensity = day.count / maxCount;
              const bg = day.count === 0
                ? '#1a1d27'
                : `rgba(99, 102, 241, ${0.2 + intensity * 0.8})`;
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
      <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: i === 0 ? '#1a1d27' : `rgba(99, 102, 241, ${0.2 + i * 0.8})` }}
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
      <p className="text-gray-400 mb-1">{label}</p>
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
        const params = selectedTopicId ? `?topic=${selectedTopicId}` : '';

        const [statsRes, forecastRes, calendarRes] = await Promise.all([
          fetch(`/api/study/stats${params}`),
          fetch('/api/study/forecast'),
          fetch('/api/study/calendar?days=60'),
        ]);

        setStats(await statsRes.json());
        setForecast(await forecastRes.json());
        setCalendar(await calendarRes.json());

        // If a topic is selected, load its SR detail
        if (selectedTopicId) {
          const srRes = await fetch(`/api/study/topic-sr/${selectedTopicId}`);
          setTopicSR(await srRes.json());
        } else {
          setTopicSR(null);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedTopicId]);

  if (loading || !stats || !forecast) {
    return <div className="text-gray-400 text-center py-20">Loading dashboard...</div>;
  }

  const accuracy = stats.reviewsToday > 0
    ? Math.round((stats.correctToday / stats.reviewsToday) * 100) : 0;

  const totalDueAllTopics = forecast.topics.reduce((sum, t) => sum + t.due_now, 0);
  const totalOverdue = forecast.topics.reduce((sum, t) => sum + t.overdue, 0);

  // Tier distribution for charts
  const tierData = Array.from({ length: 9 }, (_, i) => {
    const found = stats.tierDistribution.find((t) => t.tier === i);
    return { tier: i, label: TIER_LABELS[i], count: found?.count || 0, color: TIER_COLORS[i] };
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
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white">
            {selectedTopic ? selectedTopic.name : 'Command Center'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
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
          className="w-full card border-red-500/30 bg-red-500/[0.05] p-3 sm:p-4 mb-4 sm:mb-6 flex items-center gap-3 hover:bg-red-500/[0.08] active:scale-[0.99] transition-all"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-red-400">
              {totalOverdue} card{totalOverdue !== 1 ? 's' : ''} overdue — at risk of tier decay
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Review now to prevent losing progress</p>
          </div>
          <ChevronRight className="w-4 h-4 text-red-400 shrink-0" />
        </button>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <StatCard icon={Clock} label="Due Now" value={stats.dueToday} color={stats.dueToday > 0 ? '#f59e0b' : '#22c55e'} tooltip="due-today" onClick={stats.dueToday > 0 ? goStudy : undefined} urgent={stats.dueToday > 10} />
        <StatCard icon={Flame} label="Streak" value={fmt.streak(stats.streak)} color={HEAT_COLORS[getStreakHeat(stats.streak)]} tooltip="streak" />
        <StatCard icon={BarChart3} label="Accuracy" value={fmt.pct(accuracy)} color={HEAT_COLORS[getAccuracyHeat(accuracy)]} tooltip="accuracy" />
        <StatCard icon={Target} label="Mastered" value={stats.mastered} color="#22c55e" tooltip="mastered" />
      </div>

      {/* Week Forecast + Quick Stats */}
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <WeekForecast data={forecast.weekForecast} />

        {/* Tier Distribution */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Tier Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={tierData} barSize={20}>
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {tierData.map((entry, i) => (
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
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Topics</h3>
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

          {/* Sets breakdown */}
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Card Sets</h3>
          <div className="space-y-2 mb-6">
            {topicSR.sets?.map((set: any) => {
              const masteryPct = set.total > 0 ? Math.round((set.mastered / set.total) * 100) : 0;
              return (
                <div key={set.id} className="card p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{set.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px]">
                      <span className="text-gray-500">{set.total} cards</span>
                      {set.due > 0 && <span className="text-amber-400 font-mono">{set.due} due</span>}
                      <span className="text-gray-500">{masteryPct}% mastered</span>
                    </div>
                  </div>
                  <div className="w-16 bg-surface-base rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${masteryPct}%`,
                        backgroundColor: masteryPct >= 80 ? '#22c55e' : masteryPct >= 40 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Accuracy trend for this topic */}
          {topicSR.accuracy?.length > 0 && (
            <div className="card p-4 sm:p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Accuracy Trend (30d)</h3>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={topicSR.accuracy.map((a: any) => ({
                  day: a.day.slice(5),
                  accuracy: a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0,
                }))}>
                  <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* SR Pipeline — cards in the system */}
          {topicSR.cards?.length > 0 && (
            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
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
                        style={{ backgroundColor: TIER_COLORS[card.sr_tier] }}
                      />
                      <span className="text-xs text-gray-300 truncate flex-1">
                        {card.preview?.slice(0, 50) || `Card (${card.set_name})`}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono shrink-0">{TIER_LABELS[card.sr_tier]}</span>
                      <span className={`text-[10px] font-mono shrink-0 ${isDue ? 'text-amber-400' : 'text-gray-600'}`}>
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
