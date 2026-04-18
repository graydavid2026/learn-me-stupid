import { ReactNode, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, GraduationCap, LayoutGrid, Brain, BarChart3, Settings } from 'lucide-react';
import { useStore } from '../../stores/useStore';
import { TopicDropdown } from './TopicDropdown';

const navItems = [
  { to: '/study', label: 'Study', icon: GraduationCap },
  { to: '/cards', label: 'Cards', icon: LayoutGrid },
  { to: '/deep-dive', label: 'Deep Dive', icon: Brain },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const fetchTopics = useStore((s) => s.fetchTopics);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      {/* Top header */}
      <header className="bg-surface-base/90 backdrop-blur-md border-b border-border-subtle px-3 sm:px-5 h-12 sm:h-14 flex items-center justify-between shrink-0 safe-top">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <BookOpen className="w-5 h-5 sm:w-5 sm:h-5 text-accent" />
            <h1 className="font-heading font-bold text-sm sm:text-base text-text-primary tracking-tight hidden xs:block">
              LMS
            </h1>
          </div>
          <div className="w-px h-4 bg-border/50 shrink-0" />
          <TopicDropdown />
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto px-3 py-4 sm:p-6 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-base/90 backdrop-blur-md border-t border-border-subtle safe-bottom z-50">
        <div className="flex items-center justify-around h-14">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 min-w-[60px] rounded-lg transition-colors ${
                  isActive
                    ? 'text-accent'
                    : 'text-text-tertiary active:text-text-secondary'
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
