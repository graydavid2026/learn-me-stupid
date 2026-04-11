import { useState, useEffect, useCallback, useRef } from 'react';
import { GraduationCap, RotateCcw, Check, X, ChevronRight, Play, Filter, Zap, Clock, Target, ArrowLeft, Mic, Maximize2, Lightbulb, MessageSquare, Link2, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { useStore, CardFull, MediaBlock, CardSideFull } from '../../stores/useStore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ImageLightbox, HotspotImage, parseHotspotData } from './ImageViewer';

const SLOT_COLORS: Record<number, string> = {
  0: '#6b7280', 1: '#ef4444', 2: '#f97316', 3: '#f59e0b',
  4: '#eab308', 5: '#a3e635', 6: '#84cc16', 7: '#22c55e',
  8: '#10b981', 9: '#14b8a6', 10: '#06b6d4', 11: '#3b82f6',
  12: '#8b5cf6', 13: '#a855f7',
};

const SLOT_LABELS: Record<number, string> = {
  0: 'New', 1: '5m', 2: '1h', 3: '4h', 4: '1d', 5: '2d', 6: '1w',
  7: '2w', 8: '4w', 9: '8w', 10: '3mo', 11: '6mo', 12: '9mo', 13: '1yr',
};

function SlotDots({ slot }: { slot: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 13 }, (_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full transition-colors"
          style={{ backgroundColor: i < slot ? SLOT_COLORS[slot] : '#2e3348' }}
        />
      ))}
      <span className="text-xs text-gray-400 ml-1 font-mono">{SLOT_LABELS[slot]} ({slot}/13)</span>
    </div>
  );
}


