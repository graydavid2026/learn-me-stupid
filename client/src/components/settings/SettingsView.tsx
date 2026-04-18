import { useEffect, useState, useRef } from 'react';
import { Volume2, Mic, Settings as SettingsIcon, AlertTriangle, Sparkles, Copy, Check, Shuffle, GraduationCap, Download, Upload, Database, BookOpen, ChevronDown } from 'lucide-react';
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
  const dailyNewCardLimit = useStore((s) => s.dailyNewCardLimit);
  const setDailyNewCardLimit = useStore((s) => s.setDailyNewCardLimit);
  const topics = useStore((s) => s.topics);
  const fetchTopics = useStore((s) => s.fetchTopics);
  const newCardOrder = useStore((s) => s.newCardOrder);
  const setNewCardOrder = useStore((s) => s.setNewCardOrder);

  const [copiedTopicId, setCopiedTopicId] = useState<string | null>(null);
  const [loadingTopicId, setLoadingTopicId] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  const downloadFile = async (url: string, setLoading: (v: boolean) => void) => {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match ? match[1] : 'export';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Check the console.');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Importing...');
    try {
      const text = await file.text();
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const msg = `Imported ${data.imported} card${data.imported !== 1 ? 's' : ''}`;
      setImportStatus(data.errors?.length ? `${msg} (${data.errors.length} warnings)` : msg);
      fetchTopics();
    } catch (err: any) {
      setImportStatus(`Error: ${err.message}`);
    }
    if (csvFileRef.current) csvFileRef.current.value = '';
  };

  const handleJsonImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Importing...');
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/import/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setImportStatus(`Imported ${data.imported} card${data.imported !== 1 ? 's' : ''}${data.skipped ? `, ${data.skipped} skipped` : ''}`);
      fetchTopics();
    } catch (err: any) {
      setImportStatus(`Error: ${err.message}`);
    }
    if (jsonFileRef.current) jsonFileRef.current.value = '';
  };

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
        <h1 className="text-2xl font-heading font-bold text-text-primary">Settings</h1>
      </div>

      {/* Read aloud */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3">
          <Volume2 className={`w-5 h-5 shrink-0 ${ttsEnabled ? 'text-accent' : 'text-text-tertiary'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium text-text-primary">Read cards aloud</div>
            <div className="text-xs text-text-tertiary">
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

      {/* Daily new-card limit */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-5 h-5 shrink-0 text-accent" />
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium text-text-primary">New cards per day</div>
            <div className="text-xs text-text-tertiary">
              Cap how many brand-new cards you'll learn in a day across all topics. When the cap is hit, the
              study session asks you to review upcoming cards early instead.
            </div>
          </div>
          <input
            type="number"
            min={0}
            max={20}
            value={dailyNewCardLimit}
            onChange={(e) => setDailyNewCardLimit(Number(e.target.value))}
            className="w-20 bg-surface-base border border-border rounded-lg px-3 py-2 text-text-primary text-center text-lg font-mono focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Voice commands */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Mic className={`w-5 h-5 shrink-0 ${voiceCmdEnabled ? 'text-accent' : 'text-text-tertiary'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium text-text-primary">Voice commands</div>
            <div className="text-xs text-text-tertiary">Control the study session hands-free with your voice.</div>
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
          <div className="text-xs text-text-secondary mb-1 font-semibold">Commands</div>
          <div className="text-xs text-text-primary flex justify-between"><span className="font-mono">"flip card"</span><span className="text-text-tertiary">show the back</span></div>
          <div className="text-xs text-text-primary flex justify-between"><span className="font-mono">"repeat"</span><span className="text-text-tertiary">read current side again</span></div>
          <div className="text-xs text-text-primary flex justify-between"><span className="font-mono">"next card"</span><span className="text-text-tertiary">skip to next</span></div>
          <div className="text-xs text-text-primary flex justify-between"><span className="font-mono">"correct"</span><span className="text-text-tertiary">grade correct</span></div>
          <div className="text-xs text-text-primary flex justify-between"><span className="font-mono">"wrong"</span><span className="text-text-tertiary">grade wrong</span></div>
          <div className="text-xs text-text-primary flex justify-between"><span className="font-mono">"end session"</span><span className="text-text-tertiary">exit the session</span></div>
        </div>
        <div className="text-[11px] text-text-tertiary mt-2">
          Works on Chrome / Edge (desktop & Android). Not supported on iOS Safari or Firefox. Requires microphone permission and HTTPS.
        </div>
        {!SR_SUPPORTED && (
          <div className="mt-3 flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="text-xs text-warning">
              Voice commands aren't supported in this browser. Open this page in Chrome or Edge on desktop or Android to enable.
            </div>
          </div>
        )}
        {!TTS_SUPPORTED && (
          <div className="mt-3 flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="text-xs text-warning">
              Read-aloud isn't supported in this browser.
            </div>
          </div>
        )}
      </div>

      {/* New-card draw order per topic */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Shuffle className="w-5 h-5 shrink-0 text-accent" />
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium text-text-primary">New card order</div>
            <div className="text-xs text-text-tertiary">
              Choose how "Learn New" picks cards for each topic. Random samples
              across your whole new-card pool; In Order uses the sequence you
              created cards in.
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {topics.length === 0 && (
            <div className="text-xs text-text-tertiary italic">No topics yet.</div>
          )}
          {topics.map((t) => {
            const current = newCardOrder[t.id] || 'entered';
            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 bg-surface-base border border-border rounded-lg px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text-primary truncate">{t.name}</div>
                </div>
                <div className="inline-flex rounded-lg border border-border overflow-hidden shrink-0">
                  <button
                    onClick={() => setNewCardOrder(t.id, 'entered')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      current === 'entered'
                        ? 'bg-accent/20 text-accent'
                        : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    In Order
                  </button>
                  <button
                    onClick={() => setNewCardOrder(t.id, 'random')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                      current === 'random'
                        ? 'bg-accent/20 text-accent'
                        : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Random
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card-generation prompts per topic */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-5 h-5 shrink-0 text-accent" />
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium text-text-primary">Card generation prompts</div>
            <div className="text-xs text-text-tertiary">
              Copy a topic-specific prompt to paste into an LLM. It includes
              existing cards as style examples and asks for output in both
              copy-paste and JSON-for-Claude-Code formats.
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {topics.length === 0 && (
            <div className="text-xs text-text-tertiary italic">No topics yet. Create a topic first.</div>
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
                  <div className="text-sm text-text-primary truncate">{t.name}</div>
                  <div className="text-[11px] text-text-tertiary">
                    {t.card_count} {t.card_count === 1 ? 'card' : 'cards'}
                  </div>
                </div>
                <button
                  onClick={() => copyPromptForTopic(t.id)}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    isCopied
                      ? 'bg-success/20 text-success border border-success/40'
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

      {/* Data & Backup */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Database className="w-5 h-5 shrink-0 text-accent" />
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium text-text-primary">Data & Backup</div>
            <div className="text-xs text-text-tertiary">
              Download all your cards and study progress. Your data is always portable.
            </div>
          </div>
        </div>

        {/* Export buttons */}
        <div className="space-y-2 mb-4">
          <button
            onClick={() => downloadFile('/api/export/csv', setExportingCsv)}
            disabled={exportingCsv}
            className="w-full flex items-center gap-3 bg-surface-base border border-border rounded-lg px-4 py-3 text-left hover:border-accent/50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary">Export as CSV</div>
              <div className="text-[11px] text-text-tertiary">Cards with text and SR progress. Opens in Excel/Sheets.</div>
            </div>
          </button>
          <button
            onClick={() => downloadFile('/api/export/json', setExportingJson)}
            disabled={exportingJson}
            className="w-full flex items-center gap-3 bg-surface-base border border-border rounded-lg px-4 py-3 text-left hover:border-accent/50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary">Export as JSON (full backup)</div>
              <div className="text-[11px] text-text-tertiary">Complete backup including all blocks, tags, and metadata.</div>
            </div>
          </button>
        </div>

        {/* Import buttons */}
        <div className="border-t border-border pt-3 space-y-2">
          <div className="text-xs text-text-tertiary mb-2">Import cards from a file</div>
          <input ref={csvFileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          <input ref={jsonFileRef} type="file" accept=".json" className="hidden" onChange={handleJsonImport} />
          <div className="flex gap-2">
            <button
              onClick={() => csvFileRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-elevated border border-border text-text-primary hover:text-text-primary hover:border-accent/50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </button>
            <button
              onClick={() => jsonFileRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-elevated border border-border text-text-primary hover:text-text-primary hover:border-accent/50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Import JSON
            </button>
          </div>
          {importStatus && (
            <div className={`text-xs mt-2 px-3 py-2 rounded-lg ${
              importStatus.startsWith('Error')
                ? 'bg-error/10 border border-error/30 text-error'
                : importStatus === 'Importing...'
                  ? 'bg-secondary/10 border border-secondary/30 text-secondary'
                  : 'bg-success/10 border border-success/30 text-success'
            }`}>
              {importStatus}
            </div>
          )}
        </div>
      </div>

      {/* How Spaced Repetition Works */}
      <CollapsibleSection
        icon={<BookOpen className="w-5 h-5 shrink-0 text-accent" />}
        title="How Spaced Repetition Works"
      >
        <div className="text-sm text-text-secondary leading-relaxed space-y-3">
          <p>
            Your brain forgets things on a predictable curve — the Ebbinghaus forgetting curve.
            Without review, you lose ~75% of new information within 48 hours.
          </p>
          <p>
            Spaced repetition fights this by scheduling reviews right before you'd forget.
            Each successful review doubles the interval. After 5-6 correct reviews,
            a card moves to long-term memory (months between reviews).
          </p>
          <div>
            <p className="font-semibold text-text-primary mb-1.5">How this app works:</p>
            <ul className="space-y-1 text-xs text-text-secondary list-disc list-inside">
              <li><span className="text-text-primary font-medium">New cards:</span> tested twice in your first session, then scheduled for tomorrow</li>
              <li><span className="text-text-primary font-medium">Each correct answer:</span> interval grows (1d → 3d → 1w → 2w → 1mo → ...)</li>
              <li><span className="text-text-primary font-medium">Wrong answers:</span> interval shrinks, card gets more practice</li>
              <li><span className="text-text-primary font-medium">Ease factor:</span> cards you struggle with get shorter intervals automatically</li>
              <li><span className="text-text-primary font-medium">Daily limits:</span> prevents overwhelm (2 new cards per topic, 8 total)</li>
            </ul>
          </div>
          <p className="text-xs text-text-tertiary italic border-t border-border pt-2">
            The key is consistency. One session per day, every day, beats
            cramming for hours once a week.
          </p>
        </div>
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-5 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3"
      >
        {icon}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-base font-medium text-text-primary">{title}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-4 pt-3 border-t border-border">{children}</div>}
    </div>
  );
}
