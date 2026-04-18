import { useState, useEffect } from 'react';
import { Maximize2, Check, Lightbulb, AlertTriangle, Link2, MessageSquare, Send, Loader2 } from 'lucide-react';
import { CardFull, MediaBlock, CardSideFull } from '../../stores/useStore';
import { ImageLightbox, HotspotImage, parseHotspotData } from './ImageViewer';

export const SLOT_COLORS: Record<number, string> = {
  0: '#6b7280', 1: '#c75a5a', 2: '#c97a3b', 3: '#c9943b',
  4: '#b8a44a', 5: '#8aab5a', 6: '#6aab6a', 7: '#3d9a6e',
  8: '#3a8a7a', 9: '#3a8a8a', 10: '#4a8aaa', 11: '#5b8a9a',
  12: '#7a7aaa', 13: '#8a6a9a',
};

export const SLOT_LABELS: Record<number, string> = {
  0: 'New', 1: '10m', 2: '1h', 3: '4h', 4: '1d', 5: '3d', 6: '1w',
  7: '2w', 8: '1mo', 9: '2mo', 10: '4mo', 11: '8mo', 12: '1yr', 13: '2yr',
};

export function SlotDots({ slot }: { slot: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 13 }, (_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full transition-colors"
          style={{ backgroundColor: i < slot ? SLOT_COLORS[slot] : '#232638' }}
        />
      ))}
      <span className="text-xs text-text-secondary ml-1 font-mono">{SLOT_LABELS[slot]} ({slot}/13)</span>
    </div>
  );
}

