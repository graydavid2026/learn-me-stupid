import { ReactNode, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, GraduationCap, LayoutGrid, Map, BarChart3, ChevronDown, Plus } from 'lucide-react';
import { useStore } from '../../stores/useStore';
import { TopicDropdown } from './TopicDropdown';

const navItems = [
  { to: '/study', label: 'Study', icon: GraduationCap },
  { to: '/cards', label: 'Cards', icon: LayoutGrid },
  { to: '/mindmap', label: 'Mind Map', icon: Map },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const fetchTopics = useStore((s) => s.fetchTopics);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      <header className="bg-surface border-b border-border px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-accent" />
            <h1 className="font-heading font-bold text-lg text-white tracking-tight">
              Learn Me Stupid
            </h1>
          </div>
          <div className="w-px h-6 bg-border" />
          <TopicDropdown />
        </div>

        <nav className="flex items-center gap-1">
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
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
