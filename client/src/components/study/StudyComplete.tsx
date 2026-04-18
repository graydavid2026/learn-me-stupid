import { useState, useEffect } from 'react';
import { GraduationCap, RotateCcw, ChevronRight, ArrowLeft, Flame } from 'lucide-react';
import { AchievementToast, ACHIEVEMENTS, Achievement, getAchieved, markAchieved } from '../ui/AchievementToast';
import { CardFull } from '../../stores/useStore';
import { SLOT_COLORS, SLOT_LABELS } from './StudyCard';
import { getStreakHeat, HEAT_COLORS } from '../../utils/formatters';
import { SessionStats } from './StudyView';
import { useNavigate } from 'react-router-dom';

interface StudyCompleteProps {
  stats: SessionStats;
  queue: CardFull[];
  selectedTopicId: string | null;
  wrongCardIds: string[];
  onStudyAgain: (ids?: string[]) => void;
  onStudyMenu: () => void;
}

export function StudyComplete({ stats, queue, selectedTopicId, wrongCardIds, onStudyAgain, onStudyMenu }: StudyCompleteProps) {
  const navigate = useNavigate();
  const [completeStreak, setCompleteStreak] = useState(0);
  const [nextDueLabel, setNextDueLabel] = useState<string | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);

  const accuracy = stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0;

  useEffect(() => {
    (async () => {
      try {
        const params = selectedTopicId ? `?topic=${selectedTopicId}` : '';
        const res = await fetch(`/api/study/stats${params}`);
        let streak = 0;
        let totalReviews = 0;
        if (res.ok) {
          const data = await res.json();
          streak = data.streak || 0;
          totalReviews = data.totalReviews || 0;
          setCompleteStreak(streak);
        }
        const dueRes = await fetch('/api/study/forecast');
        if (dueRes.ok) {
          const fc = await dueRes.json();
          const wf = fc.weekForecast;
          if (wf && wf.length > 1 && wf[0].count === 0 && wf[1].count > 0) {
            setNextDueLabel('Come back tomorrow');
          } else if (wf && wf[0].count > 0) {
            setNextDueLabel(`${wf[0].count} more cards due today`);
          } else {
            setNextDueLabel('Come back tomorrow');
          }
        }

        // Check achievements after session
        const newAchievements: Achievement[] = [];
        const achieved = getAchieved();

        if (!achieved.includes('first-steps') && markAchieved('first-steps')) {
          newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'first-steps')!);
        }
        if (!achieved.includes('perfect-session') && stats.reviewed >= 5 && stats.wrong === 0 && markAchieved('perfect-session')) {
          newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'perfect-session')!);
        }
        if (!achieved.includes('on-fire') && streak >= 7 && markAchieved('on-fire')) {
          newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'on-fire')!);
        }
        if (!achieved.includes('century') && totalReviews >= 100 && markAchieved('century')) {
          newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'century')!);
        }
        const highSlotCards = queue.filter(c => c.sr_slot >= 5).length;
        if (!achieved.includes('half-way') && queue.length >= 2 && highSlotCards >= queue.length * 0.5 && markAchieved('half-way')) {
          newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'half-way')!);
        }
        if (!achieved.includes('scholar') && queue.some(c => c.sr_slot >= 10) && markAchieved('scholar')) {
          newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'scholar')!);
        }

        if (newAchievements.length > 0) {
          setAchievementQueue(newAchievements);
        }
      } catch {}
    })();
  }, [selectedTopicId]);

  const motivationCopy = accuracy === 100
    ? 'Perfect session! Your memory is razor-sharp.'
    : accuracy >= 90
      ? 'Outstanding recall. You\'re building deep retention.'
      : accuracy >= 75
        ? 'Solid session. The spaced repetition is working.'
        : accuracy >= 50
          ? 'Good effort. The cards you missed will come back sooner for extra practice.'
          : 'Tough session, but showing up is what matters. Those tricky cards will repeat soon.';

  return (
    <>
      {achievementQueue.length > 0 && (
        <AchievementToast
          achievement={achievementQueue[0]}
          onDismiss={() => setAchievementQueue(prev => prev.slice(1))}
        />
      )}
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="card p-8">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-accent" />
          <h2 className="text-2xl font-heading font-bold text-text-primary mb-2">Session Complete!</h2>
          <p className="text-text-secondary mb-4">{motivationCopy}</p>

          {/* Streak display */}
          {completeStreak > 0 && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Flame className="w-5 h-5" style={{ color: HEAT_COLORS[getStreakHeat(completeStreak)] }} />
              <span className="text-lg font-bold font-mono" style={{ color: HEAT_COLORS[getStreakHeat(completeStreak)] }}>
                {completeStreak} day{completeStreak !== 1 ? 's' : ''} streak
              </span>
            </div>
          )}

          {/* Next due countdown */}
          {nextDueLabel && (
            <div className="bg-surface-base rounded-lg px-4 py-2 mb-6 inline-block">
              <span className="text-xs text-text-tertiary">{nextDueLabel}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-surface-base rounded-lg p-3">
              <p className="text-2xl font-bold font-mono text-text-primary">{stats.reviewed}</p>
              <p className="text-xs text-text-tertiary">Reviewed</p>
            </div>
            <div className="bg-surface-base rounded-lg p-3">
              <p className="text-2xl font-bold font-mono text-success">{stats.correct}</p>
              <p className="text-xs text-text-tertiary">Correct</p>
            </div>
            <div className="bg-surface-base rounded-lg p-3">
              <p className="text-2xl font-bold font-mono text-error">{stats.wrong}</p>
              <p className="text-xs text-text-tertiary">Wrong</p>
            </div>
          </div>

          <div className="bg-surface-base rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Accuracy</span>
              <span className="text-lg font-mono font-bold" style={{ color: accuracy >= 80 ? '#3d9a6e' : accuracy >= 50 ? '#c9943b' : '#c75a5a' }}>
                {accuracy}%
              </span>
            </div>
            <div className="w-full bg-surface rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${accuracy}%`, backgroundColor: accuracy >= 80 ? '#3d9a6e' : accuracy >= 50 ? '#c9943b' : '#c75a5a' }}
              />
            </div>
          </div>

          {stats.slotChanges.length > 0 && (
            <div className="text-left mb-6">
              <h3 className="text-sm font-semibold text-text-secondary mb-2">Tier Changes</h3>
              <div className="space-y-1">
                {stats.slotChanges.map((tc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-mono" style={{ color: SLOT_COLORS[tc.from] }}>{SLOT_LABELS[tc.from]}</span>
                    <ChevronRight className="w-3 h-3 text-text-tertiary" />
                    <span className="font-mono" style={{ color: SLOT_COLORS[tc.to] }}>{SLOT_LABELS[tc.to]}</span>
                    {tc.to > tc.from ? (
                      <span className="text-success text-xs">promoted</span>
                    ) : (
                      <span className="text-error text-xs">demoted</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => navigate('/stats')} className="btn-secondary flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <button onClick={onStudyMenu} className="btn-secondary">
              Study Menu
            </button>
            <button
              onClick={() => onStudyAgain(wrongCardIds.length > 0 ? wrongCardIds : undefined)}
              className="btn-primary flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {wrongCardIds.length > 0 ? `Redo ${wrongCardIds.length} Wrong` : 'Study Again'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
