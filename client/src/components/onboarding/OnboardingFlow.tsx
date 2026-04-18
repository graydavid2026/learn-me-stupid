import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Layers, Plus, Zap, ArrowRight, X } from 'lucide-react';

const STORAGE_KEY = 'lms.onboardingComplete';

export function useOnboarding() {
  const [complete, setComplete] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    setComplete(true);
  };
  return { showOnboarding: !complete, dismiss };
}

const steps = [
  {
    title: 'Welcome to Learn Me Stupid',
    body: 'Your brain forgets things on a predictable curve. We schedule reviews right before you\'d forget, so you remember everything with minimum effort.',
    detail: 'This is spaced repetition — the most efficient memorization method backed by cognitive science.',
    icon: BookOpen,
  },
  {
    title: 'How it works',
    steps: [
      { icon: Layers, label: 'Create topics', desc: 'Organize your knowledge by subject' },
      { icon: Plus, label: 'Add cards', desc: 'Front and back, with images, audio, or video' },
      { icon: Zap, label: 'Study daily', desc: 'We tell you exactly what to review and when' },
    ],
  },
  {
    title: 'Ready to start',
    body: 'Create your first topic and add some cards. The system handles everything else.',
    cta: true,
  },
];

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const finish = () => {
    onComplete();
  };

  const finishAndGo = () => {
    onComplete();
    navigate('/cards');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="card max-w-md w-full p-6 sm:p-8 relative">
        {/* Skip button */}
        <button
          onClick={finish}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors p-1"
          aria-label="Skip onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-8 bg-accent' : i < step ? 'w-4 bg-accent/40' : 'w-4 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        {'icon' in current && current.icon && (
          <div className="flex justify-center mb-4">
            <current.icon className="w-12 h-12 text-accent" />
          </div>
        )}

        <h2 className="text-xl sm:text-2xl font-heading font-bold text-white text-center mb-3">
          {current.title}
        </h2>

        {'body' in current && current.body && (
          <p className="text-sm text-gray-400 text-center leading-relaxed mb-2">
            {current.body}
          </p>
        )}

        {'detail' in current && current.detail && (
          <p className="text-xs text-gray-500 text-center mb-4">
            {current.detail}
          </p>
        )}

        {'steps' in current && current.steps && (
          <div className="space-y-3 mt-4 mb-2">
            {current.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-3 bg-surface-base rounded-lg p-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors px-3 py-1.5"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {isLast && current.cta ? (
            <button
              onClick={finishAndGo}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              Create your first topic
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
