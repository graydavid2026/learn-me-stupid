import { SessionStats, StudyMode } from './StudyView';

interface StudyProgressProps {
  topicName: string | undefined;
  currentIndex: number;
  total: number;
  stats: SessionStats;
  mode: StudyMode;
  onEndSession: () => void;
}

export function StudyProgress({ topicName, currentIndex, total, stats, mode, onEndSession }: StudyProgressProps) {
  return (
    <>
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-text-secondary truncate max-w-[120px] sm:max-w-none">
            {topicName || 'All Topics'}
          </span>
          <span className="text-xs text-text-tertiary">|</span>
          <span className="text-xs sm:text-sm font-mono text-text-secondary">
            {currentIndex + 1}/{total}
          </span>
          {mode === 'cram' && (
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-warning/15 text-warning border border-warning/25 px-1.5 py-0.5 rounded">Cram</span>
          )}
          {mode === 'smart' && (
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-accent/15 text-accent border border-accent/25 px-1.5 py-0.5 rounded">Smart</span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm text-success font-mono">{stats.correct} ✓</span>
          <span className="text-xs sm:text-sm text-error font-mono">{stats.wrong} ✗</span>
          <button
            onClick={onEndSession}
            className="text-xs text-text-tertiary hover:text-text-secondary active:text-text-primary"
          >
            End
          </button>
        </div>
      </div>

      {/* Progress track */}
      <div className="w-full bg-surface rounded-full h-1.5 mb-4">
        <div
          className="h-1.5 rounded-full bg-accent transition-all duration-300"
          style={{ width: `${((currentIndex) / total) * 100}%` }}
        />
      </div>
    </>
  );
}
