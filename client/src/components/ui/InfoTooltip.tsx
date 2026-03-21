import { useState, useRef, useEffect, useCallback } from 'react';
import defs, { type TooltipDef } from '../../utils/tooltipDefinitions';

/**
 * Small ⓘ icon that shows a rich tooltip on hover/focus.
 * Reads from centralized tooltipDefinitions dictionary.
 * Adapted from Grid Wars InfoTooltip.
 */
export function InfoTooltip({ fieldId }: { fieldId: string }) {
  const tip = defs[fieldId];
  if (!tip) return null;
  return <TooltipIcon tip={tip} />;
}

/** Inline variant that accepts a definition directly */
export function InfoTooltipInline({ tip }: { tip: TooltipDef }) {
  return <TooltipIcon tip={tip} />;
}

function TooltipIcon({ tip }: { tip: TooltipDef }) {
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const iconRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setAbove(rect.bottom + 280 > window.innerHeight);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const show = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, []);

  const hasExtended = !!(tip.formula || tip.example || tip.impact || tip.note);

  return (
    <span className="relative inline-flex items-center ml-1.5">
      <button
        ref={iconRef}
        type="button"
        tabIndex={0}
        aria-label="More info"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="w-3.5 h-3.5 rounded-full border border-gray-600/40 text-gray-500 hover:text-accent hover:border-accent/60 flex items-center justify-center transition-colors cursor-help text-[9px] font-bold leading-none"
      >
        i
      </button>

      {open && (
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
          className={`absolute z-50 ${hasExtended ? 'w-[340px]' : 'w-64'} p-3 rounded-lg border border-border bg-surface shadow-lg shadow-black/40 text-[11px] leading-relaxed ${
            above ? 'bottom-6 mb-1' : 'top-6 mt-1'
          } left-1/2 -translate-x-1/2`}
        >
          {/* Arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-border bg-surface ${
              above
                ? 'bottom-[-5px] border-r border-b'
                : 'top-[-5px] border-l border-t'
            }`}
          />

          <p className="text-gray-200 font-medium mb-1.5">{tip.definition}</p>

          {tip.formula && (
            <div className="mt-2 pt-1.5 border-t border-border/50">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-accent mb-1">Formula</p>
              <pre className="text-[11px] font-mono text-amber-400/80 whitespace-pre-wrap leading-relaxed">{tip.formula}</pre>
            </div>
          )}

          {tip.example && (
            <div className="mt-2 pt-1.5 border-t border-border/50">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-accent mb-1">Example</p>
              <pre className="text-[11px] font-mono text-amber-400/80 whitespace-pre-wrap leading-relaxed">{tip.example}</pre>
            </div>
          )}

          {tip.impact && (
            <div className="mt-2 pt-1.5 border-t border-border/50">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-400 mb-1">Impact</p>
              <p className="text-gray-400">{tip.impact}</p>
            </div>
          )}

          {tip.note && (
            <div className="mt-2 pt-1.5 border-t border-border/50">
              <p className="text-gray-500 italic text-[11px]">{tip.note}</p>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