// Extract plain-text segments from a card side for speech. Each returned item
// is a separate line/segment so the speaker can pause between the headword and
// the example phrase. Strips markdown bold, "Pronunciation: ..." lines, and
// romanized transliterations in parentheses following Cyrillic text.
function extractSideSegments(side: CardSideFull): string[] {
  const out: string[] = [];
  for (const b of side.media_blocks) {
    if (b.block_type !== 'text' || !b.text_content) continue;
    let t = b.text_content.replace(/\*\*/g, '');
    t = t
      .split(/\r?\n/)
      .filter((line) => !/^\s*pronunciation\s*:/i.test(line))
      .join('\n');
    // Strip all parenthesized annotations (romanizations, part-of-speech tags,
    // etc.) — e.g. "Ключ (klyuch)" → "Ключ", "Heuristic (noun/adj)" → "Heuristic"
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

// Build an ordered plan of (lang, text) pieces. A line containing " — " or
// " - " is split into two pieces so each side is spoken with its own language.
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

// Chunk long text so Chrome's speechSynthesis doesn't truncate it (~200 char bug)
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

// Active TTS cancellation — clears both queued utterances and the 2s pause timer.
let pendingTtsTimer: ReturnType<typeof setTimeout> | null = null;
function cancelSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (pendingTtsTimer) {
    clearTimeout(pendingTtsTimer);
    pendingTtsTimer = null;
  }
}

// Speak a card: auto-detect Russian vs English per segment, and pause for
// `pauseAfterFirstMs` ms between the first segment (headword) and the rest.
function speakCard(segments: string[], pauseAfterFirstMs = 2000) {
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
        // Just finished the first entry — pause before the rest.
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

// Render markdown-style bold (**text**) as <strong> elements
function renderMarkdownBold(text: string): (string | JSX.Element)[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ─── Elaboration Panel — inline learning prompts on card back ───

interface ElaborationPrompt {
  id: string;
  label: string;
  icon: any;
  placeholder: string;
  color: string;
}

const ELABORATION_PROMPTS: ElaborationPrompt[] = [
  { id: 'example', label: 'Real-World Example', icon: Lightbulb, placeholder: 'Describe a real scenario where this applies...', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  { id: 'mistake', label: 'Common Mistake', icon: AlertTriangle, placeholder: 'What do people get wrong about this?', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { id: 'connection', label: 'Connects To...', icon: Link2, placeholder: 'How does this relate to other concepts you know?', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { id: 'own-words', label: 'In My Own Words', icon: MessageSquare, placeholder: 'Explain this like you\'re teaching someone...', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
];

function ElaborationPanel({ card, onCardUpdated }: { card: CardFull; onCardUpdated: (card: CardFull) => void }) {
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>({});

  // Parse existing notes from the card's back side
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

    // Build updated back media blocks — add the note as a new text block
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
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 text-center">Deepen Your Understanding</div>
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
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : isActive
                      ? prompt.color + ' ring-1 ring-current'
                      : 'bg-surface-base border-border text-gray-400 hover:text-gray-200 hover:border-gray-500'
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
                    className="w-full bg-surface-base border border-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-accent focus:outline-none resize-none"
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
                      className="px-2.5 py-1 text-xs text-gray-400 hover:text-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(prompt.id)}
                      disabled={saving || !inputValue.trim()}
                      className="px-3 py-1 bg-accent/20 text-accent text-xs font-medium rounded-lg border border-accent/30 hover:bg-accent/30 disabled:opacity-40 flex items-center gap-1.5 min-h-[32px]"
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

// Strip parenthetical annotations and "Pronunciation: ..." lines from card
// display text so we never show them even before the DB migration runs.
function cleanDisplayText(raw: string): string {
  return raw
    .split(/\r?\n/)
    .filter((line) => !/^\s*pronunciation\s*:/i.test(line))
    .join('\n')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function MediaBlockRenderer({ block, hasImage }: { block: MediaBlock; hasImage?: boolean }) {
  switch (block.block_type) {
    case 'text': {
      const text = cleanDisplayText(block.text_content || '');
      // Shrink text automatically for longer content; no character truncation —
      // the parent container scrolls instead.
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
          <div className={`${textClass} text-gray-100 whitespace-pre-wrap break-words`}>
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

type StudyMode = 'review' | 'new' | 'mixed' | 'pipeline' | 'focus';

interface SessionStats {
  total: number;
  reviewed: number;
  correct: number;
  wrong: number;
  slotChanges: { cardId: string; from: number; to: number }[];
}

export function StudyView() {
  const { selectedTopicId, topics, cardSets, fetchTopics } = useStore();
  const ttsEnabled = useStore((s) => s.ttsEnabled);
  const voiceCmdEnabled = useStore((s) => s.voiceCmdEnabled);
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlSetId = searchParams.get('set');

  // Session state
  const [mode, setMode] = useState<StudyMode>(urlSetId ? 'focus' : 'review');
  const [queue, setQueue] = useState<CardFull[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ total: 0, reviewed: 0, correct: 0, wrong: 0, slotChanges: [] });
  const [filterSetId, setFilterSetId] = useState<string>(urlSetId || '');
  const startTime = useRef<number>(0);
  const autoStarted = useRef(false);
  const flippedRef = useRef(flipped);
  const handleGradeRef = useRef<(r: 'correct' | 'wrong') => void>(() => {});
  useEffect(() => { flippedRef.current = flipped; }, [flipped]);

  // Reset session when topic changes
  useEffect(() => {
    setSessionActive(false);
    setSessionComplete(false);
    setQueue([]);
    setCurrentIndex(0);
    setFlipped(false);
  }, [selectedTopicId]);

  // Auto-start when navigated from dashboard with ?set=xxx
  useEffect(() => {
    if (urlSetId && !autoStarted.current && !sessionActive) {
      autoStarted.current = true;
      startSession();
    }
  }, [urlSetId]);

  // Auto read-aloud: speak front when card appears, back when flipped.
  // Language is auto-detected per segment (Cyrillic → Russian, else English).
  // When flipped on an English-vocab card (front is Latin), prepend the
  // headword to the back reading and use a 1-second pause before the
  // definition/example.
  useEffect(() => {
    if (!ttsEnabled || !sessionActive || sessionComplete) {
      cancelSpeech();
      return;
    }
    const card = queue[currentIndex];
    if (!card) return;
    if (flipped) {
      const frontSegs = extractSideSegments(card.front);
      const backSegs = extractSideSegments(card.back);
      const frontHeadword = frontSegs[0];
      const frontIsEnglish = frontHeadword && !/[\u0400-\u04FF]/.test(frontHeadword);
      if (frontIsEnglish && frontHeadword) {
        speakCard([frontHeadword, ...backSegs], 1000);
      } else if (backSegs.length > 0) {
        speakCard(backSegs);
      }
    } else {
      const segs = extractSideSegments(card.front);
      if (segs.length > 0) speakCard(segs);
    }
  }, [ttsEnabled, sessionActive, sessionComplete, currentIndex, flipped, queue]);

  // Stop any in-flight speech when leaving the session
  useEffect(() => {
    return () => { cancelSpeech(); };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!sessionActive || sessionComplete) return;
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (flipped) {
        if (e.key === '1') handleGrade('wrong');
        if (e.key === '2') handleGrade('correct');
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sessionActive, sessionComplete, flipped, currentIndex, queue]);

  // Voice commands: listen for "flip card", "next card", "wrong", "correct", "end session"
  // Works on desktop Chrome AND Android Chrome. Not supported on iOS Safari or Firefox.
  useEffect(() => {
    if (!voiceCmdEnabled || !sessionActive || sessionComplete) return;
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn('SpeechRecognition not supported in this browser');
      return;
    }
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = false;
    recog.lang = 'en-US';
    let stopped = false;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;

    const safeStart = () => {
      if (stopped) return;
      try { recog.start(); } catch { /* already running */ }
    };

    recog.onresult = (ev: any) => {
      // Don't process commands while TTS is speaking (avoid self-triggering)
      if (window.speechSynthesis && window.speechSynthesis.speaking) return;
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (!res.isFinal) continue;
        const transcript = (res[0].transcript || '').toLowerCase().trim();
        if (!transcript) continue;
        if (transcript.includes('end session')) {
          setSessionActive(false);
          setSessionComplete(false);
        } else if (transcript.includes('repeat')) {
          speakCurrentSideRef.current();
        } else if (transcript.includes('next')) {
          handleNextCardRef.current();
        } else if (transcript.includes('flip')) {
          setFlipped((f) => !f);
        } else if (flippedRef.current && transcript.includes('correct')) {
          handleGradeRef.current('correct');
        } else if (flippedRef.current && transcript.includes('wrong')) {
          handleGradeRef.current('wrong');
        }
      }
    };

    recog.onerror = (e: any) => {
      // Fatal errors: user denied mic, or no mic available
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        stopped = true;
        console.warn('Microphone permission denied for voice commands');
      }
      // 'no-speech', 'aborted', 'audio-capture' are non-fatal — onend will restart
    };

    recog.onend = () => {
      // Android Chrome auto-stops after ~1s of silence — restart with a small
      // debounce so we don't hit the spec rate limit.
      if (stopped) return;
      if (restartTimer) clearTimeout(restartTimer);
      restartTimer = setTimeout(safeStart, 250);
    };

    safeStart();
    return () => {
      stopped = true;
      if (restartTimer) clearTimeout(restartTimer);
      try { recog.stop(); } catch {}
      try { recog.abort(); } catch {}
    };
  }, [voiceCmdEnabled, sessionActive, sessionComplete]);

  const runDecayCheck = async () => {
    try {
      await fetch('/api/study/decay-check', { method: 'POST' });
    } catch (err) {
      console.error('Decay check failed:', err);
    }
  };

  const startSession = async () => {
    // Prime mobile TTS engine — mobile browsers require a direct user gesture
    // to unlock speechSynthesis. This silent utterance satisfies that requirement
    // so subsequent auto-read calls from effects work on Android Chrome.
    if (ttsEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const primer = new SpeechSynthesisUtterance(' ');
        primer.volume = 0;
        window.speechSynthesis.speak(primer);
      } catch {}
    }

    setLoading(true);
    await runDecayCheck();

    const params = new URLSearchParams();
    if (selectedTopicId) params.set('topic', selectedTopicId);
    if (filterSetId) params.set('set', filterSetId);

    let url: string;
    if (mode === 'pipeline') {
      url = '/api/study/pipeline?limit=20&';
    } else if (mode === 'review') {
      params.set('mode', 'review');
      url = '/api/study/due?';
    } else if (mode === 'new') {
      params.set('mode', 'new');
      params.set('limit', '2');
      url = '/api/study/due?';
    } else if (mode === 'mixed') {
      params.set('mode', 'mixed');
      params.set('limit', '2');
      url = '/api/study/due?';
    } else {
      // focus mode — use legacy (all due for the set)
      url = '/api/study/due?';
    }

    try {
      const res = await fetch(url + params.toString());
      const cards: CardFull[] = await res.json();

      // Shuffle cards so they're never in predictable order
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }

      setQueue(cards);
      setCurrentIndex(0);
      setFlipped(false);
      setSessionActive(true);
      setSessionComplete(false);
      setStats({ total: cards.length, reviewed: 0, correct: 0, wrong: 0, slotChanges: [] });
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
          slotChanges: data.slotBefore !== data.slotAfter
            ? [...prev.slotChanges, { cardId: card.id, from: data.slotBefore, to: data.slotAfter }]
            : prev.slotChanges,
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

  useEffect(() => { handleGradeRef.current = handleGrade; }, [handleGrade]);

  const speakCurrentSide = useCallback(() => {
    const card = queue[currentIndex];
    if (!card) return;
    if (flipped) {
      const frontSegs = extractSideSegments(card.front);
      const backSegs = extractSideSegments(card.back);
      const frontHeadword = frontSegs[0];
      const frontIsEnglish = frontHeadword && !/[\u0400-\u04FF]/.test(frontHeadword);
      if (frontIsEnglish && frontHeadword) {
        speakCard([frontHeadword, ...backSegs], 1000);
      } else if (backSegs.length > 0) {
        speakCard(backSegs);
      }
    } else {
      const segs = extractSideSegments(card.front);
      if (segs.length > 0) speakCard(segs);
    }
  }, [queue, currentIndex, flipped]);
  const speakCurrentSideRef = useRef(speakCurrentSide);
  useEffect(() => { speakCurrentSideRef.current = speakCurrentSide; }, [speakCurrentSide]);

  const handleNextCard = useCallback(() => {
    if (currentIndex + 1 >= queue.length) {
      setSessionComplete(true);
      fetchTopics();
    } else {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
      startTime.current = Date.now();
    }
  }, [currentIndex, queue, fetchTopics]);
  const handleNextCardRef = useRef(handleNextCard);
  useEffect(() => { handleNextCardRef.current = handleNextCard; }, [handleNextCard]);

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

          {stats.slotChanges.length > 0 && (
            <div className="text-left mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Tier Changes</h3>
              <div className="space-y-1">
                {stats.slotChanges.map((tc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-mono" style={{ color: SLOT_COLORS[tc.from] }}>{SLOT_LABELS[tc.from]}</span>
                    <ChevronRight className="w-3 h-3 text-gray-500" />
                    <span className="font-mono" style={{ color: SLOT_COLORS[tc.to] }}>{SLOT_LABELS[tc.to]}</span>
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

          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => navigate('/stats')} className="btn-secondary flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <button onClick={() => { setSessionActive(false); setSessionComplete(false); }} className="btn-secondary">
              Study Menu
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

  // --- SR STATUS BADGE ---
  const SrBadge = ({ card }: { card: CardFull }) => {
    const slot = card.sr_slot;
    const dueAt = card.sr_next_due_at;
    const graceDeadline = card.sr_grace_deadline;
    const now = Date.now();
    const isDue = dueAt ? now >= new Date(dueAt).getTime() : slot === 0;
    const isOverdue = graceDeadline ? now > new Date(graceDeadline).getTime() : false;
    const trancheNum = slot <= 3 ? 1 : slot <= 6 ? 2 : slot <= 9 ? 3 : slot <= 11 ? 4 : 5;
    const trancheNames: Record<number, string> = { 1: 'Immediate', 2: 'Short-Term', 3: 'Medium-Term', 4: 'Long-Term', 5: 'Mastery' };

    const badgeColor = isOverdue ? 'border-red-500/40 bg-red-500/10' : isDue ? 'border-amber-500/40 bg-amber-500/10' : 'border-border bg-surface-base/50';
    const textColor = isOverdue ? 'text-red-400' : isDue ? 'text-amber-400' : 'text-gray-500';

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
        <div className="text-[10px] text-gray-500 leading-tight">
          Slot {slot}/13 — {trancheNames[trancheNum]}
        </div>
        {graceDeadline && (
          <div className="text-[10px] text-gray-600 leading-tight">
            Grace: {fmtDate(graceDeadline)}
          </div>
        )}
      </div>
    );
  };

  // --- EMPTY SESSION (no cards matched the selected mode) ---
  if (sessionActive && !sessionComplete && queue.length === 0) {
    const emptyMsg =
      mode === 'new'
        ? 'No new cards available in this topic. Add some cards or pick a different mode.'
        : mode === 'review'
          ? 'Nothing due to review right now. Come back later!'
          : 'No cards matched this study mode.';
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="card p-8">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-accent" />
          <h2 className="text-2xl font-heading font-bold text-white mb-2">No cards to study</h2>
          <p className="text-gray-400 mb-6">{emptyMsg}</p>
          <button
            onClick={() => { setSessionActive(false); }}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Study Menu
          </button>
        </div>
      </div>
    );
  }

  // --- ACTIVE SESSION ---
  if (sessionActive && currentCard) {
    return (
      <div className="max-w-5xl mx-auto px-2 sm:px-4">
        {/* Progress bar */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-400 truncate max-w-[120px] sm:max-w-none">
              {selectedTopic?.name || 'All Topics'}
            </span>
            <span className="text-xs text-gray-600">|</span>
            <span className="text-xs sm:text-sm font-mono text-gray-400">
              {currentIndex + 1}/{queue.length}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-green-400 font-mono">{stats.correct} ✓</span>
            <span className="text-xs sm:text-sm text-red-400 font-mono">{stats.wrong} ✗</span>
            <button
              onClick={() => { setSessionActive(false); setSessionComplete(false); }}
              className="text-xs text-gray-500 hover:text-gray-300 active:text-gray-200"
            >
              End
            </button>
          </div>
        </div>

        {/* Progress track */}
        <div className="w-full bg-surface rounded-full h-1.5 mb-4">
          <div
            className="h-1.5 rounded-full bg-accent transition-all duration-300"
            style={{ width: `${((currentIndex) / queue.length) * 100}%` }}
          />
        </div>

        {/* 3D Flip Card */}
        <div
          className="cursor-pointer select-none"
          style={{ perspective: '1200px' }}
          onClick={() => setFlipped(!flipped)}
        >
          <div
            className="relative transition-transform duration-300 ease-in-out min-h-[500px]"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* FRONT FACE */}
            <div
              className="card p-4 sm:p-6 absolute inset-0 flex flex-col"
              style={{ backfaceVisibility: 'hidden' }}
            >
              {/* Top bar: slot dots + SR badge */}
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex flex-col gap-1.5">
                  <SlotDots slot={currentCard.sr_slot} />
                  <div className="flex gap-1">
                    {(JSON.parse(currentCard.tags || '[]') as string[]).map((tag) => (
                      <span key={tag} className="text-xs bg-accent/10 text-accent/70 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <SrBadge card={currentCard} />
              </div>

              {/* Front content (scrolls if long) */}
              <div className="flex-1 overflow-y-auto flex flex-col justify-center space-y-3 min-h-[80px] text-center">
                {(() => {
                  const hasImg = currentCard.front.media_blocks.some(b => b.block_type === 'image' || b.block_type === 'video');
                  return currentCard.front.media_blocks.map((block) => (
                    <MediaBlockRenderer key={block.id} block={block} hasImage={hasImg} />
                  ));
                })()}
              </div>

              <div className="text-center mt-2 shrink-0">
                <span className="text-xs text-gray-400">tap to flip</span>
              </div>
            </div>

            {/* BACK FACE */}
            <div
              className="card p-4 sm:p-6 absolute inset-0 flex flex-col"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-2 text-center shrink-0">Answer</div>

              {/* Back content (scrolls if long) */}
              <div className="flex-1 overflow-y-auto flex flex-col items-start space-y-3 min-h-[80px]">
                {(() => {
                  const hasImg = currentCard.back.media_blocks.some(b => b.block_type === 'image' || b.block_type === 'video');
                  return currentCard.back.media_blocks.map((block) => (
                    <MediaBlockRenderer key={block.id} block={block} hasImage={hasImg} />
                  ));
                })()}
              </div>

              {/* Correct / Wrong buttons */}
              <div className="border-t border-border mt-3 pt-3 shrink-0">
                <div className="flex gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleGrade('wrong'); }}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/40 text-red-400 border border-red-600/30 px-4 py-4 sm:py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <X className="w-5 h-5" />
                    Wrong
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleGrade('correct'); }}
                    className="flex-1 bg-green-600/20 hover:bg-green-600/30 active:bg-green-600/40 text-green-400 border border-green-600/30 px-4 py-4 sm:py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Check className="w-5 h-5" />
                    Correct
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-xs text-gray-600 mt-4 hidden sm:block">
          Space = flip • 1 = wrong • 2 = correct
        </p>
        <p className="text-center text-xs text-gray-600 mt-3 sm:hidden">
          Tap card to flip • Grade your answer
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
          { id: 'review' as StudyMode, label: 'Review Due', desc: 'Cards you\'ve studied that need review', icon: Clock },
          { id: 'new' as StudyMode, label: 'Learn New', desc: 'Introduce 2 new cards', icon: GraduationCap },
          { id: 'mixed' as StudyMode, label: 'Mixed Session', desc: 'Review due + 2 new cards', icon: Zap },
          { id: 'focus' as StudyMode, label: 'Focus Set', desc: 'Study a specific card set', icon: Target },
          { id: 'pipeline' as StudyMode, label: 'Ahead of Schedule', desc: 'Study upcoming cards early', icon: Play },
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
      {mode === 'focus' && selectedTopicId && cardSets.length > 0 && (
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
