import { Map } from 'lucide-react';

export function MindMapView() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
      <Map className="w-16 h-16 mb-4 text-gray-600" />
      <p className="text-lg font-medium">Mind Map</p>
      <p className="text-sm mt-1">Visual knowledge mapping</p>
      <p className="text-xs mt-4 text-gray-500">Coming in Phase 4</p>
    </div>
  );
}
