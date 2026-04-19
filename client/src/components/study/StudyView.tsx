import { useState, useEffect, useCallback, useRef } from 'react';
import { GraduationCap, Play, Zap, Clock, Flame, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useStore, CardFull } from '../../stores/useStore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { TrancheDashboard } from './TrancheDashboard';
import {
  SlotDots, SrBadge, MediaBlockRenderer, ClozeText,
  extractSideSegments, speakCard, cancelSpeech,
} from './StudyCard';
import { StudyControls } from './StudyControls';
import { StudyProgress } from './StudyProgress';
import { StudyComplete } from './StudyComplete';
import { TypingAnswer } from './TypingAnswer';
import { QuickAddCard } from './QuickAddCard';

export type StudyMode = 'smart' | 'review' | 'new' | 'mixed' | 'pipeline' | 'cram' | 'focus';

export interface SessionStats {
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
  const newCardOrder = useStore((s) => s.newCardOrder);
  const dailyNewCardLimit = useStore((s) => s.dailyNewCardLimit);
  const globalNewCardLimit = useStore((s) => s.globalNewCardLimit);
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlSetId = searchParams.get('set');

  // Session state
  const [mode, setMode] = useState<StudyMode>(urlSetId ? 'focus' : 'smart');
  const [queue, setQueue] = useState<CardFull[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ total: 0, reviewed: 0, correct: 0, wrong: 0, slotChanges: [] });
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const [filterSetId, setFilterSetId] = useState<string>(urlSetId || '');
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  // Typing mode state
  const [typingInput, setTypingInput] = useState('');
  const [typingResult, setTypingResult] = useState<'correct' | 'wrong' | null>(null);
  const startTime = useRef<number>(0);
  const autoStarted = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Reset typing state when card changes
  useEffect(() => {
    setTypingInput('');
    setTypingResult(null);
  }, [currentIndex]);

  // Auto-start when navigated from dashboard with ?set=xxx
  useEffect(() => {
    if (urlSetId && !autoStarted.current && !sessionActive) {
      autoStarted.current = true;
      startSession();
    }
  }, [urlSetId]);

  // Auto read-aloud
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
        if (e.key === '1') handleGradeRef.current('wrong');
        if (e.key === '2') handleGradeRef.current('correct');
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sessionActive, sessionComplete, flipped]);

  // Voice commands
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

    const safeStart = () => {
      if (stopped) return;
      try { recog.start(); } catch { /* already running */ }
    };

    recog.onresult = (ev: any) => {
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
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        stopped = true;
        console.warn('Microphone permission denied for voice commands');
      }
    };

    recog.onend = () => {
      if (stopped) return;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = setTimeout(safeStart, 250);
    };

    safeStart();
    return () => {
      stopped = true;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      try { recog.stop(); } catch {}
      try { recog.abort(); } catch {}
    };
  }, [voiceCmdEnabled, sessionActive, sessionComplete]);

  const [decayMessage, setDecayMessage] = useState<string | null>(null);

  const runDecayCheck = async () => {
    try {
      const res = await fetch('/api/study/decay-check', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.regressed && data.regressed > 0) {
          setDecayMessage(`${data.regressed} card${data.regressed !== 1 ? 's' : ''} regressed due to inactivity`);
          setTimeout(() => setDecayMessage(null), 5000);
        }
      }
    } catch (err) {
      console.error('Decay check failed:', err);
    }
  };

  const startSession = async (redrillIds?: string[], modeOverride?: StudyMode) => {
    const effectiveMode = modeOverride ?? mode;
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
    if (redrillIds && redrillIds.length > 0) {
      const idParams = new URLSearchParams();
      idParams.set('ids', redrillIds.join(','));
      url = '/api/study/due?' + idParams.toString();
      params.forEach((_v, k) => params.delete(k));
    } else if (effectiveMode === 'cram') {
      params.set('mode', 'cram');
      url = '/api/study/due?';
    } else if (effectiveMode === 'smart') {
      params.set('mode', 'smart');
      params.set('dailyNewLimit', String(dailyNewCardLimit));
      params.set('globalNewLimit', String(globalNewCardLimit));
      url = '/api/study/due?';
    } else if (effectiveMode === 'pipeline') {
      url = '/api/study/pipeline?limit=20&';
    } else if (effectiveMode === 'review') {
      params.set('mode', 'review');
      url = '/api/study/due?';
    } else if (effectiveMode === 'new') {
      params.set('mode', 'new');
      params.set('limit', String(dailyNewCardLimit));
      params.set('dailyNewLimit', String(dailyNewCardLimit));
      params.set('globalNewLimit', String(globalNewCardLimit));
      const order = selectedTopicId ? newCardOrder[selectedTopicId] : undefined;
      if (order === 'random') params.set('order', 'random');
      url = '/api/study/due?';
    } else if (effectiveMode === 'mixed') {
      params.set('mode', 'mixed');
      params.set('limit', String(dailyNewCardLimit));
      params.set('dailyNewLimit', String(dailyNewCardLimit));
      params.set('globalNewLimit', String(globalNewCardLimit));
      const order = selectedTopicId ? newCardOrder[selectedTopicId] : undefined;
      if (order === 'random') params.set('order', 'random');
      url = '/api/study/due?';
    } else {
      url = '/api/study/due?';
    }

    try {
      const res = await fetch(url + params.toString());
      const cards: CardFull[] = await res.json();

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
      setWrongCardIds([]);
      startTime.current = Date.now();
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = useCallback(async (result: 'correct' | 'wrong') => {
    if (grading) return;
    const idx = currentIndex;
    const card = queue[idx];
    if (!card) return;

    setGrading(true);
    const responseTime = Date.now() - startTime.current;

    try {
      if (mode === 'pipeline') {
        setStats((prev) => ({
          ...prev,
          reviewed: prev.reviewed + 1,
          correct: prev.correct + (result === 'correct' ? 1 : 0),
          wrong: prev.wrong + (result === 'wrong' ? 1 : 0),
        }));
        if (idx + 1 >= queue.length) {
          setSessionComplete(true);
        } else {
          setCurrentIndex(idx + 1);
          setFlipped(false);
          startTime.current = Date.now();
        }
        return;
      }

      const isCram = mode === 'cram';
      let succeeded = false;
      let data: any = null;
      try {
        const res = await fetch('/api/study/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId: card.id,
            result,
            response_time_ms: responseTime,
            ...(isCram ? { review_type: 'cram' } : {}),
          }),
        });

        if (res.ok) {
          data = await res.json();
          succeeded = true;
        } else {
          setGradeError(`Review save failed (HTTP ${res.status}). Tap again to retry.`);
        }
      } catch (err) {
        console.error('Review failed:', err);
        setGradeError('Network error saving review. Tap again to retry.');
      }

      if (!succeeded) {
        return; // Do not advance; user's finally-block unlocks grading for retry
      }

      setGradeError(null);
      if (result === 'wrong') {
        setWrongCardIds((prev) => (prev.includes(card.id) ? prev : [...prev, card.id]));
      } else {
        setWrongCardIds((prev) => prev.filter((id) => id !== card.id));
      }
      setStats((prev) => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (result === 'correct' ? 1 : 0),
        wrong: prev.wrong + (result === 'wrong' ? 1 : 0),
        slotChanges: data.slotBefore !== data.slotAfter
          ? [...prev.slotChanges, { cardId: card.id, from: data.slotBefore, to: data.slotAfter }]
          : prev.slotChanges,
      }));

      const updatedQueue = [...queue];
      updatedQueue[idx] = data.card;

      if (isCram && result === 'wrong') {
        const reinsertPos = Math.min(idx + 1 + 5, updatedQueue.length);
        updatedQueue.splice(reinsertPos, 0, card);
        setStats((prev) => ({ ...prev, total: prev.total + 1 }));
      }

      setQueue(updatedQueue);

      if (idx + 1 >= queue.length) {
        setSessionComplete(true);
        fetchTopics();
      } else {
        setCurrentIndex(idx + 1);
        setFlipped(false);
        startTime.current = Date.now();
      }
    } finally {
      setGrading(false);
    }
  }, [currentIndex, queue, fetchTopics, mode, grading]);

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
    return (
      <StudyComplete
        stats={stats}
        queue={queue}
        selectedTopicId={selectedTopicId}
        wrongCardIds={wrongCardIds}
        onStudyAgain={(ids) => startSession(ids)}
        onStudyMenu={() => { setSessionActive(false); setSessionComplete(false); }}
      />
    );
  }

  // --- EMPTY SESSION ---
  if (sessionActive && !sessionComplete && queue.length === 0) {
    let emptyTitle = 'No cards to study';
    let emptyMsg: string;
    if (mode === 'new') {
      const topicHasNew = selectedTopic ? (selectedTopic as any).new_count > 0 || true : true;
      if (topicHasNew) {
        emptyTitle = 'Limit reached';
        emptyMsg = selectedTopicId
          ? `You've already learned ${dailyNewCardLimit} new cards in this topic (or ${globalNewCardLimit} total) within the last 12 hours. Check back soon!`
          : `You've hit your limit of ${globalNewCardLimit} new cards across all topics in the last 12 hours. Check back soon!`;
      } else {
        emptyMsg = 'No new cards available in this topic. Add some cards or pick a different mode.';
      }
    } else if (mode === 'review') {
      emptyMsg = 'Nothing due to review right now. Come back later!';
    } else if (mode === 'cram') {
      emptyMsg = 'No cards found. Add some cards first!';
    } else if (mode === 'smart') {
      emptyMsg = 'Nothing to study right now — no overdue, due, or new cards available.';
    } else {
      emptyMsg = 'No cards matched this study mode.';
    }
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="card p-8">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-accent" />
          <h2 className="text-2xl font-heading font-bold text-text-primary mb-2">{emptyTitle}</h2>
          <p className="text-text-secondary mb-6">{emptyMsg}</p>
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
    const handleTypingSubmit = (result: 'correct' | 'wrong') => {
      setTypingResult(result);
      handleGrade(result);
    };

    return (
      <div className="max-w-5xl mx-auto px-2 sm:px-4">
        <StudyProgress
          topicName={selectedTopic?.name}
          currentIndex={currentIndex}
          total={queue.length}
          stats={stats}
          mode={mode}
          onEndSession={() => { setSessionActive(false); setSessionComplete(false); }}
        />

        {gradeError && (
          <div className="card border-error/40 bg-error/[0.06] p-3 mb-3 flex items-center gap-2 text-sm text-error">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{gradeError}</span>
            <button onClick={() => setGradeError(null)} className="text-xs text-error/70 hover:text-error px-2 py-0.5">
              Dismiss
            </button>
          </div>
        )}

        {/* 3D Flip Card */}
        <div
          className="cursor-pointer select-none"
          style={{ perspective: '1200px' }}
          onClick={() => setFlipped(!flipped)}
        >
          <div
            className="relative transition-transform duration-300 ease-in-out min-h-[350px] sm:min-h-[500px]"
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

              {/* Front content */}
              <div className="flex-1 overflow-y-auto flex flex-col justify-center space-y-3 min-h-[80px] text-center">
                {(() => {
                  const isCloze = (currentCard.card_type || 'standard') === 'cloze';
                  const hasImg = currentCard.front.media_blocks.some(b => b.block_type === 'image' || b.block_type === 'video');
                  return currentCard.front.media_blocks.map((block) => {
                    if (isCloze && block.block_type === 'text' && block.text_content) {
                      const text = block.text_content;
                      const textClass = hasImg ? 'text-[13px] sm:text-sm leading-snug' : text.length > 200 ? 'text-sm sm:text-base leading-snug' : 'text-base sm:text-lg leading-relaxed';
                      return (
                        <div key={block.id} className="w-full">
                          <div className={`${textClass} text-text-primary`}>
                            <ClozeText text={text} revealed={false} />
                          </div>
                        </div>
                      );
                    }
                    return <MediaBlockRenderer key={block.id} block={block} hasImage={hasImg} />;
                  });
                })()}
              </div>

              {/* Bottom area: typing input or tap-to-flip hint */}
              {(currentCard.card_type || 'standard') === 'typing' && !flipped ? (
                <TypingAnswer
                  card={currentCard}
                  typingInput={typingInput}
                  typingResult={typingResult}
                  onInputChange={setTypingInput}
                  onSubmit={handleTypingSubmit}
                />
              ) : (
                <div className="text-center mt-2 shrink-0">
                  <span className="text-xs text-text-tertiary">tap to flip</span>
                </div>
              )}
            </div>

            {/* BACK FACE */}
            <div
              className="card p-4 sm:p-6 absolute inset-0 flex flex-col"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="text-xs uppercase tracking-wider text-text-tertiary mb-2 text-center shrink-0">Answer</div>

              {/* Back content */}
              <div className="flex-1 overflow-y-auto flex flex-col items-start space-y-3 min-h-[80px]">
                {(() => {
                  const isCloze = (currentCard.card_type || 'standard') === 'cloze';
                  const hasImg = currentCard.back.media_blocks.some(b => b.block_type === 'image' || b.block_type === 'video');
                  if (isCloze) {
                    return currentCard.front.media_blocks.map((block) => {
                      if (block.block_type === 'text' && block.text_content) {
                        const text = block.text_content;
                        const textClass = hasImg ? 'text-[13px] sm:text-sm leading-snug' : text.length > 200 ? 'text-sm sm:text-base leading-snug' : 'text-base sm:text-lg leading-relaxed';
                        return (
                          <div key={block.id} className="w-full">
                            <div className={`${textClass} text-text-primary`}>
                              <ClozeText text={text} revealed={true} />
                            </div>
                          </div>
                        );
                      }
                      return <MediaBlockRenderer key={block.id} block={block} hasImage={hasImg} />;
                    });
                  }
                  return currentCard.back.media_blocks.map((block) => (
                    <MediaBlockRenderer key={block.id} block={block} hasImage={hasImg} />
                  ));
                })()}
              </div>

              {/* Correct / Wrong buttons — hidden for typing cards */}
              {(currentCard.card_type || 'standard') !== 'typing' && (
                <StudyControls onGrade={handleGrade} grading={grading} />
              )}
            </div>
          </div>
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-xs text-text-tertiary mt-4 hidden sm:block">
          Space = flip • 1 = wrong • 2 = correct
        </p>
        <p className="text-center text-xs text-text-tertiary mt-3 sm:hidden">
          Tap card to flip • Grade your answer
        </p>
      </div>
    );
  }

  // --- SESSION LAUNCHER ---
  return (
    <div className="max-w-6xl mx-auto pb-40">
      <div className="text-center mb-6">
        <GraduationCap className="w-10 h-10 mx-auto mb-2 text-accent" />
        <h2 className="text-2xl font-heading font-bold text-text-primary">Study Session</h2>
        <p className="text-text-secondary mt-1 text-sm">
          {selectedTopic ? `Filtered: ${selectedTopic.name}` : 'Tap a tranche to expand, tap cards to select'}
        </p>
      </div>

      <TrancheDashboard
        dailyNewCardLimit={dailyNewCardLimit}
        globalNewCardLimit={globalNewCardLimit}
        topicId={selectedTopicId}
        onStartSelected={(ids) => startSession(ids)}
      />

      <div className="border-t border-border/40 my-6" />

      {/* Quick Add Card */}
      <QuickAddCard />

      {decayMessage && (
        <div className="card border-warning/30 bg-warning/[0.05] p-3 mb-4 flex items-center gap-2 text-sm text-warning">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {decayMessage}
        </div>
      )}

      <div className="border-t border-border/40 my-6" />

      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { id: 'smart' as StudyMode, label: 'Smart Session', desc: 'Auto-balanced review + new cards', icon: Zap },
          { id: 'review' as StudyMode, label: 'Review Due', desc: 'Cards you\'ve studied that need review', icon: Clock },
          { id: 'new' as StudyMode, label: 'Learn New', desc: `Introduce up to ${dailyNewCardLimit} new cards`, icon: GraduationCap },
          { id: 'cram' as StudyMode, label: 'Cram', desc: 'All cards, weakest first — no SR changes', icon: Flame },
          { id: 'pipeline' as StudyMode, label: 'Ahead of Schedule', desc: 'Practice upcoming cards (sandbox)', icon: Play },
        ].map(({ id, label, desc, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`card text-left p-4 transition-all ${
              mode === id ? 'border-accent/40 bg-accent/5' : 'hover:border-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-accent" />
              <span className="font-medium text-text-primary text-sm">{label}</span>
            </div>
            <p className="text-xs text-text-tertiary">{desc}</p>
          </button>
        ))}
      </div>

      {mode === 'new' && !selectedTopicId ? (
        <div className="text-center text-text-secondary text-sm py-4 border border-border/60 rounded-lg bg-surface-base">
          Select a topic from the sidebar to learn new cards.
        </div>
      ) : (
        <button
          onClick={() => startSession()}
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
      )}
    </div>
  );
}
