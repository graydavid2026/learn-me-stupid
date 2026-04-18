import { useState, useEffect } from 'react';
import { CalendarClock } from 'lucide-react';

interface ForecastDay {
  date: string;
  dueCount: number;
  estimatedNew: number;
}

export function ForecastChart() {
  const [data, setData] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/study/forecast-30d')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || data.length === 0) return null;

  const maxTotal = Math.max(1, ...data.map((d) => d.dueCount + d.estimatedNew));
  const barW = 100 / data.length;
  const svgH = 120;
  const svgW = 600;
  const gap = 1;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          30-Day Forecast
        </h3>
      </div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH + 20}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {data.map((d, i) => {
          const x = (i / data.length) * svgW + gap / 2;
          const w = (svgW / data.length) - gap;
          const dueH = (d.dueCount / maxTotal) * svgH;
          const newH = (d.estimatedNew / maxTotal) * svgH;
          const totalH = dueH + newH;
          const dueY = svgH - totalH;
          const newY = svgH - newH;

          const dayLabel = d.date.slice(8);
          const showLabel = i === 0 || i === 6 || i === 13 || i === 20 || i === 29;

          return (
            <g key={d.date}>
              <title>
                {d.date}: {d.dueCount} due, {d.estimatedNew} est. new
              </title>
              {/* Due reviews bar */}
              {d.dueCount > 0 && (
                <rect
                  x={x}
                  y={dueY}
                  width={w}
                  height={dueH}
                  rx={1}
                  fill="#d4a853"
                  opacity={0.9}
                />
              )}
              {/* Estimated new bar */}
              {d.estimatedNew > 0 && (
                <rect
                  x={x}
                  y={newY}
                  width={w}
                  height={newH}
                  rx={1}
                  fill="#5b8a9a"
                  opacity={0.7}
                />
              )}
              {/* Day label */}
              {showLabel && (
                <text
                  x={x + w / 2}
                  y={svgH + 14}
                  textAnchor="middle"
                  className="fill-text-tertiary"
                  style={{ fontSize: 9, fontFamily: 'monospace' }}
                >
                  {i === 0 ? 'Today' : dayLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-text-tertiary">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: '#d4a853' }} />
          <span>Due reviews</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: '#5b8a9a' }} />
          <span>Est. new cards</span>
        </div>
      </div>
    </div>
  );
}