// Strip parenthetical annotations and "Pronunciation: ..." lines from card
// display text so we never show them even before the DB migration runs.
export function cleanDisplayText(raw: string): string {
  return raw
    .split(/\r?\n/)
    .filter((line) => !/^\s*pronunciation\s*:/i.test(line))
    .join('\n')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

// Render markdown-style bold (**text**) as <strong> elements
export function renderMarkdownBold(text: string): (string | JSX.Element)[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ─── Cloze deletion helpers ───
export function parseClozeText(raw: string): { segments: Array<{ type: 'text' | 'cloze'; content: string; group: number }>; hasCloze: boolean } {
  const segments: Array<{ type: 'text' | 'cloze'; content: string; group: number }> = [];
  const regex = /\{\{c(\d+)::([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;
  let hasCloze = false;
  while ((match = regex.exec(raw)) !== null) {
    hasCloze = true;
    if (match.index > lastIndex) segments.push({ type: 'text', content: raw.slice(lastIndex, match.index), group: 0 });
    segments.push({ type: 'cloze', content: match[2], group: parseInt(match[1], 10) });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < raw.length) segments.push({ type: 'text', content: raw.slice(lastIndex), group: 0 });
  return { segments, hasCloze };
}

export function ClozeText({ text, revealed }: { text: string; revealed: boolean }) {
  const { segments, hasCloze } = parseClozeText(text);
  if (!hasCloze) return <span className="whitespace-pre-wrap">{cleanDisplayText(text)}</span>;
  return (
    <span className="whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <span key={i}>{cleanDisplayText(seg.content)}</span>;
        if (revealed) return <span key={i} className="font-bold text-accent underline decoration-accent/40">{seg.content}</span>;
        return <span key={i} className="inline-block min-w-[3em] border-b-2 border-accent/50 text-accent/60 text-center mx-0.5">[...]</span>;
      })}
    </span>
  );
}

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [showLightbox, setShowLightbox] = useState(false);
  return (
    <>
      <div className="relative cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowLightbox(true); }}>
        <img src={src} alt={alt} className="max-h-[40vh] sm:max-h-[50vh] w-auto max-w-full rounded-lg mx-auto object-contain" />
        <div className="absolute top-2 right-2 bg-black/50 rounded-lg px-2 py-1 flex items-center gap-1 pointer-events-none">
          <Maximize2 className="w-3.5 h-3.5 text-white/70" />
          <span className="text-[11px] text-white/70">Tap to zoom</span>
        </div>
      </div>
      {showLightbox && <ImageLightbox src={src} alt={alt} onClose={() => setShowLightbox(false)} />}
    </>
  );
}

export function MediaBlockRenderer({ block, hasImage }: { block: MediaBlock; hasImage?: boolean }) {
  switch (block.block_type) {
    case 'text': {
      const text = cleanDisplayText(block.text_content || '');
      const textClass = hasImage
        ? 'text-[13px] sm:text-sm leading-snug'
        : text.length > 400
          ? 'text-[13px] sm:text-sm leading-snug'
          : text.length > 200
            ? 'text-sm sm:text-base leading-snug'
            : 'text-base sm:text-lg leading-relaxed';
      const hasMarkdown = text.includes('**');
      return (
        <div className="w-full">
          <div className={`${textClass} text-text-primary whitespace-pre-wrap break-words`}>
            {hasMarkdown ? renderMarkdownBold(text) : text}
          </div>
        </div>
      );
    }
    case 'image':
      return block.file_path ? (
        <ZoomableImage src={`/uploads/${block.file_path}`} alt={block.file_name || ''} />
      ) : null;
    case 'hotspot': {
      const hotspotData = block.text_content ? parseHotspotData(block.text_content) : null;
      return hotspotData ? (
        <HotspotImage imageSrc={hotspotData.image} spots={hotspotData.spots} title={hotspotData.title} />
      ) : null;
    }
    case 'audio':
      return block.file_path ? (
        <audio controls src={`/uploads/${block.file_path}`} className="w-full mx-auto" />
      ) : null;
    case 'video':
      return block.file_path ? (
        <video controls src={`/uploads/${block.file_path}`} className="max-h-[40vh] sm:max-h-[50vh] w-auto max-w-full rounded-lg mx-auto" playsInline />
      ) : null;
    case 'youtube':
      return block.youtube_embed_id ? (
        <div className="aspect-video w-full max-h-[40vh] sm:max-h-[50vh] mx-auto rounded-lg overflow-hidden">
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

// ─── TTS helpers ───

export function extractSideSegments(side: CardSideFull): string[] {
  const out: string[] = [];
  for (const b of side.media_blocks) {
    if (b.block_type !== 'text' || !b.text_content) continue;
    let t = b.text_content.replace(/\*\*/g, '');
    t = t
      .split(/\r?\n/)
      .filter((line) => !/^\s*pronunciation\s*:/i.test(line))
      .join('\n');
    t = t.replace(/\s*\([^)]*\)/g, '');
    for (const line of t.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}

function detectLang(s: string): 'ru-RU' | 'en-US' {
  return /[\u0400-\u04FF]/.test(s) ? 'ru-RU' : 'en-US';
}

function buildUtterancePlan(segments: string[]): Array<{ lang: 'ru-RU' | 'en-US'; text: string }> {
  const plan: Array<{ lang: 'ru-RU' | 'en-US'; text: string }> = [];
  for (const seg of segments) {
    const parts = seg
      .split(/\s+—\s+|\s+–\s+|\s+-\s+/)
      .map((p) => p.replace(/^["""']+|["""']+$/g, '').trim())
      .filter(Boolean);
    for (const part of parts) {
      plan.push({ lang: detectLang(part), text: part });
    }
  }
  return plan;
}

function chunkForSpeech(text: string, maxLen = 180): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];
  const parts = cleaned.split(/(?<=[.!?…,])\s+/);
  const chunks: string[] = [];
  let buf = '';
  for (const p of parts) {
    if ((buf + ' ' + p).trim().length > maxLen) {
      if (buf) chunks.push(buf.trim());
      buf = p;
    } else {
      buf = (buf + ' ' + p).trim();
    }
  }
  if (buf) chunks.push(buf.trim());
  return chunks;
}

let pendingTtsTimer: ReturnType<typeof setTimeout> | null = null;
export function cancelSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (pendingTtsTimer) {
    clearTimeout(pendingTtsTimer);
    pendingTtsTimer = null;
  }
}

export function speakCard(segments: string[], pauseAfterFirstMs = 2000) {
  cancelSpeech();
  if (!window.speechSynthesis || segments.length === 0) return;
  const plan = buildUtterancePlan(segments);
  if (plan.length === 0) return;

  let entryIndex = 0;
  const speakEntry = () => {
    if (entryIndex >= plan.length) return;
    const entry = plan[entryIndex++];
    const chunks = chunkForSpeech(entry.text);
    let chunkIdx = 0;
    const speakNextChunk = () => {
      if (chunkIdx >= chunks.length) {
        if (entryIndex === 1 && plan.length > 1) {
          pendingTtsTimer = setTimeout(speakEntry, pauseAfterFirstMs);
        } else {
          speakEntry();
        }
        return;
      }
      const utter = new SpeechSynthesisUtterance(chunks[chunkIdx++]);
      utter.lang = entry.lang;
      utter.rate = 0.9;
      utter.pitch = 1;
      utter.onend = speakNextChunk;
      utter.onerror = speakNextChunk;
      window.speechSynthesis.speak(utter);
    };
    speakNextChunk();
  };
  speakEntry();
}

// ─── Elaboration Panel ───

interface ElaborationPrompt {
  id: string;
  label: string;
  icon: any;
  placeholder: string;
  color: string;
}

const ELABORATION_PROMPTS: ElaborationPrompt[] = [
  { id: 'example', label: 'Real-World Example', icon: Lightbulb, placeholder: 'Describe a real scenario where this applies...', color: 'text-accent bg-accent/10 border-accent/25' },
  { id: 'mistake', label: 'Common Mistake', icon: AlertTriangle, placeholder: 'What do people get wrong about this?', color: 'text-error bg-error/10 border-error/25' },
  { id: 'connection', label: 'Connects To...', icon: Link2, placeholder: 'How does this relate to other concepts you know?', color: 'text-secondary bg-secondary/10 border-secondary/25' },
  { id: 'own-words', label: 'In My Own Words', icon: MessageSquare, placeholder: 'Explain this like you\'re teaching someone...', color: 'text-success bg-success/10 border-success/25' },
];

export function ElaborationPanel({ card, onCardUpdated }: { card: CardFull; onCardUpdated: (card: CardFull) => void }) {
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const notes: Record<string, string> = {};
    card.back.media_blocks.forEach(block => {
      if (block.block_type === 'text' && block.text_content) {
        for (const prompt of ELABORATION_PROMPTS) {
          const prefix = `**${prompt.label}:** `;
          if (block.text_content.startsWith(prefix)) {
            notes[prompt.id] = block.text_content.slice(prefix.length);
          }
        }
      }
    });
    setSavedNotes(notes);
  }, [card.id]);

  const handleSave = async (promptId: string) => {
    if (!inputValue.trim()) return;
    setSaving(true);

    const prompt = ELABORATION_PROMPTS.find(p => p.id === promptId)!;
    const noteText = `**${prompt.label}:** ${inputValue.trim()}`;

    const existingBlocks = card.back.media_blocks
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
      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: typeof card.tags === 'string' ? JSON.parse(card.tags || '[]') : card.tags,
          front: {
            media_blocks: card.front.media_blocks.map(b => ({
              block_type: b.block_type,
              text_content: b.text_content || null,
              file_path: b.file_path || null,
              file_name: b.file_name || null,
              file_size: b.file_size || null,
              mime_type: b.mime_type || null,
            })),
          },
          back: { media_blocks: updatedBlocks },
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSavedNotes(prev => ({ ...prev, [promptId]: inputValue.trim() }));
        setActivePrompt(null);
        setInputValue('');
        onCardUpdated(updated);
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-border mt-2 pt-2" onClick={e => e.stopPropagation()}>
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5 text-center">Deepen Your Understanding</div>
      <div className="grid grid-cols-2 gap-1.5">
        {ELABORATION_PROMPTS.map(prompt => {
          const Icon = prompt.icon;
          const hasSaved = !!savedNotes[prompt.id];
          const isActive = activePrompt === prompt.id;

          return (
            <div key={prompt.id}>
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
                className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 min-h-[40px] ${
                  hasSaved
                    ? 'bg-success/10 border-success/25 text-success'
                    : isActive
                      ? prompt.color + ' ring-1 ring-current'
                      : 'bg-surface-base border-border text-text-secondary hover:text-text-primary hover:border-border'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{prompt.label}</span>
                {hasSaved && <Check className="w-3 h-3 ml-auto shrink-0" />}
              </button>

              {isActive && (
                <div className="mt-1.5 mb-1">
                  <textarea
                    autoFocus
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder={prompt.placeholder}
                    rows={2}
                    className="w-full bg-surface-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-accent/40 focus:ring-1 focus:ring-accent/30 focus:outline-none resize-none transition-all"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSave(prompt.id);
                      }
                      if (e.key === 'Escape') {
                        setActivePrompt(null);
                        setInputValue('');
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button
                      onClick={() => { setActivePrompt(null); setInputValue(''); }}
                      className="px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(prompt.id)}
                      disabled={saving || !inputValue.trim()}
                      className="px-3 py-1 bg-accent/15 text-accent text-xs font-medium rounded-lg border border-accent/25 hover:bg-accent/25 disabled:opacity-40 flex items-center gap-1.5 min-h-[32px] transition-all"
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SR Status Badge ───

export function SrBadge({ card }: { card: CardFull }) {
  const slot = card.sr_slot;
  const dueAt = card.sr_next_due_at;
  const graceDeadline = card.sr_grace_deadline;
  const now = Date.now();
  const isDue = dueAt ? now >= new Date(dueAt).getTime() : slot === 0;
  const isOverdue = graceDeadline ? now > new Date(graceDeadline).getTime() : false;

  const badgeColor = isOverdue ? 'border-error/30 bg-error/8' : isDue ? 'border-warning/30 bg-warning/8' : 'border-border bg-surface-base/50';
  const textColor = isOverdue ? 'text-error' : isDue ? 'text-warning' : 'text-text-tertiary';

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className={`rounded-lg border px-2.5 py-1.5 text-right ${badgeColor}`}>
      <div className={`text-[10px] font-mono leading-tight ${textColor}`}>
        {dueAt ? `Due: ${fmtDate(dueAt)}` : 'New card'}
      </div>
      <div className="text-[10px] text-text-tertiary leading-tight">
        Slot {slot}/13
      </div>
      {graceDeadline && (
        <div className="text-[10px] text-text-tertiary/70 leading-tight">
          Grace: {fmtDate(graceDeadline)}
        </div>
      )}
    </div>
  );
}

// ─── Typing answer helpers (exported for TypingAnswer component) ───

export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function levenshteinDist(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function isCloseEnough(typed: string, expected: string): boolean {
  const a = normalizeAnswer(typed), b = normalizeAnswer(expected);
  if (a === b) return true;
  if (b.length > 5 && levenshteinDist(a, b) <= 2) return true;
  return false;
}

export function getExpectedAnswer(card: CardFull): string {
  for (const block of card.back.media_blocks) {
    if (block.block_type === 'text' && block.text_content) return cleanDisplayText(block.text_content).split('\n')[0].trim();
  }
  return '';
}
