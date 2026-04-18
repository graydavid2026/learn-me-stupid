import { useRef } from 'react';
import { CardFull } from '../../stores/useStore';
import { isCloseEnough, getExpectedAnswer } from './StudyCard';

interface TypingAnswerProps {
  card: CardFull;
  typingInput: string;
  typingResult: 'correct' | 'wrong' | null;
  onInputChange: (value: string) => void;
  onSubmit: (result: 'correct' | 'wrong') => void;
}

export function TypingAnswer({ card, typingInput, typingResult, onInputChange, onSubmit }: TypingAnswerProps) {
  const typingInputRef = useRef<HTMLInputElement>(null);

  const handleCheck = () => {
    if (!typingInput.trim()) return;
    const expected = getExpectedAnswer(card);
    const correct = isCloseEnough(typingInput, expected);
    onSubmit(correct ? 'correct' : 'wrong');
  };

  if (typingResult !== null) {
    return (
      <div className="mt-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <div className={`text-center py-2 rounded-lg font-medium ${typingResult === 'correct' ? 'bg-success/20 text-success border border-success/30' : 'bg-error/20 text-error border border-error/30'}`}>
            {typingResult === 'correct' ? 'Correct!' : `Wrong — the answer was: ${getExpectedAnswer(card)}`}
          </div>
          <div className="text-xs text-text-tertiary text-center">Your answer: {typingInput}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 shrink-0" onClick={(e) => e.stopPropagation()}>
      <div className="flex gap-2">
        <input
          ref={typingInputRef}
          type="text"
          value={typingInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && typingInput.trim()) {
              handleCheck();
            }
          }}
          placeholder="Type your answer..."
          className="flex-1 bg-surface-base border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none"
          autoFocus
        />
        <button
          onClick={handleCheck}
          className="px-4 py-2.5 bg-accent/20 text-accent border border-accent/30 rounded-lg font-medium text-sm hover:bg-accent/30 transition-colors"
        >
          Check
        </button>
      </div>
    </div>
  );
}
