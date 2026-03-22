import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useStore } from '../../stores/useStore';

export function TopicDropdown() {
  const { topics, selectedTopicId, selectTopic, createTopic, deleteTopic } = useStore();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = () => {
    if (newName.trim()) {
      const name = newName.trim();
      setNewName('');
      setCreating(false);
      setOpen(false);
      createTopic({ name }); // fire and forget — topics list updates via fetchTopics
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border hover:border-accent/50 transition-colors min-w-[180px]"
      >
        {selectedTopic ? (
          <>
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedTopic.color }}
            />
            <span className="text-sm font-medium text-gray-200 truncate">
              {selectedTopic.name}
            </span>
            {selectedTopic.due_count > 0 && (
              <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-mono">
                {selectedTopic.due_count}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-gray-400">All Topics</span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-500 ml-auto shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-surface-elevated border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-1">
            <button
              onClick={() => { selectTopic(null); setOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                !selectedTopicId ? 'bg-accent/15 text-accent' : 'text-gray-300 hover:bg-surface'
              }`}
            >
              All Topics
            </button>

            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => { selectTopic(topic.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors group ${
                  selectedTopicId === topic.id ? 'bg-accent/15 text-accent' : 'text-gray-300 hover:bg-surface'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: topic.color }}
                />
                <span className="truncate flex-1">{topic.name}</span>
                <span className="text-xs text-gray-500 font-mono">{topic.card_count}</span>
                {topic.due_count > 0 && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-mono">
                    {topic.due_count}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${topic.name}" and all its cards?`)) {
                      deleteTopic(topic.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>
            ))}
          </div>

          <div className="border-t border-border p-1">
            {creating ? (
              <div className="flex items-center gap-1 px-2 py-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                  }}
                  placeholder="Topic name..."
                  className="flex-1 input text-sm py-1"
                />
                <button onClick={handleCreate} className="p-1 text-green-400 hover:text-green-300">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setCreating(false); setNewName(''); }} className="p-1 text-gray-400 hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-400 hover:text-gray-200 hover:bg-surface flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Topic
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
