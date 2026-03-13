import { useStore } from '../../stores/useStore';
import { useEffect, useState } from 'react';
import { Plus, FolderOpen, Trash2, Check, X, Pencil } from 'lucide-react';

export function CardsView() {
  const { selectedTopicId, topics, cardSets, loadingSets, fetchCardSets, createCardSet, updateCardSet, deleteCardSet } = useStore();
  const [creatingSet, setCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  useEffect(() => {
    if (selectedTopicId) fetchCardSets(selectedTopicId);
  }, [selectedTopicId, fetchCardSets]);

  if (!selectedTopicId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <FolderOpen className="w-16 h-16 mb-4 text-gray-600" />
        <p className="text-lg font-medium">Select a topic to manage cards</p>
        <p className="text-sm mt-1">Use the dropdown above to choose a topic</p>
      </div>
    );
  }

  const handleCreateSet = async () => {
    if (newSetName.trim() && selectedTopicId) {
      await createCardSet(selectedTopicId, { name: newSetName.trim() });
      setNewSetName('');
      setCreatingSet(false);
    }
  };

  const handleUpdateSet = async (id: string) => {
    if (editName.trim()) {
      await updateCardSet(id, { name: editName.trim() });
      setEditingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">
            {selectedTopic?.name}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {cardSets.length} card set{cardSets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setCreatingSet(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Set
        </button>
      </div>

      {creatingSet && (
        <div className="card mb-4 flex items-center gap-2">
          <input
            autoFocus
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateSet();
              if (e.key === 'Escape') { setCreatingSet(false); setNewSetName(''); }
            }}
            placeholder="Card set name..."
            className="flex-1 input"
          />
          <button onClick={handleCreateSet} className="p-2 text-green-400 hover:text-green-300">
            <Check className="w-5 h-5" />
          </button>
          <button onClick={() => { setCreatingSet(false); setNewSetName(''); }} className="p-2 text-gray-400 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {loadingSets ? (
        <div className="text-gray-400 text-center py-12">Loading sets...</div>
      ) : cardSets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="font-medium">No card sets yet</p>
          <p className="text-sm mt-1">Create your first set to start adding cards</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {cardSets.map((set) => (
            <div key={set.id} className="card flex items-center justify-between group hover:border-accent/30 transition-colors">
              {editingId === set.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateSet(set.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 input"
                  />
                  <button onClick={() => handleUpdateSet(set.id)} className="p-1.5 text-green-400 hover:text-green-300">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-accent" />
                    <div>
                      <h3 className="font-medium text-white">{set.name}</h3>
                      {set.description && <p className="text-sm text-gray-400">{set.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 font-mono">{set.card_count} cards</span>
                    {set.due_count > 0 && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono">
                        {set.due_count} due
                      </span>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(set.id); setEditName(set.name); }}
                        className="p-1.5 text-gray-400 hover:text-gray-200"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${set.name}" and all its cards?`)) deleteCardSet(set.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
