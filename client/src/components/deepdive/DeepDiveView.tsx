import { useState, useEffect, useRef } from 'react';
import {
  Lightbulb, AlertTriangle, Link2, MessageSquare, Send, Loader2,
  Check, ChevronRight, Brain, ArrowLeft, Layers,
} from 'lucide-react';
import { useStore, CardFull } from '../../stores/useStore';

// ─── Elaboration Prompts ───

interface ElaborationPrompt {
  id: string;
  label: string;
  icon: any;
  placeholder: string;
  colorBtn: string;
  colorActive: string;
}

const PROMPTS: ElaborationPrompt[] = [
  { id: 'example', label: 'Real-World Example', icon: Lightbulb, placeholder: 'Describe a real scenario where this applies...', colorBtn: 'text-yellow-400 hover:bg-yellow-500/10 border-yellow-500/20', colorActive: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 ring-1 ring-yellow-500/30' },
  { id: 'mistake', label: 'Common Mistake', icon: AlertTriangle, placeholder: 'What do people get wrong about this?', colorBtn: 'text-red-400 hover:bg-red-500/10 border-red-500/20', colorActive: 'bg-red-500/10 border-red-500/30 text-red-400 ring-1 ring-red-500/30' },
  { id: 'connection', label: 'Connects To...', icon: Link2, placeholder: 'How does this relate to other concepts you know?', colorBtn: 'text-blue-400 hover:bg-blue-500/10 border-blue-500/20', colorActive: 'bg-blue-500/10 border-blue-500/30 text-blue-400 ring-1 ring-blue-500/30' },
  { id: 'own-words', label: 'In My Own Words', icon: MessageSquare, placeholder: 'Explain this like you\'re teaching someone...', colorBtn: 'text-green-400 hover:bg-green-500/10 border-green-500/20', colorActive: 'bg-green-500/10 border-green-500/30 text-green-400 ring-1 ring-green-500/30' },
];

function getCardFrontText(card: CardFull): string {
  return card.front?.media_blocks?.find(b => b.block_type === 'text')?.text_content?.trim() || 'Untitled';
}

function getCardBackText(card: CardFull): string {
  return card.back?.media_blocks?.find(b => b.block_type === 'text')?.text_content?.trim() || '';
}

// Render **bold** as <strong>
function renderBold(text: string): (string | JSX.Element)[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Parse saved notes from a card's back blocks
function parseSavedNotes(card: CardFull): Record<string, string> {
  const notes: Record<string, string> = {};
  card.back.media_blocks.forEach(block => {
    if (block.block_type === 'text' && block.text_content) {
      for (const prompt of PROMPTS) {
        const prefix = `**${prompt.label}:** `;
        if (block.text_content.startsWith(prefix)) {
          notes[prompt.id] = block.text_content.slice(prefix.length);
        }
      }
    }
  });
  return notes;
}

// ─── Single Card Deep Dive ───

function CardDeepDive({ card, onBack, onNext, hasNext }: {
  card: CardFull;
  onBack: () => void;
  onNext: () => void;
  hasNext: boolean;
}) {
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>({});
  const [currentCard, setCurrentCard] = useState(card);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCurrentCard(card);
    setSavedNotes(parseSavedNotes(card));
    setActivePrompt(null);
    setInputValue('');
  }, [card.id]);

  useEffect(() => {
    if (activePrompt && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activePrompt]);

  const handleSave = async (promptId: string) => {
    if (!inputValue.trim()) return;
    setSaving(true);

    const prompt = PROMPTS.find(p => p.id === promptId)!;
    const noteText = `**${prompt.label}:** ${inputValue.trim()}`;

    const existingBlocks = currentCard.back.media_blocks
      .filter(b => !(b.block_type === 'text' && b.text_content?.startsWith(`**${prompt.label}:** `)))
      .map(b => ({
        block_type: b.block_type,
        text_content: b.text_content || null,
        file_path: b.file_path || null,
        file_name: b.file_name || null,
        file_size: b.file_size || null,
        mime_type: b.mime_type || null,
      }));

    const updatedBlocks = [
      ...existingBlocks,
      { block_type: 'text' as const, text_content: noteText, file_path: null, file_name: null, file_size: null, mime_type: null },
    ];

    try {
      const res = await fetch(`/api/cards/${currentCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: typeof currentCard.tags === 'string' ? JSON.parse(currentCard.tags || '[]') : currentCard.tags,
          front: {
            media_blocks: currentCard.front.media_blocks.map(b => ({
              block_type: b.block_type, text_content: b.text_content || null,
              file_path: b.file_path || null, file_name: b.file_name || null,
              file_size: b.file_size || null, mime_type: b.mime_type || null,
            })),
          },
          back: { media_blocks: updatedBlocks },
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setCurrentCard(updated);
        setSavedNotes(prev => ({ ...prev, [promptId]: inputValue.trim() }));
        setActivePrompt(null);
        setInputValue('');
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const filledCount = Object.keys(savedNotes).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to list
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{filledCount}/4 completed</span>
          <div className="flex gap-0.5">
            {PROMPTS.map(p => (
              <div key={p.id} className={`w-2 h-2 rounded-full ${savedNotes[p.id] ? 'bg-green-500' : 'bg-gray-600'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Card content */}
      <div className="card p-5 sm:p-6 mb-4">
        <div className="text-xs uppercase tracking-wider text-accent mb-2">Concept</div>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-3 whitespace-pre-wrap">
          {renderBold(getCardFrontText(currentCard))}
        </h2>
        <div className="border-t border-border pt-3">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Definition</div>
          <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {renderBold(getCardBackText(currentCard))}
          </div>
        </div>
      </div>

      {/* Elaboration prompts */}
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
        <Brain className="w-4 h-4" /> Deepen Your Understanding
      </div>

      <div className="space-y-2">
        {PROMPTS.map(prompt => {
          const Icon = prompt.icon;
          const hasSaved = !!savedNotes[prompt.id];
          const isActive = activePrompt === prompt.id;

          return (
            <div key={prompt.id} className="card overflow-hidden">
              <button
                onClick={() => {
                  if (isActive) {
                    setActivePrompt(null);
                    setInputValue('');
                  } else {
                    setActivePrompt(prompt.id);
                    setInputValue(savedNotes[prompt.id] || '');
                  }
                }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all min-h-[48px] border-b ${
                  isActive ? prompt.colorActive + ' border-current/20' :
                  hasSaved ? 'text-green-400 border-transparent' :
                  'text-gray-400 hover:text-gray-200 border-transparent'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="font-medium text-sm flex-1">{prompt.label}</span>
                {hasSaved && !isActive && <Check className="w-4 h-4 text-green-500" />}
                <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'rotate-90' : ''}`} />
              </button>

              {/* Saved note display */}
              {hasSaved && !isActive && (
                <div className="px-4 py-2.5 bg-surface-base/50 text-sm text-gray-400 whitespace-pre-wrap">
                  {savedNotes[prompt.id]}
                </div>
              )}

              {/* Active input */}
              {isActive && (
                <div className="p-4 bg-surface-base/50">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder={prompt.placeholder}
                    rows={3}
                    className="w-full bg-surface-dark border border-border rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:border-accent focus:outline-none resize-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSave(prompt.id);
                      }
                      if (e.key === 'Escape') {
                        setActivePrompt(null);
                        setInputValue('');
                      }
                    }}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-gray-500">Ctrl+Enter to save</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setActivePrompt(null); setInputValue(''); }}
                        className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 min-h-[36px]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(prompt.id)}
                        disabled={saving || !inputValue.trim()}
                        className="px-4 py-1.5 bg-accent/20 text-accent text-xs font-medium rounded-lg border border-accent/30 hover:bg-accent/30 disabled:opacity-40 flex items-center gap-1.5 min-h-[36px]"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Next card */}
      {hasNext && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onNext}
            className="btn-primary flex items-center gap-2 px-6 py-3"
          >
            Next Card <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Deep Dive View (replaces Memory Palace) ───

export function DeepDiveView() {
  const { selectedTopicId, topics, cardSets, fetchCardSets } = useStore();
  const selectedTopic = topics.find(t => t.id === selectedTopicId);

  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedTopicId) fetchCardSets(selectedTopicId);
    setSelectedSetId(null);
    setCards([]);
    setActiveCardIndex(null);
  }, [selectedTopicId]);

  const loadCards = async (setId: string) => {
    setLoading(true);
    setSelectedSetId(setId);
    try {
      const res = await fetch(`/api/sets/${setId}/cards`);
      const data: CardFull[] = await res.json();
      setCards(data);
      setActiveCardIndex(null);
    } catch (err) {
      console.error('Failed to load cards:', err);
    } finally {
      setLoading(false);
    }
  };

  // Card deep dive mode
  if (activeCardIndex !== null && cards[activeCardIndex]) {
    return (
      <div className="p-4 sm:p-6">
        <CardDeepDive
          card={cards[activeCardIndex]}
          onBack={() => setActiveCardIndex(null)}
          onNext={() => setActiveCardIndex(prev => Math.min((prev || 0) + 1, cards.length - 1))}
          hasNext={activeCardIndex < cards.length - 1}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <Brain className="w-12 h-12 mx-auto mb-3 text-accent" />
        <h2 className="text-2xl font-heading font-bold text-white">Deep Dive</h2>
        <p className="text-gray-400 mt-1">
          {selectedTopic ? `Go deeper on: ${selectedTopic.name}` : 'Select a topic to explore concepts'}
        </p>
      </div>

      {!selectedTopicId ? (
        <div className="card p-8 text-center">
          <p className="text-gray-400">Pick a topic from the dropdown above to get started.</p>
        </div>
      ) : selectedSetId && cards.length > 0 ? (
        /* Card list for selected set */
        <div>
          <button
            onClick={() => { setSelectedSetId(null); setCards([]); }}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to sets
          </button>

          <div className="space-y-1.5">
            {cards.map((card, idx) => {
              const front = getCardFrontText(card);
              const notes = parseSavedNotes(card);
              const filledCount = Object.keys(notes).length;

              return (
                <button
                  key={card.id}
                  onClick={() => setActiveCardIndex(idx)}
                  className="w-full text-left card px-4 py-3 flex items-center gap-3 hover:border-accent/30 transition-colors group"
                >
                  <span className="text-xs text-gray-500 font-mono w-6 text-right">{idx + 1}</span>
                  <span className="flex-1 text-sm text-gray-200 truncate">{renderBold(front)}</span>
                  {filledCount > 0 && (
                    <div className="flex gap-0.5 shrink-0">
                      {PROMPTS.map(p => (
                        <div key={p.id} className={`w-1.5 h-1.5 rounded-full ${notes[p.id] ? 'bg-green-500' : 'bg-gray-700'}`} />
                      ))}
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-accent transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Card set selection */
        <div className="space-y-2">
          {loading ? (
            <div className="card p-8 text-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : cardSets.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              No card sets in this topic yet.
            </div>
          ) : (
            cardSets.map(set => (
              <button
                key={set.id}
                onClick={() => loadCards(set.id)}
                className="w-full text-left card px-4 py-4 flex items-center gap-3 hover:border-accent/30 transition-colors group"
              >
                <Layers className="w-5 h-5 text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white text-sm">{set.name}</h3>
                  {set.description && <p className="text-xs text-gray-400 truncate mt-0.5">{set.description}</p>}
                </div>
                <span className="text-xs text-gray-500 font-mono shrink-0">{set.card_count} cards</span>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-accent transition-colors shrink-0" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
