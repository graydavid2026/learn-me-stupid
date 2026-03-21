import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, RotateCcw, Check, X, ChevronRight, Play, Filter, Zap, Clock, Target } from 'lucide-react';
import { useStore, CardFull, MediaBlock } from '../../stores/useStore';

const TIER_COLORS: Record<number, string> = {
  0: '#ef4444', 1: '#f97316', 2: '#f59e0b', 3: '#eab308',
  4: '#84cc16', 5: '#22c55e', 6: '#14b8a6', 7: '#06b6d4', 8: '#22c55e',
};

const TIER_LABELS: Record<number, string> = {
  0: 'New', 1: '4h', 2: '1d', 3: '2d', 4: '1w', 5: '2w', 6: '1mo', 7: '3mo', 8: '6mo',
};

function TierDots({ tier }: { tier: number }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full transition-colors"
          style={{ backgroundColor: i <= tier ? TIER_COLORS[tier] : '#2e3348' }}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1 font-mono">{TIER_LABELS[tier]}</span>
    </div>
  );
}

function MediaBlockRenderer({ block }: { block: MediaBlock }) {
  switch (block.block_type) {
    case 'text':
      return (
        <div className="text-lg text-gray-100 leading-relaxed whitespace-pre-wrap">
          {block.text_content}
        </div>
      );
    case 'image':
      return block.file_path ? (
        <img src={`/uploads/${block.file_path}`} alt={block.file_name || ''} className="max-h-64 rounded-lg mx-auto" />
      ) : null;
    case 'audio':
      return block.file_path ? (
        <audio controls src={`/uploads/${block.file_path}`} className="w-full max-w-md mx-auto" />
      ) : null;
    case 'video':
      return block.file_path ? (
        <video controls src={`/uploads/${block.file_path}`} className="max-h-64 rounded-lg mx-auto" />
      ) : null;
    case 'youtube':
      return block.youtube_embed_id ? (
        <div className="aspect-video max-w-lg mx-auto rounded-lg overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${block.youtube_embed_id}`}
            className="w-full h-full"
            allowFullScreen
            loading="lazy"
            title="YouTube video"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
      ) : null;
    default:
      return null;
  }
}

type StudyMode = 'due' | 'pipeline' | 'focus' | 'all';

interface SessionStats {
  total: number;
  reviewed: number;
  correct: number;
  wrong: number;
  tierChanges: { cardId: string; from: number; to: number }[];
}

