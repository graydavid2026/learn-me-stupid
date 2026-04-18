import { Check, X } from 'lucide-react';

interface StudyControlsProps {
  onGrade: (result: 'correct' | 'wrong') => void;
  grading: boolean;
}

export function StudyControls({ onGrade, grading }: StudyControlsProps) {
  return (
    <div className="border-t border-border/50 mt-3 pt-3 shrink-0">
      <div className="flex gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onGrade('wrong'); }}
          disabled={grading}
          className={`flex-1 bg-error/12 hover:bg-error/20 active:bg-error/28 text-error border border-error/20 hover:border-error/35 px-4 py-4 sm:py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.97] ${grading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <X className="w-5 h-5" />
          Wrong
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onGrade('correct'); }}
          disabled={grading}
          className={`flex-1 bg-success/12 hover:bg-success/20 active:bg-success/28 text-success border border-success/20 hover:border-success/35 px-4 py-4 sm:py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.97] ${grading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Check className="w-5 h-5" />
          Correct
        </button>
      </div>
    </div>
  );
}
