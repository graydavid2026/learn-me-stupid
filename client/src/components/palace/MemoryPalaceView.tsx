import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Plus, Eye, Edit3, X, ChevronLeft, ChevronRight,
  Play, Sparkles, ArrowLeft, Brain, Lightbulb, ChevronDown, HelpCircle,
} from 'lucide-react';
import { RoomView } from './RoomRenderer';
import {
  World, Locus, LOCUS_COLORS, THEMES,
  generateWorld, createDemoWorld, matchTheme,
} from './palaceEngine';
import { useStore, CardFull } from '../../stores/useStore';

/* ══════════════════════════════════════════════════
   PALACE SETUP — Subject + Items entry
   ══════════════════════════════════════════════════ */

function getCardText(card: CardFull, side: 'front' | 'back'): string {
  const s = side === 'front' ? card.front : card.back;
  const textBlock = s?.media_blocks?.find(b => b.block_type === 'text');
  return textBlock?.text_content?.trim() || '';
}

function PalaceHelpSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <HelpCircle className="w-4 h-4 text-accent shrink-0" />
        <span className="text-sm font-medium text-gray-300 flex-1">What is a Memory Palace?</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <div className="text-sm text-gray-400 leading-relaxed space-y-3">
            <p>
              The Memory Palace (Method of Loci) is a 2,500-year-old technique used by
              memory champions. To use it:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-gray-300 text-sm">
              <li>Choose a familiar place (your home, office, or a route you walk)</li>
              <li>Place each item you want to remember at a specific location</li>
              <li>Make the images vivid, unusual, and exaggerated</li>
              <li>To recall, mentally walk through the palace visiting each location</li>
            </ol>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-success/8 border border-success/20 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-success mb-1">Best for</p>
                <p className="text-xs text-gray-400">Vocabulary, lists, sequences, facts</p>
              </div>
              <div className="bg-warning/8 border border-warning/20 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-warning mb-1">Less ideal for</p>
                <p className="text-xs text-gray-400">Abstract concepts, mathematical formulas</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PalaceSetup({ onGenerate, onDemo }: { onGenerate: (w: World) => void; onDemo: () => void }) {
  const { topics, cardSets, fetchCardSets } = useStore();
  const [building, setBuilding] = useState(false);

  // Fetch sets when we need them for a topic
  const buildFromTopic = async (topicId: string) => {
    setBuilding(true);
    const topic = topics.find(t => t.id === topicId)!;

    // Fetch sets for this topic
    const setsRes = await fetch(`/api/topics/${topicId}/sets`);
    const sets: { id: string; name: string }[] = await setsRes.json();

    // Fetch all cards from all sets
    const items: string[] = [];
    for (const set of sets) {
      try {
        const res = await fetch(`/api/sets/${set.id}/cards`);
        const cards: CardFull[] = await res.json();
        for (const card of cards) {
          const front = getCardText(card, 'front');
          const back = getCardText(card, 'back');
          if (front || back) {
            items.push(back ? `${front} — ${back}` : front);
          }
        }
      } catch { /* skip */ }
    }

    if (items.length === 0) {
      setBuilding(false);
      return;
    }

    const world = generateWorld(topic.name, items);
    setBuilding(false);
    onGenerate(world);
  };

  // ─── Manual entry state ───
  const [subject, setSubject] = useState('');
  const [itemsText, setItemsText] = useState('');
  const [themeKey, setThemeKey] = useState<string | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const detectedTheme = subject ? matchTheme(subject) : null;
  const activeTheme = themeKey ? THEMES.find(t => t.key === themeKey)! : detectedTheme;
  const manualItems = itemsText.split('\n').map(l => l.trim()).filter(Boolean);
  const roomCount = Math.max(1, Math.ceil(manualItems.length / 8));

  const handleGenerate = () => {
    if (!subject.trim() || manualItems.length === 0) return;
    onGenerate(generateWorld(subject.trim(), manualItems, themeKey || undefined));
  };

  const topicsWithCards = topics.filter(t => t.card_count > 0);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <Brain className="w-4 h-4" />
          Memory Palace Builder
        </div>
        <h1 className="text-3xl font-heading font-bold text-white mb-2">Build Your World</h1>
        <p className="text-gray-400 max-w-md mx-auto">
          The environment IS the information. Pick a topic to turn your cards into a
          spatial world you can mentally walk through.
        </p>
      </div>

      <PalaceHelpSection />

      <div className="space-y-6">
        {/* ── Build from existing cards ── */}
        {topicsWithCards.length > 0 && (
          <div>
            <label className="text-sm font-semibold text-gray-300 block mb-3">Build from your cards</label>
            <div className="grid gap-2">
              {topicsWithCards.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => buildFromTopic(topic.id)}
                  disabled={building}
                  className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between hover:border-accent/40 transition-colors text-left group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: topic.color + '20', color: topic.color }}>
                      {topic.icon || '📚'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-accent transition-colors">{topic.name}</p>
                      <p className="text-xs text-gray-500">{topic.card_count} card{topic.card_count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-gray-600 group-hover:text-accent transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {building && (
          <div className="text-center py-4 text-gray-400 text-sm">Building palace...</div>
        )}

        {/* ── Divider ── */}
        <div className="flex items-center gap-3 text-gray-600 text-xs">
          <span className="flex-1 border-t border-border" />
          <span>or</span>
          <span className="flex-1 border-t border-border" />
        </div>

        {/* ── Manual entry toggle ── */}
        {!showManual ? (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowManual(true)}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Enter items manually
            </button>
            <span className="text-gray-600">·</span>
            <button onClick={onDemo} className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
              Try a demo
            </button>
          </div>
        ) : (
          <>
            {/* Subject */}
            <div>
              <label className="text-sm font-semibold text-gray-300 block mb-2">Subject</label>
              <input
                value={subject}
                onChange={e => { setSubject(e.target.value); setThemeKey(null); }}
                placeholder='e.g. "Python Data Structures"'
                className="input w-full"
                autoFocus
              />
              {activeTheme && subject.trim() && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Theme:</span>
                  <button
                    onClick={() => setShowThemePicker(!showThemePicker)}
                    className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full hover:bg-accent/20 transition-colors"
                  >
                    {activeTheme.label} <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              )}
              <AnimatePresence>
                {showThemePicker && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {THEMES.map(t => (
                        <button key={t.key} onClick={() => { setThemeKey(t.key); setShowThemePicker(false); }}
                          className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${(themeKey || detectedTheme?.key) === t.key ? 'border-accent bg-accent/10 text-accent' : 'border-border text-gray-400 hover:text-gray-300'}`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Items */}
            <div>
              <label className="text-sm font-semibold text-gray-300 block mb-2">Items <span className="text-gray-500 font-normal">— one per line</span></label>
              <textarea
                value={itemsText}
                onChange={e => setItemsText(e.target.value)}
                placeholder={'Lists are ordered, mutable sequences\nTuples are ordered, immutable sequences\nDictionaries store key-value pairs\n...'}
                className="input w-full text-sm font-mono resize-none"
                rows={8}
              />
              {manualItems.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{manualItems.length} items → {roomCount} room{roomCount !== 1 ? 's' : ''}</p>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!subject.trim() || manualItems.length === 0}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Sparkles className="w-5 h-5" /> Generate Palace
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   BUILDING MAP — multi-room floor plan
   ══════════════════════════════════════════════════ */

function BuildingMap({ world, selectedRoomId, onSelectRoom }: {
  world: World; selectedRoomId: string | null; onSelectRoom: (id: string) => void;
}) {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg viewBox="-5 -12 110 124" className="w-full h-full max-w-3xl max-h-[60vh]">
        {/* Building boundary */}
        <rect x="-2" y="-2" width="104" height="104" rx="2" fill="#0f1019" stroke="#2e3348" strokeWidth="0.8" />

        {/* Hallway connections */}
        {world.rooms.slice(0, -1).map((room, i) => {
          const next = world.rooms[i + 1];
          const r1cx = room.bx + room.bw / 2, r1cy = room.by + room.bh / 2;
          const r2cx = next.bx + next.bw / 2, r2cy = next.by + next.bh / 2;
          return (
            <line key={`hall-${i}`} x1={r1cx} y1={r1cy} x2={r2cx} y2={r2cy}
              stroke="#1e2030" strokeWidth="4" strokeLinecap="round" />
          );
        })}

        {/* Rooms */}
        {world.rooms.map(room => {
          const isSelected = selectedRoomId === room.id;
          const roomAccent = room.style.accentColor;
          return (
            <g key={room.id} onClick={() => onSelectRoom(room.id)} className="cursor-pointer">
              {/* Room shadow */}
              <rect x={room.bx + 0.5} y={room.by + 0.5} width={room.bw} height={room.bh} rx="1" fill="#000" opacity="0.2" />
              {/* Room fill */}
              <rect x={room.bx} y={room.by} width={room.bw} height={room.bh} rx="1"
                fill={isSelected ? roomAccent + '20' : '#161828'}
                stroke={isSelected ? roomAccent : '#2e3348'}
                strokeWidth={isSelected ? '1' : '0.5'}
              />
              {/* Room label */}
              <text x={room.bx + room.bw / 2} y={room.by + room.bh / 2 - 1.5}
                textAnchor="middle" fill={isSelected ? '#e5e7eb' : '#9ca3af'}
                fontSize="2.5" fontFamily="system-ui" fontWeight="600">
                {room.name.length > 20 ? room.name.slice(0, 18) + '...' : room.name}
              </text>
              <text x={room.bx + room.bw / 2} y={room.by + room.bh / 2 + 2.5}
                textAnchor="middle" fill="#6b7280" fontSize="2" fontFamily="system-ui">
                {room.loci.length} loci
              </text>
              {/* Hover highlight */}
              <rect x={room.bx} y={room.by} width={room.bw} height={room.bh} rx="1"
                fill="transparent" stroke="transparent" strokeWidth="1"
                className="hover:stroke-gray-500 transition-colors" />
            </g>
          );
        })}

        {/* Title */}
        <text x="50" y="-5" textAnchor="middle" fill="#5a5e7a" fontSize="3.5" fontFamily="system-ui" fontWeight="600">
          {world.name}
        </text>
        <text x="50" y="106" textAnchor="middle" fill="#3a3e5a" fontSize="2" fontFamily="system-ui" fontStyle="italic">
          {world.description}
        </text>
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   LOCUS PANEL — content, mnemonic, SR score
   ══════════════════════════════════════════════════ */

function LocusPanel({ locus, onClose, onUpdate }: {
  locus: Locus; onClose: () => void;
  onUpdate: (id: string, updates: Partial<Locus>) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(locus.content);
  const [hint, setHint] = useState(locus.mnemonicHint);

  useEffect(() => {
    setContent(locus.content);
    setHint(locus.mnemonicHint);
    setFlipped(false);
    setEditing(false);
  }, [locus.id]);

  const saveEdit = () => {
    onUpdate(locus.id, { content, mnemonicHint: hint });
    setEditing(false);
  };

  const tierLabels = ['New', '10m', '1d', '3d', '1w', '2w', '1mo', '4mo', '8mo'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg z-30"
    >
      <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: locus.color }}>
              {locus.order}
            </div>
            <div>
              <span className="text-sm text-gray-300 font-medium">{locus.objectName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* SR tier dots */}
            <div className="flex gap-0.5">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" style={{
                  backgroundColor: i <= locus.srTier
                    ? ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#22c55e'][locus.srTier]
                    : '#2e3348',
                }} />
              ))}
            </div>
            <span className="text-xs text-gray-500 font-mono">{tierLabels[locus.srTier]}</span>
            <button onClick={onClose} aria-label="Close" className="p-1 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Content */}
        {editing ? (
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Content</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} className="input w-full text-sm resize-none" rows={3} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Mnemonic Hint</label>
              <textarea value={hint} onChange={e => setHint(e.target.value)} className="input w-full text-sm resize-none" rows={2} />
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} className="btn-primary text-sm flex-1">Save</button>
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="p-4 cursor-pointer" onClick={() => setFlipped(!flipped)}>
            <AnimatePresence mode="wait">
              <motion.div
                key={flipped ? 'hint' : 'content'}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {!flipped ? (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">What to remember</p>
                    <p className="text-white text-base leading-relaxed">{locus.content}</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="w-3 h-3 text-amber-400" />
                      <p className="text-xs text-amber-400/80 uppercase tracking-wider">Mnemonic Image</p>
                    </div>
                    <p className="text-gray-200 text-sm leading-relaxed italic">{locus.mnemonicHint}</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Footer */}
        {!editing && (
          <div className="px-4 py-2 border-t border-border flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {flipped ? 'Click to see content' : 'Click to see mnemonic hint'}
            </p>
            <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-accent transition-colors">
              Edit
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   WALKTHROUGH CONTROLS
   ══════════════════════════════════════════════════ */

function WalkthroughControls({ index, total, onPrev, onNext, onStop, label, roomName }: {
  index: number; total: number; onPrev: () => void; onNext: () => void; onStop: () => void; label: string; roomName: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-surface border border-border rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-4"
    >
      <button onClick={onStop} aria-label="Stop walkthrough" className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
      <button onClick={onPrev} disabled={index === 0} aria-label="Previous stop" className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
      <div className="text-center min-w-[140px]">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-gray-500 text-xs">{roomName} — stop {index + 1} of {total}</p>
      </div>
      <button onClick={onNext} disabled={index === total - 1} aria-label="Next stop" className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   ADD LOCUS FORM
   ══════════════════════════════════════════════════ */

function AddLocusForm({ onAdd, onCancel, nextOrder, theme }: {
  onAdd: (l: Omit<Locus, 'id'>) => void; onCancel: () => void; nextOrder: number; theme: typeof THEMES[0] | null;
}) {
  const [content, setContent] = useState('');
  const [hint, setHint] = useState('');
  const objects = theme?.objects || THEMES[THEMES.length - 1].objects;
  const [objIdx, setObjIdx] = useState(nextOrder % objects.length);
  const color = LOCUS_COLORS[(nextOrder - 1) % LOCUS_COLORS.length];

  const handleSubmit = () => {
    if (!content.trim()) return;
    const obj = objects[objIdx];
    // Position roughly based on order
    const positions = [
      { x: 46, y: 14 }, { x: 20, y: 30 }, { x: 75, y: 22 },
      { x: 82, y: 50 }, { x: 75, y: 78 }, { x: 45, y: 85 },
      { x: 18, y: 75 }, { x: 15, y: 50 }, { x: 50, y: 50 }, { x: 40, y: 35 },
    ];
    const pos = positions[(nextOrder - 1) % positions.length];
    onAdd({
      objectName: obj.name,
      objectType: obj.type,
      x: pos.x + (Math.random() - 0.5) * 10,
      y: pos.y + (Math.random() - 0.5) * 10,
      content: content.trim(),
      mnemonicHint: hint.trim() || `Imagine the ${obj.name} — it represents "${content.trim().slice(0, 40)}..."`,
      order: nextOrder,
      color,
      srTier: 0,
      srCorrect: 0,
      srTotal: 0,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute top-3 right-3 z-30 w-80 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Add Locus #{nextOrder}</h3>
        <button onClick={onCancel} aria-label="Cancel" className="p-1 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 space-y-3 max-h-[55vh] overflow-y-auto">
        <div>
          <label className="text-xs text-gray-400 block mb-1">What to remember</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="The fact or concept..." className="input w-full text-sm resize-none" rows={2} />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Mnemonic hint (optional)</label>
          <textarea value={hint} onChange={e => setHint(e.target.value)} placeholder="A vivid image linking this to the object..." className="input w-full text-sm resize-none" rows={2} />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Object Type</label>
          <div className="flex flex-wrap gap-1.5">
            {objects.map((obj, i) => (
              <button
                key={i}
                onClick={() => setObjIdx(i)}
                className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                  i === objIdx ? 'border-accent bg-accent/15 text-accent' : 'border-border text-gray-500 hover:text-gray-300'
                }`}
              >
                {obj.name}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleSubmit} disabled={!content.trim()} className="btn-primary w-full text-sm disabled:opacity-40">
          Place Locus
        </button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN VIEW — orchestrates everything
   ══════════════════════════════════════════════════ */

export function MemoryPalaceView() {
  const [world, setWorld] = useState<World | null>(null);
  const [view, setView] = useState<'setup' | 'building' | 'room'>('setup');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [mode, setMode] = useState<'explore' | 'edit'>('explore');
  const [activeLocus, setActiveLocus] = useState<Locus | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [walkthroughIndex, setWalkthroughIndex] = useState<number | null>(null);

  const selectedRoom = world?.rooms.find(r => r.id === selectedRoomId) || null;
  const sorted = selectedRoom ? [...selectedRoom.loci].sort((a, b) => a.order - b.order) : [];
  const activeTheme = world ? THEMES.find(t => t.key === world.themeKey) || null : null;

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (walkthroughIndex !== null) { setWalkthroughIndex(null); setActiveLocus(null); }
        else if (activeLocus) setActiveLocus(null);
        else if (showAddForm) setShowAddForm(false);
        else if (view === 'room') setView('building');
      }
      if (walkthroughIndex !== null) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setWalkthroughIndex(i => i !== null && i < sorted.length - 1 ? i + 1 : i);
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setWalkthroughIndex(i => i !== null && i > 0 ? i - 1 : i);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [walkthroughIndex, activeLocus, showAddForm, view, sorted.length]);

  // Sync walkthrough locus
  useEffect(() => {
    if (walkthroughIndex !== null && sorted[walkthroughIndex]) {
      setActiveLocus(sorted[walkthroughIndex]);
    }
  }, [walkthroughIndex]);

  // ─── Mutations ───

  const updateLocus = (locusId: string, updates: Partial<Locus>) => {
    if (!world || !selectedRoomId) return;
    setWorld({
      ...world,
      rooms: world.rooms.map(r =>
        r.id === selectedRoomId
          ? { ...r, loci: r.loci.map(l => l.id === locusId ? { ...l, ...updates } : l) }
          : r
      ),
    });
    if (activeLocus?.id === locusId) setActiveLocus({ ...activeLocus, ...updates });
  };

  const dragLocus = (id: string, x: number, y: number) => {
    if (!world || !selectedRoomId) return;
    setWorld({
      ...world,
      rooms: world.rooms.map(r =>
        r.id === selectedRoomId
          ? { ...r, loci: r.loci.map(l => l.id === id ? { ...l, x, y } : l) }
          : r
      ),
    });
  };

  const deleteLocus = (id: string) => {
    if (!world || !selectedRoomId) return;
    setWorld({
      ...world,
      rooms: world.rooms.map(r =>
        r.id === selectedRoomId
          ? { ...r, loci: r.loci.filter(l => l.id !== id).map((l, i) => ({ ...l, order: i + 1 })) }
          : r
      ),
    });
    if (activeLocus?.id === id) setActiveLocus(null);
  };

  const addLocus = (data: Omit<Locus, 'id'>) => {
    if (!world || !selectedRoomId) return;
    const newLocus: Locus = { ...data, id: `l-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    setWorld({
      ...world,
      rooms: world.rooms.map(r =>
        r.id === selectedRoomId ? { ...r, loci: [...r.loci, newLocus] } : r
      ),
    });
    setShowAddForm(false);
  };

  // ─── Setup ───

  if (!world || view === 'setup') {
    return (
      <PalaceSetup
        onGenerate={w => { setWorld(w); setView(w.rooms.length > 1 ? 'building' : 'room'); setSelectedRoomId(w.rooms[0]?.id || null); }}
        onDemo={() => { const d = createDemoWorld(); setWorld(d); setView('room'); setSelectedRoomId(d.rooms[0].id); }}
      />
    );
  }

  // ─── Building Map ───

  if (view === 'building') {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col">
        <div className="flex items-center justify-between px-2 py-2 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => { setWorld(null); setView('setup'); }} className="p-1.5 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Home className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-heading font-bold text-white">{world.name}</h2>
            <span className="text-xs text-gray-500 font-mono">{world.rooms.length} rooms — {world.rooms.reduce((s, r) => s + r.loci.length, 0)} loci</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (world.rooms.length > 0) {
                  setSelectedRoomId(world.rooms[0].id);
                  setView('room');
                  setWalkthroughIndex(0);
                  setMode('explore');
                }
              }}
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Walk All Rooms
            </button>
          </div>
        </div>
        <div className="flex-1 bg-surface-base rounded-xl border border-border mx-2 mb-2 overflow-hidden">
          <BuildingMap
            world={world}
            selectedRoomId={selectedRoomId}
            onSelectRoom={id => { setSelectedRoomId(id); setView('room'); setActiveLocus(null); setWalkthroughIndex(null); }}
          />
        </div>
        <div className="px-4 pb-2 text-xs text-gray-600 text-center">Click a room to enter it</div>
      </div>
    );
  }

  // ─── Room View ───

  if (!selectedRoom) {
    setView('building');
    return null;
  }

  const startWalkthrough = () => {
    if (sorted.length === 0) return;
    setMode('explore');
    setWalkthroughIndex(0);
    setActiveLocus(sorted[0]);
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-2 shrink-0">
        <div className="flex items-center gap-2">
          {world.rooms.length > 1 && (
            <button onClick={() => { setView('building'); setActiveLocus(null); setWalkthroughIndex(null); }} className="p-1.5 text-gray-400 hover:text-white" title="Back to building map">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          {world.rooms.length === 1 && (
            <button onClick={() => { setWorld(null); setView('setup'); }} className="p-1.5 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <Home className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-heading font-bold text-white">{selectedRoom.name}</h2>
          <span className="text-xs text-gray-500">— {world.name}</span>

          {/* Room tabs (if multi-room) */}
          {world.rooms.length > 1 && (
            <div className="flex items-center gap-1 ml-3">
              {world.rooms.map(r => (
                <button
                  key={r.id}
                  onClick={() => { setSelectedRoomId(r.id); setActiveLocus(null); setWalkthroughIndex(null); }}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    r.id === selectedRoomId ? 'bg-accent/15 text-accent font-medium' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {r.name.length > 12 ? r.name.slice(0, 10) + '..' : r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">{selectedRoom.loci.length} loci</span>
          <button onClick={startWalkthrough} disabled={sorted.length === 0} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 disabled:opacity-40">
            <Play className="w-3.5 h-3.5" /> Walk Through
          </button>
          <button
            onClick={() => { setMode(mode === 'explore' ? 'edit' : 'explore'); setWalkthroughIndex(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === 'edit' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'btn-secondary'
            }`}
          >
            {mode === 'edit' ? <><Edit3 className="w-3.5 h-3.5" /> Editing</> : <><Eye className="w-3.5 h-3.5" /> Explore</>}
          </button>
          {mode === 'edit' && (
            <button onClick={() => setShowAddForm(true)} className="btn-primary text-xs flex items-center gap-1.5 py-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Locus
            </button>
          )}
        </div>
      </div>

      {/* Room Canvas */}
      <div className="flex-1 relative bg-surface-base rounded-xl border border-border mx-2 mb-2 overflow-hidden">
        <RoomView
          room={selectedRoom}
          mode={mode}
          activeLocus={activeLocus?.id || null}
          walkthroughIndex={walkthroughIndex}
          onLocusClick={l => { if (mode === 'explore') setActiveLocus(activeLocus?.id === l.id ? null : l); }}
          onLocusDrag={dragLocus}
          onLocusDelete={deleteLocus}
        />

        {/* Locus Panel */}
        <AnimatePresence>
          {activeLocus && walkthroughIndex === null && (
            <LocusPanel locus={activeLocus} onClose={() => setActiveLocus(null)} onUpdate={updateLocus} />
          )}
        </AnimatePresence>

        {/* Walkthrough */}
        <AnimatePresence>
          {walkthroughIndex !== null && (
            <>
              <WalkthroughControls
                index={walkthroughIndex}
                total={sorted.length}
                onPrev={() => setWalkthroughIndex(i => i !== null && i > 0 ? i - 1 : i)}
                onNext={() => setWalkthroughIndex(i => i !== null && i < sorted.length - 1 ? i + 1 : i)}
                onStop={() => { setWalkthroughIndex(null); setActiveLocus(null); }}
                label={sorted[walkthroughIndex]?.objectName || ''}
                roomName={selectedRoom.name}
              />
              {activeLocus && (
                <LocusPanel
                  locus={activeLocus}
                  onClose={() => { setWalkthroughIndex(null); setActiveLocus(null); }}
                  onUpdate={updateLocus}
                />
              )}
            </>
          )}
        </AnimatePresence>

        {/* Add Locus Form */}
        <AnimatePresence>
          {showAddForm && (
            <AddLocusForm
              onAdd={addLocus}
              onCancel={() => setShowAddForm(false)}
              nextOrder={selectedRoom.loci.length + 1}
              theme={activeTheme}
            />
          )}
        </AnimatePresence>

        {/* Empty state */}
        {selectedRoom.loci.length === 0 && mode === 'explore' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-500">
              <Home className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="font-medium">Empty Room</p>
              <p className="text-sm mt-1">Switch to Edit mode to add loci</p>
            </div>
          </div>
        )}

        {/* Help text */}
        {mode === 'explore' && selectedRoom.loci.length > 0 && walkthroughIndex === null && !activeLocus && (
          <div className="absolute bottom-3 left-3 text-xs text-gray-600">Click an object to see its content — scroll to zoom — drag to pan</div>
        )}
        {mode === 'edit' && (
          <div className="absolute bottom-3 left-3 text-xs text-amber-400/60">Drag objects to reposition — click X to delete — scroll to zoom</div>
        )}
      </div>
    </div>
  );
}