export function StudyView() {
  const { selectedTopicId, topics, cardSets, fetchTopics } = useStore();
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  // Session state
  const [mode, setMode] = useState<StudyMode>('due');
  const [queue, setQueue] = useState<CardFull[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ total: 0, reviewed: 0, correct: 0, wrong: 0, tierChanges: [] });
  const [filterSetId, setFilterSetId] = useState<string>('');
  const startTime = useRef<number>(0);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!sessionActive || sessionComplete) return;
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (!flipped) setFlipped(true);
      }
      if (flipped) {
        if (e.key === '1') handleGrade('wrong');
        if (e.key === '2') handleGrade('correct');
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sessionActive, sessionComplete, flipped, currentIndex, queue]);

  const runDecayCheck = async () => {
    try {
      await fetch('/api/study/decay-check', { method: 'POST' });
    } catch (err) {
      console.error('Decay check failed:', err);
    }
  };

  const startSession = async () => {
    setLoading(true);
    await runDecayCheck();

    let url = '/api/study/due?';
    if (mode === 'pipeline') url = '/api/study/pipeline?limit=20&';

    const params = new URLSearchParams();
    if (selectedTopicId) params.set('topic', selectedTopicId);
    if (filterSetId) params.set('set', filterSetId);

    try {
      const res = await fetch(url + params.toString());
      const cards: CardFull[] = await res.json();

      if (mode === 'all' && selectedTopicId) {
        // Fetch both due and pipeline
        const res2 = await fetch('/api/study/pipeline?' + params.toString() + '&limit=50');
        const pipeline: CardFull[] = await res2.json();
        const allIds = new Set(cards.map(c => c.id));
        for (const c of pipeline) {
          if (!allIds.has(c.id)) cards.push(c);
        }
      }

      setQueue(cards);
      setCurrentIndex(0);
      setFlipped(false);
      setSessionActive(true);
      setSessionComplete(false);
      setStats({ total: cards.length, reviewed: 0, correct: 0, wrong: 0, tierChanges: [] });
      startTime.current = Date.now();
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = useCallback(async (result: 'correct' | 'wrong') => {
    const card = queue[currentIndex];
    if (!card) return;

    const responseTime = Date.now() - startTime.current;

    try {
      const res = await fetch('/api/study/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, result, response_time_ms: responseTime }),
      });

      if (res.ok) {
        const data = await res.json();
        setStats((prev) => ({
          ...prev,
          reviewed: prev.reviewed + 1,
          correct: prev.correct + (result === 'correct' ? 1 : 0),
          wrong: prev.wrong + (result === 'wrong' ? 1 : 0),
          tierChanges: data.tierBefore !== data.tierAfter
            ? [...prev.tierChanges, { cardId: card.id, from: data.tierBefore, to: data.tierAfter }]
            : prev.tierChanges,
        }));

        // Update card in queue with new data
        const updatedQueue = [...queue];
        updatedQueue[currentIndex] = data.card;
        setQueue(updatedQueue);
      }
    } catch (err) {
      console.error('Review failed:', err);
    }

    // Move to next card
    if (currentIndex + 1 >= queue.length) {
      setSessionComplete(true);
      fetchTopics(); // refresh counts
    } else {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
      startTime.current = Date.now();
    }
  }, [currentIndex, queue, fetchTopics]);

  const currentCard = queue[currentIndex];

  // --- SESSION COMPLETE SCREEN ---
  if (sessionComplete) {
    const accuracy = stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0;
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="card p-8">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-accent" />
          <h2 className="text-2xl font-heading font-bold text-white mb-2">Session Complete!</h2>
          <p className="text-gray-400 mb-6">Great work on your study session.</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-surface-base rounded-lg p-3">
              <p className="text-2xl font-bold font-mono text-white">{stats.reviewed}</p>
              <p className="text-xs text-gray-500">Reviewed</p>
            </div>
            <div className="bg-surface-base rounded-lg p-3">
              <p className="text-2xl font-bold font-mono text-green-400">{stats.correct}</p>
              <p className="text-xs text-gray-500">Correct</p>
            </div>
            <div className="bg-surface-base rounded-lg p-3">
              <p className="text-2xl font-bold font-mono text-red-400">{stats.wrong}</p>
              <p className="text-xs text-gray-500">Wrong</p>
            </div>
          </div>

          <div className="bg-surface-base rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Accuracy</span>
              <span className="text-lg font-mono font-bold" style={{ color: accuracy >= 80 ? '#22c55e' : accuracy >= 50 ? '#f59e0b' : '#ef4444' }}>
                {accuracy}%
              </span>
            </div>
            <div className="w-full bg-surface rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${accuracy}%`, backgroundColor: accuracy >= 80 ? '#22c55e' : accuracy >= 50 ? '#f59e0b' : '#ef4444' }}
              />
            </div>
          </div>

          {stats.tierChanges.length > 0 && (
            <div className="text-left mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Tier Changes</h3>
              <div className="space-y-1">
                {stats.tierChanges.map((tc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-mono" style={{ color: TIER_COLORS[tc.from] }}>{TIER_LABELS[tc.from]}</span>
                    <ChevronRight className="w-3 h-3 text-gray-500" />
                    <span className="font-mono" style={{ color: TIER_COLORS[tc.to] }}>{TIER_LABELS[tc.to]}</span>
                    {tc.to > tc.from ? (
                      <span className="text-green-400 text-xs">promoted</span>
                    ) : (
                      <span className="text-red-400 text-xs">demoted</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={() => { setSessionActive(false); setSessionComplete(false); }} className="btn-secondary">
              Back to Menu
            </button>
            <button onClick={startSession} className="btn-primary flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Study Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ACTIVE SESSION ---
  if (sessionActive && currentCard) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {selectedTopic?.name || 'All Topics'}
            </span>
            <span className="text-xs text-gray-600">|</span>
            <span className="text-sm font-mono text-gray-400">
              {currentIndex + 1}/{queue.length}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-green-400 font-mono">{stats.correct} ✓</span>
            <span className="text-sm text-red-400 font-mono">{stats.wrong} ✗</span>
            <button
              onClick={() => { setSessionActive(false); setSessionComplete(false); }}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              End Session
            </button>
          </div>
        </div>

        {/* Progress track */}
        <div className="w-full bg-surface rounded-full h-1.5 mb-6">
          <div
            className="h-1.5 rounded-full bg-accent transition-all duration-300"
            style={{ width: `${((currentIndex) / queue.length) * 100}%` }}
          />
        </div>

        {/* Card */}
        <div className="card p-8 min-h-[300px] flex flex-col">
          {/* Card meta */}
          <div className="flex items-center justify-between mb-6">
            <TierDots tier={currentCard.sr_tier} />
            <div className="flex gap-1">
              {(JSON.parse(currentCard.tags || '[]') as string[]).map((tag) => (
                <span key={tag} className="text-xs bg-accent/10 text-accent/70 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Card content */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 overflow-hidden">
            <AnimatePresence mode="wait">
              {!flipped ? (
                <motion.div
                  key="front"
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full text-center space-y-4"
                >
                  <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Front</div>
                  {currentCard.front.media_blocks.map((block) => (
                    <MediaBlockRenderer key={block.id} block={block} />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="back"
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full text-center space-y-4"
                >
                  <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Answer</div>
                  {currentCard.back.media_blocks.map((block) => (
                    <MediaBlockRenderer key={block.id} block={block} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="border-t border-border mt-6 pt-4">
            {!flipped ? (
              <button
                onClick={() => setFlipped(true)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Show Answer
                <span className="text-xs opacity-60">[Space]</span>
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => handleGrade('wrong')}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Wrong
                  <span className="text-xs opacity-60">[1]</span>
                </button>
                <button
                  onClick={() => handleGrade('correct')}
                  className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Correct
                  <span className="text-xs opacity-60">[2]</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Space = flip • 1 = wrong • 2 = correct
        </p>
      </div>
    );
  }

  // --- SESSION LAUNCHER ---
  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <GraduationCap className="w-12 h-12 mx-auto mb-3 text-accent" />
        <h2 className="text-2xl font-heading font-bold text-white">
          Study Session
        </h2>
        <p className="text-gray-400 mt-1">
          {selectedTopic ? `Studying: ${selectedTopic.name}` : 'Select a topic above to filter, or study all'}
        </p>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { id: 'due' as StudyMode, label: 'Review Due', desc: 'Cards ready for review', icon: Clock },
          { id: 'pipeline' as StudyMode, label: 'Ahead of Schedule', desc: 'Study upcoming cards early', icon: Zap },
          { id: 'focus' as StudyMode, label: 'Focus Set', desc: 'Study a specific card set', icon: Target },
          { id: 'all' as StudyMode, label: 'All Cards', desc: 'Due + upcoming combined', icon: Play },
        ].map(({ id, label, desc, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`card text-left p-4 transition-colors ${
              mode === id ? 'border-accent bg-accent/5' : 'hover:border-accent/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-accent" />
              <span className="font-medium text-white text-sm">{label}</span>
            </div>
            <p className="text-xs text-gray-500">{desc}</p>
          </button>
        ))}
      </div>

      {/* Filter by set (for focus mode) */}
      {(mode === 'focus' || mode === 'all') && selectedTopicId && cardSets.length > 0 && (
        <div className="mb-6">
          <label className="text-sm text-gray-400 mb-2 block">Card Set</label>
          <select
            value={filterSetId}
            onChange={(e) => setFilterSetId(e.target.value)}
            className="input w-full"
          >
            <option value="">All Sets</option>
            {cardSets.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.card_count} cards)</option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={startSession}
        disabled={loading}
        className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2"
      >
        {loading ? (
          'Loading...'
        ) : (
          <>
            <Play className="w-5 h-5" />
            Start Studying
          </>
        )}
      </button>
    </div>
  );
}
