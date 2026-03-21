/**
 * Two-stage delete confirmation: archive (deactivate) or permanently delete.
 * Adapted from Grid Wars DeleteConfirmModal.
 */
interface Props {
  itemName: string;
  itemType: 'card' | 'set' | 'topic';
  onArchive?: () => void;
  onDelete: () => void;
  onCancel: () => void;
  hideArchive?: boolean;
}

export function DeleteConfirmModal({ itemName, itemType, onArchive, onDelete, onCancel, hideArchive }: Props) {
  const showArchive = !hideArchive && onArchive;

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
            className="w-full text-left p-3 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors group"
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
