import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface DurationBucket {
  label: string;
  count: number;
}

interface DurationData {
  buckets: DurationBucket[];
  averageMs: number | null;
  totalReviews: number;
}

const BUCKET_COLORS: Record<string, string> = {
  '<3s': '#3d9a6e',
  '3-5s': '#6aab6a',
  '5-10s': '#c9943b',
  '10-20s': '#c97a3b',
  '20-60s': '#c75a5a',
  '>60s': '#a33a3a',
};

export function DurationChart() {
  const [data, setData] = useState<DurationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/study/duration')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || data.totalReviews === 0) return null;

  const maxCount = Math.max(1, ...data.buckets.map((b) => b.count));
  const avgSec = data.averageMs ? (data.averageMs / 1000).toFixed(1) : '--';

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Response Time
          </h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-text-tertiary">Average</span>
          <p className="text-sm font-mono font-bold text-text-primary">{avgSec}s</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {data.buckets.map((bucket) => {
          const pct = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
          const color = BUCKET_COLORS[bucket.label] || '#6b7280';
          return (
            <div key={bucket.label} className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-text-secondary w-10 text-right shrink-0">
                {bucket.label}
              </span>
              <div
                className="flex-1 h-4 bg-surface-base rounded overflow-hidden relative"
                style={{ maxWidth: 300 }}
              >
                <div
                  className="h-full rounded transition-all"
                  style={{ width: `${Math.max(pct, bucket.count > 0 ? 2 : 0)}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-[11px] font-mono text-text-tertiary w-10 text-right shrink-0">
                {bucket.count}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-text-tertiary mt-2 text-center">
        {data.totalReviews.toLocaleString()} reviews with timing data
      </p>
    </div>
  );
}
