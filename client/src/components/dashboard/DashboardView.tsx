import { BarChart3 } from 'lucide-react';

export function DashboardView() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
      <BarChart3 className="w-16 h-16 mb-4 text-gray-600" />
      <p className="text-lg font-medium">Dashboard</p>
      <p className="text-sm mt-1">Track your progress and study streaks</p>
      <p className="text-xs mt-4 text-gray-500">Coming in Phase 5</p>
    </div>
  );
}
