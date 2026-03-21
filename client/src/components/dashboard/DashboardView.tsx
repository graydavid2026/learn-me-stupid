import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Flame, BookOpen, Target, Clock, Award, CalendarClock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { useStore } from '../../stores/useStore';
import { InfoTooltip } from '../ui/InfoTooltip';
import { TIER_COLORS, HEAT_COLORS, getAccuracyHeat, getStreakHeat } from '../../utils/formatters';

const TIER_LABELS: Record<number, string> = {
  0: 'New', 1: '4h', 2: '1d', 3: '2d', 4: '1w', 5: '2w', 6: '1mo', 7: '3mo', 8: '6mo',
};

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

interface DayHistory {
  day: string;
  total: number;
  correct: number;
}

function StatCard({ icon: Icon, label, value, color, tooltip }: { icon: any; label: string; value: number | string; color?: string; tooltip?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        {tooltip && <InfoTooltip fieldId={tooltip} />}
      </div>
      <p className="text-2xl font-bold font-mono" style={{ color: color || '#e5e7eb' }}>{value}</p>
    </div>
  );
}

// Heatmap calendar — last 12 weeks
function HeatmapCalendar({ history }: { history: DayHistory[] }) {
  const dayMap = new Map(history.map((h) => [h.day, h.total]));
  const weeks: { date: Date; count: number }[][] = [];
  const today = new Date();

  // Build 12 weeks of data
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

  const maxCount = Math.max(1, ...history.map((h) => h.total));

  return (
    <div className="flex gap-1">
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
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: bg }}
                title={`${day.date.toLocaleDateString()}: ${day.count} reviews`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface TimelineDay {
  day: string;
  due: number;
  overdue: number;
  label: string;
}

function SRTimeline({ topicId }: { topicId?: string }) {
  const [timeline, setTimeline] = useState<TimelineDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = topicId ? `?topic=${topicId}&days=14` : '?days=14';
        const res = await fetch(`/api/study/timeline${params}`);
        setTimeline(await res.json());
      } catch (err) {
        console.error('Failed to load timeline:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [topicId]);

  if (loading) {
    return (
      <div className="card p-5 mb-8">
        <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">Loading timeline...</div>
      </div>
    );
  }

  const maxDue = Math.max(1, ...timeline.map((d) => d.due + d.overdue));

  // Prepare data: for the stacked chart, split "due" into overdue + regular
  // overdue is a subset of due for today, so regular = due - overdue
  const chartData = timeline.map((d) => ({
    label: d.label,
    day: d.day,
    regular: Math.max(0, d.due - d.overdue),
    overdue: d.overdue,
    total: d.due,
  }));

  const TimelineTooltip = ({ active, payload, label: tooltipLabel }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    return (
      <div className="bg-surface-elevated border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="text-gray-300 font-medium mb-1">{data?.day} — {tooltipLabel}</p>
        {data?.overdue > 0 && (
          <p className="text-red-400">Overdue: {data.overdue}</p>
        )}
        <p className="text-amber-400">Due: {data?.total}</p>
      </div>
    );
  };

  return (
    <div className="card p-5 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Upcoming Reviews (14 Days)</h3>
      </div>
      {chartData.every((d) => d.total === 0) ? (
        <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">No cards scheduled</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={32}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<TimelineTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
            <Bar dataKey="overdue" stackId="stack" fill="#ef4444" radius={[0, 0, 0, 0]} name="Overdue" />
            <Bar dataKey="regular" stackId="stack" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Due">
              {chartData.map((entry, i) => {
                // Highlight today's bar with a brighter color
                const isToday = entry.label === 'Today';
                return (
                  <Cell
                    key={i}
                    fill={isToday ? '#6366f1' : '#f59e0b'}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
          Overdue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#6366f1' }} />
          Due Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
          Upcoming
        </span>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export function DashboardView() {
  const { selectedTopicId, topics } = useStore();
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = selectedTopicId ? `?topic=${selectedTopicId}` : '';
        const [statsRes, historyRes] = await Promise.all([
          fetch(`/api/study/stats${params}`),
          fetch('/api/study/history?days=90'),
        ]);
        setStats(await statsRes.json());
        setHistory(await historyRes.json());
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedTopicId]);

  if (loading || !stats) {
    return <div className="text-gray-400 text-center py-20">Loading stats...</div>;
  }

  const accuracy = stats.reviewsToday > 0
    ? Math.round((stats.correctToday / stats.reviewsToday) * 100)
    : 0;

  // Build accuracy trend from history (last 30 days)
  const accuracyTrend = history.slice(-30).map((h) => ({
    day: h.day.slice(5), // MM-DD
    accuracy: h.total > 0 ? Math.round((h.correct / h.total) * 100) : 0,
    reviews: h.total,
  }));

  // Fill tier distribution (ensure all 9 tiers present)
  const tierData = Array.from({ length: 9 }, (_, i) => {
    const found = stats.tierDistribution.find((t) => t.tier === i);
    return { tier: i, label: TIER_LABELS[i], count: found?.count || 0, color: TIER_COLORS[i] };
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-heading font-bold text-white">
          {selectedTopic ? `${selectedTopic.name} — Stats` : 'Dashboard'}
        </h2>
        <p className="text-sm text-gray-400 mt-1">Your learning progress at a glance</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard icon={BookOpen} label="Total Cards" value={stats.total} />
        <StatCard icon={Clock} label="Due Today" value={stats.dueToday} color={stats.dueToday > 0 ? '#f59e0b' : undefined} tooltip="due-today" />
        <StatCard icon={Target} label="Mastered" value={stats.mastered} color="#22c55e" tooltip="mastered" />
        <StatCard icon={Flame} label="Streak" value={`${stats.streak} day${stats.streak !== 1 ? 's' : ''}`} color={HEAT_COLORS[getStreakHeat(stats.streak)]} tooltip="streak" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Award} label="New Cards" value={stats.newCards} color="#ef4444" />
        <StatCard icon={TrendingUp} label="Reviewed Today" value={stats.reviewsToday} />
        <StatCard icon={BarChart3} label="Today's Accuracy" value={`${accuracy}%`} color={HEAT_COLORS[getAccuracyHeat(accuracy)]} tooltip="accuracy" />
        <StatCard icon={Calendar} label="Overdue" value={stats.overdue} color={stats.overdue > 0 ? '#ef4444' : undefined} tooltip="overdue" />
      </div>

      {/* SR Timeline */}
      <SRTimeline topicId={selectedTopicId || undefined} />

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Tier Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Tier Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tierData} barSize={28}>
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.1)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {tierData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Accuracy Trend */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Accuracy Trend (30d)</h3>
          {accuracyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={accuracyTrend}>
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">No review data yet</div>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="card p-5 mb-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Review Activity (12 weeks)</h3>
        <HeatmapCalendar history={history} />
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
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
    </div>
  );
}
