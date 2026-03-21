import { useState, useCallback, type ReactNode } from 'react';

/**
 * Multi-step wizard with completion tracking, jump-to-step navigation,
 * and animated step indicators.
 * Adapted from Grid Wars StepWizard.
 */

export interface WizardStep {
  id: string;
  label: string;
  shortLabel?: string;
  isComplete?: () => boolean;
  content: ReactNode;
}

interface StepWizardProps {
  steps: WizardStep[];
  allowJump?: boolean;
  onComplete?: () => void;
  className?: string;
}

export function StepWizard({
  steps,
  allowJump = true,
  onComplete,
  className = '',
}: StepWizardProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= steps.length) return;
      if (idx > currentIdx && !allowJump) {
        for (let i = 0; i <= currentIdx; i++) {
          if (steps[i].isComplete && !steps[i].isComplete!()) return;
        }
      }
      setCurrentIdx(idx);
    },
    [currentIdx, steps, allowJump],
  );

  const currentStep = steps[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === steps.length - 1;

  return (
    <div className={className}>
      {/* Step indicator bar */}
      <div className="flex items-center mb-6 px-1">
        {steps.map((step, idx) => {
          const pastComplete = idx < currentIdx;
          const active = idx === currentIdx;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => {
                  if (allowJump || idx <= currentIdx) goTo(idx);
                }}
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200
                  ${pastComplete
                    ? 'bg-emerald-500 text-white cursor-pointer hover:bg-emerald-400'
                    : active
                      ? 'bg-accent text-white ring-2 ring-accent/30'
                      : 'bg-surface-elevated border border-border text-gray-500'
                  }
                  ${allowJump && idx <= currentIdx ? 'cursor-pointer' : idx > currentIdx ? 'cursor-default' : 'cursor-pointer'}
                `}
                title={step.label}
              >
                {pastComplete ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </button>

              <div className="ml-2 mr-3 hidden sm:block">
                <div className={`text-[11px] font-semibold leading-tight ${
                  active ? 'text-accent' : pastComplete ? 'text-emerald-400' : 'text-gray-500'
                }`}>
                  Step {idx + 1}
                </div>
                <div className={`text-[10px] leading-tight ${
                  active ? 'text-gray-200' : 'text-gray-500/70'
                }`}>
                  {step.shortLabel ?? step.label}
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex-1 mx-1">
                  <div className={`h-0.5 rounded-full transition-colors duration-300 ${
                    pastComplete ? 'bg-emerald-500' : 'bg-border/50'
                  }`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[200px]">
        {currentStep.content}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
        <button
          type="button"
          onClick={() => goTo(currentIdx - 1)}
          disabled={isFirst}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            isFirst
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-gray-200 hover:bg-surface-elevated'
          }`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-1.5">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                idx === currentIdx ? 'bg-accent' : idx < currentIdx ? 'bg-emerald-500' : 'bg-border/50'
              }`}
            />
          ))}
        </div>

        {isLast ? (
          onComplete ? (
            <button
              type="button"
              onClick={onComplete}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
            >
              Done
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          ) : (
            <div className="w-20" />
          )
        ) : (
          <button
            type="button"
            onClick={() => goTo(currentIdx + 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors"
          >
            Next
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
