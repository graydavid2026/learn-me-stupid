import { useState, useEffect } from 'react';
import { Plus, Check, Loader2 } from 'lucide-react';
import { useStore } from '../../stores/useStore';

export function QuickAddCard() {
  const { topics, cardSets, selectedTopicId, fetchCardSets, fetchTopics } = useStore();
  const createCard = useStore((s) => s.createCard);
  const [expanded, setExpanded] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [targetSetId, setTargetSetId] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Load card sets when topic is selected
  useEffect(() => {
    if (selectedTopicId) {
      fetchCardSets(selectedTopicId);
    }
  }, [selectedTopicId, fetchCardSets]);

  // Auto-select first set
  useEffect(() => {
    if (cardSets.length > 0 && !targetSetId) {
      setTargetSetId(cardSets[0].id);
    }
  }, [cardSets, targetSetId]);

  const handleSave = async () => {
    if (!front.trim() || !back.trim() || !targetSetId) return;
    setSaving(true);
    try {
      const result = await createCard(targetSetId, {
        front: { media_blocks: [{ block_type: 'text', text_content: front.trim() }] },
        back: { media_blocks: [{ block_type: 'text', text_content: back.trim() }] },
      });
      if (result) {
        setFront('');
        setBack('');
        setJustSaved(true);
        fetchTopics();
        setTimeout(() => setJustSaved(false), 2000);
      }
    } catch (err) {
      console.error('Quick add failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!selectedTopicId) {
    return (
      <button
        disabled
        className="w-full card p-3 flex items-center gap-3 opacity-50 cursor-not-allowed"
      >
        <Plus className="w-4 h-4 text-text-tertiary" />
        <span className="text-sm text-text-tertiary">Select a topic to quick-add cards</span>
      </button>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full card p-3 flex items-center gap-3 hover:border-accent/30 active:scale-[0.99] transition-all cursor-pointer"
      >
        <Plus className="w-4 h-4 text-accent" />
        <span className="text-sm text-text-primary font-medium">Quick Add Card</span>
        <span className="text-xs text-text-tertiary ml-auto">to {topics.find(t => t.id === selectedTopicId)?.name}</span>
      </button>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">Quick Add Card</span>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-text-tertiary hover:text-text-secondary"
        >
          Close
        </button>
      </div>

      {/* Set selector */}
      {cardSets.length > 1 && (
        <select
          value={targetSetId}
          onChange={(e) => setTargetSetId(e.target.value)}
          className="w-full bg-surface-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary mb-2 focus:border-accent/40 focus:outline-none"
        >
          {cardSets.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}

      <input
        type="text"
        value={front}
        onChange={(e) => setFront(e.target.value)}
        placeholder="Front (question / prompt)"
        className="w-full bg-surface-base border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-tertiary mb-2 focus:border-accent/40 focus:outline-none"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && front.trim() && back.trim()) handleSave();
        }}
      />
      <input
        type="text"
        value={back}
        onChange={(e) => setBack(e.target.value)}
        placeholder="Back (answer)"
        className="w-full bg-surface-base border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-tertiary mb-3 focus:border-accent/40 focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && front.trim() && back.trim()) handleSave();
        }}
      />

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !front.trim() || !back.trim() || !targetSetId}
          className="btn-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Card
        </button>
        {justSaved && (
          <span className="text-xs text-success flex items-center gap-1">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
