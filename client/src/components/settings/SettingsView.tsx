import { useEffect, useState } from 'react';
import { Volume2, Mic, Settings as SettingsIcon, AlertTriangle, Sparkles, Copy, Check } from 'lucide-react';
import { useStore } from '../../stores/useStore';

const SR_SUPPORTED =
  typeof window !== 'undefined' &&
  !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
const TTS_SUPPORTED = typeof window !== 'undefined' && !!window.speechSynthesis;

export function SettingsView() {
  const ttsEnabled = useStore((s) => s.ttsEnabled);
  const setTtsEnabled = useStore((s) => s.setTtsEnabled);
  const voiceCmdEnabled = useStore((s) => s.voiceCmdEnabled);
  const setVoiceCmdEnabled = useStore((s) => s.setVoiceCmdEnabled);
  const topics = useStore((s) => s.topics);
  const fetchTopics = useStore((s) => s.fetchTopics);

  const [copiedTopicId, setCopiedTopicId] = useState<string | null>(null);
  const [loadingTopicId, setLoadingTopicId] = useState<string | null>(null);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  const copyPromptForTopic = async (topicId: string) => {
    setLoadingTopicId(topicId);
    try {
      const res = await fetch(`/api/topics/${topicId}/prompt`);
      if (!res.ok) throw new Error('Request failed');
      const { prompt } = await res.json();
      await navigator.clipboard.writeText(prompt);
      setCopiedTopicId(topicId);
      setTimeout(() => setCopiedTopicId(null), 2500);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      alert('Failed to generate prompt. Check the console.');
    } finally {
      setLoadingTopicId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-heading font-bold text-white">Settings</h1>
      </div>

      {/* Read aloud */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3">
          <Volume2 className={`w-5 h-5 shrink-0 ${ttsEnabled ? 'text-accent' : 'text-gray-500'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium text-white">Read cards aloud</div>
            <div className="text-xs text-gray-500">
              Speaks the front when a card appears, then the back when flipped.
              Language is detected automatically per word.
            </div>
          </div>
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            role="switch"
            aria-checked={ttsEnabled}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              ttsEnabled ? 'bg-accent' : 'bg-surface-elevated border border-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                ttsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Voice commands */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Mic className={`w-5 h-5 shrink-0 ${voiceCmdEnabled ? 'text-accent' : 'text-gray-500'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium text-white">Voice commands</div>
            <div className="text-xs text-gray-500">Control the study session hands-free with your voice.</div>
          </div>
          <button
            onClick={() => setVoiceCmdEnabled(!voiceCmdEnabled)}
            role="switch"
            aria-checked={voiceCmdEnabled}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              voiceCmdEnabled ? 'bg-accent' : 'bg-surface-elevated border border-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                voiceCmdEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className="bg-surface-base rounded-lg p-3 mt-3 space-y-1.5">
          <div className="text-xs text-gray-400 mb-1 font-semibold">Commands</div>
          <div className="text-xs text-gray-300 flex justify-between"><span className="font-mono">"flip card"</span><span className="text-gray-500">show the back</span></div>
          <div className="text-xs text-gray-300 flex justify-between"><span className="font-mono">"repeat"</span><span className="text-gray-500">read current side again</span></div>
          <div className="text-xs text-gray-300 flex justify-between"><span className="font-mono">"next card"</span><span className="text-gray-500">skip to next</span></div>
          <div className="text-xs text-gray-300 flex justify-between"><span className="font-mono">"correct"</span><span className="text-gray-500">grade correct</span></div>
          <div className="text-xs text-gray-300 flex justify-between"><span className="font-mono">"wrong"</span><span className="text-gray-500">grade wrong</span></div>
          <div className="text-xs text-gray-300 flex justify-between"><span className="font-mono">"end session"</span><span className="text-gray-500">exit the session</span></div>
        </div>
        <div className="text-[11px] text-gray-500 mt-2">
          Works on Chrome / Edge (desktop & Android). Not supported on iOS Safari or Firefox. Requires microphone permission and HTTPS.
        </div>
        {!SR_SUPPORTED && (
          <div className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300">
              Voice commands aren't supported in this browser. Open this page in Chrome or Edge on desktop or Android to enable.
            </div>
          </div>
        )}
        {!TTS_SUPPORTED && (
          <div className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300">
              Read-aloud isn't supported in this browser.
            </div>
          </div>
        )}
      </div>

      {/* Card-generation prompts per topic */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-5 h-5 shrink-0 text-accent" />
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium text-white">Card generation prompts</div>
            <div className="text-xs text-gray-500">
              Copy a topic-specific prompt to paste into an LLM. It includes
              existing cards as style examples and asks for output in both
              copy-paste and JSON-for-Claude-Code formats.
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {topics.length === 0 && (
            <div className="text-xs text-gray-500 italic">No topics yet. Create a topic first.</div>
          )}
          {topics.map((t) => {
            const isLoading = loadingTopicId === t.id;
            const isCopied = copiedTopicId === t.id;
            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 bg-surface-base border border-border rounded-lg px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{t.name}</div>
                  <div className="text-[11px] text-gray-500">
                    {t.card_count} {t.card_count === 1 ? 'card' : 'cards'}
                  </div>
                </div>
                <button
                  onClick={() => copyPromptForTopic(t.id)}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    isCopied
                      ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                      : 'bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25'
                  } disabled:opacity-50`}
                >
                  {isLoading ? (
                    'Loading...'
                  ) : isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy prompt
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
