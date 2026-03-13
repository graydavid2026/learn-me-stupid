import { GraduationCap } from 'lucide-react';
import { useStore } from '../../stores/useStore';

export function StudyView() {
  const selectedTopicId = useStore((s) => s.selectedTopicId);
  const topics = useStore((s) => s.topics);
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
      <GraduationCap className="w-16 h-16 mb-4 text-gray-600" />
      <p className="text-lg font-medium">Study Session</p>
      <p className="text-sm mt-1">
        {selectedTopic
          ? `Ready to study ${selectedTopic.name}`
          : 'Select a topic to start studying'}
      </p>
      <p className="text-xs mt-4 text-gray-500">Coming in Phase 3</p>
    </div>
  );
}
