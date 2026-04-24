/**
 * Two-stage delete confirmation: archive (deactivate) or permanently delete.
 * Adapted from Grid Wars DeleteConfirmModal.
 */
import { useState } from 'react';

interface Props {
  itemName: string;
  itemType: 'card' | 'set' | 'topic';
  onArchive?: () => void;
  onDelete: () => void;
  onCancel: () => void;
  hideArchive?: boolean;
  // Number of child records that will be cascade-deleted (e.g. cards under a topic).
  // When set, shown prominently. When above typedConfirmThreshold, the delete
  // button is gated behind typing "DELETE".
  cardCount?: number;
  typedConfirmThreshold?: number;
}

export function DeleteConfirmModal({
  itemName,
  itemType,
  onArchive,
  onDelete,
  onCancel,
  hideArchive,
  cardCount,
  typedConfirmThreshold = 20,
}: Props) {
  const showArchive = !hideArchive && onArchive;
  const requireTyped = typeof cardCount === 'number' && cardCount >= typedConfirmThreshold;
  const [typed, setTyped] = useState('');
  const typedOk = !requireTyped || typed.trim().toUpperCase() === 'DELETE';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-[420px] bg-surface border border-border rounded-modal shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-red-500/30 bg-red-500/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <span className="text-red-400 text-sm font-bold">!</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-100">
                {showArchive ? `Remove ${itemType}` : `Delete ${itemType}`}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[300px]">
                "{itemName}"
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            {showArchive ? (
              <>Would you like to <strong className="text-amber-400">deactivate</strong> this {itemType}
              {' '}(hide from study sessions, keep data) or <strong className="text-red-400">permanently delete</strong> it?</>
            ) : (
              <>Are you sure you want to <strong className="text-red-400">permanently delete</strong> this {itemType}? This cannot be undone.</>
            )}
          </p>

          {typeof cardCount === 'number' && cardCount > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/[0.08] px-3 py-2 text-[11px] text-red-300">
              This will also permanently delete <strong className="font-semibold">{cardCount.toLocaleString()}</strong>{' '}
              card{cardCount === 1 ? '' : 's'} and all their review history.
            </div>
          )}

          {requireTyped && (
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">
                Type <strong className="text-red-400">DELETE</strong> to confirm
              </span>
              <input
                autoFocus
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="DELETE"
                className="mt-1 w-full bg-surface-base border border-border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/40 focus:outline-none"
              />
            </label>
          )}

          {/* Archive option */}
          {showArchive && (
            <button
              onClick={onArchive}
              className="w-full text-left p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-amber-400 text-lg">📦</span>
                <div>
                  <div className="text-xs font-semibold text-amber-400 group-hover:text-amber-300">
                    Deactivate
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Hides from study sessions. SR progress is preserved. Can be reactivated later.
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Delete option */}
          <button
            onClick={onDelete}
            disabled={!typedOk}
            className="w-full text-left p-3 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500/5"
          >
            <div className="flex items-center gap-3">
              <span className="text-red-400 text-lg">🗑</span>
              <div>
                <div className="text-xs font-semibold text-red-400 group-hover:text-red-300">
                  Delete Permanently
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Cannot be undone. All review history for this {itemType} will be lost.
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
