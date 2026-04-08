import { ReactNode, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, GraduationCap, LayoutGrid, Brain, BarChart3 } from 'lucide-react';
import { useStore } from '../../stores/useStore';
import { TopicDropdown } from './TopicDropdown';

const navItems = [
  { to: '/study', label: 'Study', icon: GraduationCap },
  { to: '/cards', label: 'Cards', icon: LayoutGrid },
  { to: '/deep-dive', label: 'Deep Dive', icon: Brain },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const fetchTopics = useStore((s) => s.fetchTopics);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      {/* Top header — compact on mobile */}
      <header className="bg-surface border-b border-border px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between shrink-0 safe-top">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            <h1 className="font-heading font-bold text-base sm:text-lg text-white tracking-tight hidden xs:block">
              LMS
            </h1>
          </div>
          <div className="w-px h-5 bg-border shrink-0" />
          <TopicDropdown />
        </div>

        {/* Desktop nav — hidden on mobile (shown in bottom bar instead) */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-elevated'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main content — padding adjusted for mobile, bottom padding for nav bar */}
      <main className="flex-1 overflow-auto px-3 py-4 sm:p-6 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border safe-bottom z-50">
        <div className="flex items-center justify-around h-14">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 min-w-[60px] rounded-lg transition-colors ${
                  isActive
                    ? 'text-accent'
                    : 'text-gray-500 active:text-gray-300'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
