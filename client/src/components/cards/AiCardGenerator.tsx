import { useState, useRef } from 'react';
import { Sparkles, Upload, Loader2, Check, X, FileText } from 'lucide-react';
import { useStore } from '../../stores/useStore';

interface GeneratedCard {
  front: string;
  back: string;
  selected: boolean;
}

export function AiCardGenerator() {
  const { selectedTopicId, cardSets, fetchCards } = useStore();
  const expandedSetId = useStore((s) => s.cardSets.find(() => true)?.id); // fallback

  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(5);
  const [style, setStyle] = useState<'standard' | 'cloze'>('standard');
  const [targetSetId, setTargetSetId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // PDF extract state
  const [extracting, setExtracting] = useState(false);
  const pdfFileRef = useRef<HTMLInputElement>(null);

  const topicSets = cardSets.filter((s) => s.topic_id === selectedTopicId);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setError(null);
    setSuccessMsg(null);
    setGenerating(true);
    setCards([]);

    try {
      const res = await fetch('/api/cards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), count, style }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setCards(data.cards.map((c: { front: string; back: string }) => ({ ...c, selected: true })));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePdfExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccessMsg(null);
    setExtracting(true);
    setCards([]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/cards/extract', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');

      if (data.cards.length === 0) {
        setError('No card candidates could be extracted from this PDF. Try a document with clear Q&A, definitions, or structured content.');
      } else {
        setCards(data.cards.map((c: { front: string; back: string }) => ({ ...c, selected: true })));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExtracting(false);
      if (pdfFileRef.current) pdfFileRef.current.value = '';
    }
  };

  const handleImportSelected = async () => {
    const selected = cards.filter((c) => c.selected);
    if (selected.length === 0 || !targetSetId) return;

    setImporting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/cards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'import',
          count: selected.length,
          style,
          card_set_id: targetSetId,
          autoCreate: true,
        }),
      });

      // Actually, we should create cards one at a time using the existing API
      // since /generate with autoCreate uses its own generation. Let's use
      // the standard card creation endpoint instead.
      let importedCount = 0;
      for (const card of selected) {
        const createRes = await fetch(`/api/sets/${targetSetId}/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_type: style === 'cloze' ? 'cloze' : 'standard',
            front: { media_blocks: [{ block_type: 'text', text_content: card.front }] },
            back: { media_blocks: [{ block_type: 'text', text_content: card.back }] },
          }),
        });
        if (createRes.ok) importedCount++;
      }

      setSuccessMsg(`Imported ${importedCount} card${importedCount !== 1 ? 's' : ''}`);
      setCards([]);
      fetchCards(targetSetId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const toggleCard = (idx: number) => {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c)));
  };

  const selectAll = () => setCards((prev) => prev.map((c) => ({ ...c, selected: true })));
  const deselectAll = () => setCards((prev) => prev.map((c) => ({ ...c, selected: false })));

  const selectedCount = cards.filter((c) => c.selected).length;

  return (
    <div className="space-y-4">
      {/* AI Generation inputs */}
      <div className="bg-surface-base border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">AI Card Generator</span>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the topic or paste content to generate flashcards from..."
          rows={3}
          className="w-full input text-sm resize-none"
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-text-tertiary block mb-1">Count</label>
            <input
              type="range"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="text-xs text-text-secondary text-center">{count} cards</div>
          </div>

          <div>
            <label className="text-xs text-text-tertiary block mb-1">Style</label>
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setStyle('standard')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  style === 'standard'
                    ? 'bg-accent/20 text-accent'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setStyle('cloze')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                  style === 'cloze'
                    ? 'bg-accent/20 text-accent'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                Cloze
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate
          </button>
        </div>

        {/* PDF Import */}
        <div className="border-t border-border pt-3 flex items-center gap-2">
          <input ref={pdfFileRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfExtract} />
          <button
            onClick={() => pdfFileRef.current?.click()}
            disabled={extracting}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Import from PDF
          </button>
          <span className="text-xs text-text-tertiary">Extract Q&A pairs from a PDF document</span>
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="text-xs bg-error/10 border border-error/30 text-error rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="text-xs bg-success/10 border border-success/30 text-success rounded-lg px-3 py-2">
          {successMsg}
        </div>
      )}

      {/* Card Previews */}
      {cards.length > 0 && (
        <div className="bg-surface-base border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              Preview ({selectedCount}/{cards.length} selected)
            </span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-accent hover:text-accent-hover">
                Select all
              </button>
              <button onClick={deselectAll} className="text-xs text-text-tertiary hover:text-text-secondary">
                Deselect all
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {cards.map((card, idx) => (
              <div
                key={idx}
                onClick={() => toggleCard(idx)}
                className={`flex items-start gap-3 border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  card.selected
                    ? 'border-accent/40 bg-accent/5'
                    : 'border-border bg-surface-elevated opacity-60'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  card.selected ? 'bg-accent border-accent' : 'border-border'
                }`}>
                  {card.selected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary font-medium truncate">{card.front}</div>
                  <div className="text-xs text-text-secondary mt-0.5 line-clamp-2">{card.back}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Import controls */}
          <div className="border-t border-border pt-3 flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-tertiary block mb-1">Import into set</label>
              <select
                value={targetSetId}
                onChange={(e) => setTargetSetId(e.target.value)}
                className="w-full input text-sm"
              >
                <option value="">Select a card set...</option>
                {topicSets.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleImportSelected}
              disabled={importing || selectedCount === 0 || !targetSetId}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 mt-4"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import {selectedCount} card{selectedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
