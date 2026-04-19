import { useStore, CardFull } from '../../stores/useStore';
import { useEffect, useState } from 'react';
import { Plus, FolderOpen, Trash2, Check, X, Pencil, ChevronRight, FileText, Layers, Play, Sparkles, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CardEditor } from './CardEditor';
import { AiCardGenerator } from './AiCardGenerator';
import { DeleteConfirmModal } from '../ui/DeleteConfirmModal';
import { SLOT_COLORS } from '../../utils/formatters';

function SlotDots({ slot }: { slot: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 13 }, (_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: i < slot ? SLOT_COLORS[slot] : '#2e3348' }}
        />
      ))}
    </div>
  );
}

function getCardPreview(card: CardFull): string {
  const frontText = card.front?.media_blocks?.find((b) => b.block_type === 'text');
  if (frontText?.text_content) return frontText.text_content.slice(0, 120);
  const frontMedia = card.front?.media_blocks?.[0];
  if (frontMedia) return `[${frontMedia.block_type}]`;
  return 'Empty card';
}

function getBackPreview(card: CardFull): string {
  const backText = card.back?.media_blocks?.find((b) => b.block_type === 'text');
  if (backText?.text_content) return backText.text_content.slice(0, 80);
  const backMedia = card.back?.media_blocks?.[0];
  if (backMedia) return `[${backMedia.block_type}]`;
  return '';
}

export function CardsView() {
  const {
    selectedTopicId, topics, cardSets, loadingSets,
    fetchCardSets, createCardSet, updateCardSet, deleteCardSet,
    cards, loadingCards, fetchCards, deleteCard,
    showCardEditor, openNewCard, openEditCard,
  } = useStore();
  const navigate = useNavigate();

  const [creatingSet, setCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'card' | 'set'; id: string; name: string } | null>(null);
  const [showAiGenerator, setShowAiGenerator] = useState(false);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  useEffect(() => {
    if (selectedTopicId) fetchCardSets(selectedTopicId);
    setExpandedSetId(null);
  }, [selectedTopicId, fetchCardSets]);

  useEffect(() => {
    if (expandedSetId) fetchCards(expandedSetId);
  }, [expandedSetId, fetchCards]);

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

  const toggleSet = (setId: string) => {
    setExpandedSetId(expandedSetId === setId ? null : setId);
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
        <div className="flex items-center gap-2">
          {expandedSetId && (
            <button onClick={openNewCard} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Card
            </button>
          )}
          <button onClick={() => setCreatingSet(true)} className="btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Set
          </button>
        </div>
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
          <button onClick={handleCreateSet} aria-label="Create card set" className="p-2 text-green-400 hover:text-green-300">
            <Check className="w-5 h-5" />
          </button>
          <button onClick={() => { setCreatingSet(false); setNewSetName(''); }} aria-label="Cancel" className="p-2 text-gray-400 hover:text-gray-300">
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
        <div className="space-y-2">
          {cardSets.map((set) => (
            <div key={set.id}>
              {/* Set Header */}
              <div className="card flex items-center justify-between group hover:border-accent/30 transition-colors cursor-pointer"
                onClick={() => {
                  if (editingId !== set.id) toggleSet(set.id);
                }}
              >
                {editingId === set.id ? (
                  <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
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
                    <button onClick={() => handleUpdateSet(set.id)} aria-label="Save name" className="p-1.5 text-green-400 hover:text-green-300">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} aria-label="Cancel edit" className="p-1.5 text-gray-400 hover:text-gray-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <ChevronRight
                        className={`w-4 h-4 text-gray-500 transition-transform ${expandedSetId === set.id ? 'rotate-90' : ''}`}
                      />
                      <Layers className="w-5 h-5 text-accent" />
                      <div>
                        <h3 className="font-medium text-white">{set.name}</h3>
                        {set.description && <p className="text-sm text-gray-400">{set.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-sm text-gray-500 font-mono">{set.card_count} cards</span>
                      {set.due_count > 0 && (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-mono">
                          {set.due_count} due
                        </span>
                      )}
                      {(set.due_soon_count || 0) > 0 && (
                        <span className="text-xs bg-orange-500/20 text-orange-300 px-2.5 py-1 rounded-full font-mono">
                          {set.due_soon_count} soon
                        </span>
                      )}
                      {(set.new_count || 0) > 0 && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full font-mono">
                          {set.new_count} new
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/study?set=${set.id}`); }}
                        className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 active:bg-accent/40 text-accent text-xs font-medium rounded-lg border border-accent/30 transition-colors min-h-[36px] flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Study
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => { setEditingId(set.id); setEditName(set.name); }}
                          className="p-1.5 text-gray-400 hover:text-gray-200"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'set', id: set.id, name: set.name })}
                          className="p-1.5 text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Expanded Cards */}
              {expandedSetId === set.id && (
                <div className="ml-8 mt-2 space-y-1.5">
                  {loadingCards ? (
                    <div className="text-gray-500 text-sm py-4 text-center">Loading cards...</div>
                  ) : cards.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm">No cards in this set</p>
                      <button onClick={openNewCard} className="text-accent text-sm mt-2 hover:text-accent-hover">
                        + Create first card
                      </button>
                    </div>
                  ) : (
                    cards.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => openEditCard(card)}
                        className="bg-surface-elevated border border-border rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:border-accent/30 transition-colors group"
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="text-sm text-gray-200 truncate">{getCardPreview(card)}</p>
                          {getBackPreview(card) && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">{getBackPreview(card)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <SlotDots slot={card.sr_slot} />
                          {JSON.parse(card.tags || '[]').length > 0 && (
                            <div className="flex gap-1">
                              {(JSON.parse(card.tags || '[]') as string[]).slice(0, 2).map((tag) => (
                                <span key={tag} className="text-xs bg-accent/10 text-accent/70 px-1.5 py-0.5 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ type: 'card', id: card.id, name: getCardPreview(card).slice(0, 40) });
                            }}
                            className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Card Generator */}
      <div className="mt-6">
        <button
          onClick={() => setShowAiGenerator(!showAiGenerator)}
          className="w-full flex items-center gap-3 card p-4 hover:border-accent/30 transition-colors"
        >
          <Sparkles className="w-5 h-5 text-accent" />
          <span className="flex-1 text-left font-medium text-text-primary">AI Card Generator & PDF Import</span>
          <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${showAiGenerator ? 'rotate-180' : ''}`} />
        </button>
        {showAiGenerator && (
          <div className="mt-2">
            <AiCardGenerator />
          </div>
        )}
      </div>

      {/* Card Editor Modal */}
      {showCardEditor && <CardEditor />}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <DeleteConfirmModal
          itemName={deleteTarget.name}
          itemType={deleteTarget.type}
          onDelete={() => {
            if (deleteTarget.type === 'set') deleteCardSet(deleteTarget.id);
            else deleteCard(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
