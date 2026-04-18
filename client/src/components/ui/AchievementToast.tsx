import { useState, useEffect } from 'react';
import { Trophy, X } from 'lucide-react';

export interface Achievement {
  id: string;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-steps', title: 'First Steps', description: 'Completed your first study session' },
  { id: 'perfect-session', title: 'Perfect Session', description: '100% accuracy with 5+ cards' },
  { id: 'on-fire', title: 'On Fire', description: '7-day study streak' },
  { id: 'century', title: 'Century', description: '100 total reviews completed' },
  { id: 'half-way', title: 'Half Way', description: '50% of cards at slot 5+' },
  { id: 'scholar', title: 'Scholar', description: 'First card reached slot 10+' },
];

const STORAGE_KEY = 'lms.achievements';

export function getAchieved(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markAchieved(id: string): boolean {
  const achieved = getAchieved();
  if (achieved.includes(id)) return false;
  achieved.push(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(achieved));
  return true;
}

export function AchievementToast({ achievement, onDismiss }: { achievement: Achievement; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    const showTimer = setTimeout(() => setVisible(true), 50);
    // Auto-dismiss after 4s
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-surface border-l-4 border-accent border-t border-r border-b border-t-border border-r-border border-b-border rounded-lg shadow-2xl px-5 py-3.5 flex items-center gap-3 min-w-[280px] max-w-md">
        <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-accent font-semibold mb-0.5">Achievement Unlocked</div>
          <div className="text-sm font-medium text-text-primary">{achievement.title}</div>
          <div className="text-xs text-text-tertiary">{achievement.description}</div>
        </div>
        <button
          onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
          className="p-1 text-text-tertiary hover:text-text-secondary shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
