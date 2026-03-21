import { useState, useRef, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * Numeric input with stepper buttons and optional slider.
 * Adapted from Grid Wars NumericInput.
 */
interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showSlider?: boolean;
  compact?: boolean;
  className?: string;
}

export function NumericInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
  showSlider = false,
  compact = false,
  className = '',
}: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const clamp = useCallback(
    (v: number) => Math.min(max, Math.max(min, v)),
    [min, max]
  );

  const increment = () => onChange(clamp(value + step));
  const decrement = () => onChange(clamp(value - step));

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.-]/g, '');
    if (raw === '' || raw === '-') return;
    onChange(clamp(Number(raw)));
  };

  const displayValue = step < 1 ? value.toFixed(1) : value.toLocaleString();

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="text-xs text-gray-400 min-w-[80px]">{label}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={decrement}
            disabled={value <= min}
            className="w-6 h-6 rounded bg-surface-elevated border border-border hover:bg-surface flex items-center justify-center disabled:opacity-30 transition-colors"
          >
            <Minus className="w-3 h-3 text-gray-400" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={focused ? value : displayValue}
            onChange={handleInput}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-14 text-center bg-surface-base border border-border rounded px-1 py-0.5 text-xs font-mono text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="button"
            onClick={increment}
            disabled={value >= max}
            className="w-6 h-6 rounded bg-surface-elevated border border-border hover:bg-surface flex items-center justify-center disabled:opacity-30 transition-colors"
          >
            <Plus className="w-3 h-3 text-gray-400" />
          </button>
          {unit && <span className="text-[10px] text-gray-500">{unit}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="w-8 h-8 rounded-lg bg-surface-elevated border border-border hover:bg-surface flex items-center justify-center disabled:opacity-30 transition-colors"
        >
          <Minus className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={focused ? value : displayValue}
          onChange={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 text-center bg-surface-base border border-border rounded-lg px-2 py-1.5 text-sm font-mono text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          className="w-8 h-8 rounded-lg bg-surface-elevated border border-border hover:bg-surface flex items-center justify-center disabled:opacity-30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-gray-400" />
        </button>
        {unit && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
      </div>
      {showSlider && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full mt-2 accent-accent h-1 bg-surface-elevated rounded-full appearance-none cursor-pointer"
        />
      )}
    </div>
  );
}
