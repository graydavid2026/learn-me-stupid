import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, FolderOpen, BookOpen, X, Hash } from 'lucide-react';
import { useStore } from '../../stores/useStore';
import { useNavigate } from 'react-router-dom';

interface SearchResults {
  topics: any[];
  sets: any[];
  cards: any[];
}

export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ topics: [], sets: [], cards: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { selectTopic, selectedTopicId } = useStore();
  const navigate = useNavigate();

  // Cmd+K to open
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults({ topics: [], sets: [], cards: [] });
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ topics: [], sets: [], cards: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (selectedTopicId) params.set('topic', selectedTopicId);
        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        setResults(data);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, selectedTopicId]);

  const allItems = [
    ...results.topics.map((t) => ({ type: 'topic' as const, data: t })),
    ...results.sets.map((s) => ({ type: 'set' as const, data: s })),
    ...results.cards.map((c) => ({ type: 'card' as const, data: c })),
  ];

  const handleSelect = useCallback((item: typeof allItems[0]) => {
    setOpen(false);
    if (item.type === 'topic') {
      selectTopic(item.data.id);
      navigate('/cards');
    } else if (item.type === 'set') {
      selectTopic(item.data.topic_id);
      navigate('/cards');
    } else if (item.type === 'card') {
      selectTopic(item.data.card_set_id ? null : null); // navigate to cards view
      navigate('/cards');
    }
  }, [selectTopic, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && allItems[selectedIndex]) {
      handleSelect(allItems[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-start justify-center pt-[15vh]">
      <div className="bg-surface border border-border rounded-modal w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search cards, sets, topics..."
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 outline-none text-sm"
          />
          <kbd className="text-[10px] text-gray-500 bg-surface-base border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && <div className="text-gray-500 text-sm text-center py-6">Searching...</div>}

          {!loading && query && allItems.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-8">No results found</div>
          )}

          {!loading && allItems.length > 0 && (
            <div className="p-2">
              {results.topics.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 px-2 py-1">Topics</p>
                  {results.topics.map((t, i) => {
                    const idx = allItems.findIndex((item) => item.type === 'topic' && item.data.id === t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelect({ type: 'topic', data: t })}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition-colors ${
                          idx === selectedIndex ? 'bg-accent/15 text-accent' : 'text-gray-300 hover:bg-surface-elevated'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <BookOpen className="w-4 h-4 text-gray-500 shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {results.sets.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 px-2 py-1">Card Sets</p>
                  {results.sets.map((s) => {
                    const idx = allItems.findIndex((item) => item.type === 'set' && item.data.id === s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSelect({ type: 'set', data: s })}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition-colors ${
                          idx === selectedIndex ? 'bg-accent/15 text-accent' : 'text-gray-300 hover:bg-surface-elevated'
                        }`}
                      >
                        <FolderOpen className="w-4 h-4 text-gray-500 shrink-0" />
                        <div className="truncate">
                          <span>{s.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{s.topic_name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {results.cards.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 px-2 py-1">Cards</p>
                  {results.cards.map((c) => {
                    const idx = allItems.findIndex((item) => item.type === 'card' && item.data.id === c.id);
                    const preview = c.match_text?.slice(0, 60) || 'Card';
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleSelect({ type: 'card', data: c })}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition-colors ${
                          idx === selectedIndex ? 'bg-accent/15 text-accent' : 'text-gray-300 hover:bg-surface-elevated'
                        }`}
                      >
                        <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                        <div className="truncate">
                          <span>{preview}</span>
                          <span className="text-xs text-gray-500 ml-2">{c.set_name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!query && (
            <div className="text-center py-8 text-gray-500 text-sm">
              <p>Type to search across all your cards</p>
              <p className="text-xs mt-1 text-gray-600">
                <kbd className="bg-surface-base border border-border rounded px-1">Ctrl</kbd>
                {' + '}
                <kbd className="bg-surface-base border border-border rounded px-1">K</kbd>
                {' to toggle'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
