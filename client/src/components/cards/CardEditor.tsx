import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, GripVertical, Trash2, Type, Image, Music, Video, Youtube, Upload, ChevronDown } from 'lucide-react';
import { useStore, MediaBlock, CardFull } from '../../stores/useStore';

type BlockType = 'text' | 'image' | 'audio' | 'video' | 'youtube';

interface EditableBlock {
  id: string;
  block_type: BlockType;
  text_content: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  youtube_url: string;
  youtube_embed_id: string | null;
}

function newBlock(type: BlockType): EditableBlock {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    block_type: type,
    text_content: '',
    file_path: null,
    file_name: null,
    file_size: null,
    mime_type: null,
    youtube_url: '',
    youtube_embed_id: null,
  };
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const blockTypeIcons: Record<BlockType, typeof Type> = {
  text: Type,
  image: Image,
  audio: Music,
  video: Video,
  youtube: Youtube,
};

const blockTypeLabels: Record<BlockType, string> = {
  text: 'Text',
  image: 'Image',
  audio: 'Audio',
  video: 'Video',
  youtube: 'YouTube',
};

interface SideEditorProps {
  label: string;
  blocks: EditableBlock[];
  onBlocksChange: (blocks: EditableBlock[]) => void;
  cardSideId?: string;
}

function SideEditor({ label, blocks, onBlocksChange, cardSideId }: SideEditorProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addBlock = (type: BlockType) => {
    onBlocksChange([...blocks, newBlock(type)]);
    setShowAddMenu(false);
  };

  const updateBlock = (index: number, updates: Partial<EditableBlock>) => {
    const updated = blocks.map((b, i) => (i === index ? { ...b, ...updates } : b));
    onBlocksChange(updated);
  };

  const removeBlock = (index: number) => {
    onBlocksChange(blocks.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!cardSideId) {
      // For new cards, we'll just store a placeholder — file upload happens after card creation
      // For now, show the file name as a preview indicator
      updateBlock(index, {
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('cardSideId', cardSideId);

    try {
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const mediaBlock = await res.json();
        updateBlock(index, {
          id: mediaBlock.id,
          file_path: mediaBlock.file_path,
          file_name: mediaBlock.file_name,
          file_size: mediaBlock.file_size,
          mime_type: mediaBlock.mime_type,
        });
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(index, files[0]);
    }
  }, [cardSideId, blocks]);

  const handlePaste = useCallback((e: React.ClipboardEvent, index: number) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          handleFileUpload(index, new File([blob], `clipboard-${Date.now()}.png`, { type: blob.type }));
        }
        break;
      }
    }
  }, [cardSideId, blocks]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{label}</h3>
      <div className="bg-surface-base rounded-lg border border-border p-3 space-y-2 min-h-[80px]">
        {blocks.map((block, index) => {
          const Icon = blockTypeIcons[block.block_type];
          return (
            <div key={block.id} className="flex items-start gap-2 group">
              <div className="flex items-center gap-1 pt-2 shrink-0">
                <GripVertical className="w-4 h-4 text-gray-600 cursor-grab" />
                <Icon className="w-4 h-4 text-gray-500" />
              </div>

              <div className="flex-1 min-w-0">
                {block.block_type === 'text' && (
                  <textarea
                    value={block.text_content}
                    onChange={(e) => updateBlock(index, { text_content: e.target.value })}
                    placeholder="Enter text content..."
                    className="w-full input resize-none min-h-[60px]"
                    rows={2}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                )}

                {(block.block_type === 'image' || block.block_type === 'audio' || block.block_type === 'video') && (
                  <div
                    onDrop={(e) => handleDrop(e, index)}
                    onDragOver={(e) => e.preventDefault()}
                    onPaste={(e) => handlePaste(e, index)}
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-accent/50 transition-colors"
                  >
                    {block.file_path ? (
                      <div>
                        {block.block_type === 'image' && (
                          <img src={`/uploads/${block.file_path}`} alt="" className="max-h-40 mx-auto rounded" />
                        )}
                        {block.block_type === 'audio' && (
                          <audio controls src={`/uploads/${block.file_path}`} className="w-full" />
                        )}
                        {block.block_type === 'video' && (
                          <video controls src={`/uploads/${block.file_path}`} className="max-h-40 mx-auto rounded" />
                        )}
                        <p className="text-xs text-gray-500 mt-2">{block.file_name}</p>
                      </div>
                    ) : block.file_name ? (
                      <div className="text-sm text-gray-400">
                        <p>{block.file_name}</p>
                        <p className="text-xs text-gray-500">Will be uploaded on save</p>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          Drop {block.block_type} here or <span className="text-accent">browse</span>
                        </p>
                        {block.block_type === 'image' && (
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP, GIF — Max 10MB. Paste from clipboard supported.</p>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept={
                            block.block_type === 'image' ? 'image/png,image/jpeg,image/webp,image/gif' :
                            block.block_type === 'audio' ? 'audio/mpeg,audio/wav,audio/ogg,audio/mp4' :
                            'video/mp4,video/webm,video/quicktime'
                          }
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(index, file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}

                {block.block_type === 'youtube' && (
                  <div>
                    <input
                      type="text"
                      value={block.youtube_url}
                      onChange={(e) => {
                        const url = e.target.value;
                        const embedId = extractYouTubeId(url);
                        updateBlock(index, { youtube_url: url, youtube_embed_id: embedId });
                      }}
                      placeholder="Paste YouTube URL..."
                      className="w-full input"
                    />
                    {block.youtube_embed_id && (
                      <div className="mt-2 rounded-lg overflow-hidden aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${block.youtube_embed_id}`}
                          className="w-full h-full"
                          allowFullScreen
                          loading="lazy"
                        />
                      </div>
                    )}
                    {block.youtube_url && !block.youtube_embed_id && (
                      <p className="text-xs text-red-400 mt-1">Invalid YouTube URL</p>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => removeBlock(index)}
                className="p-1 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}

        {/* Add Block Button */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors px-2 py-1.5 rounded hover:bg-surface-elevated"
          >
            <Plus className="w-4 h-4" />
            Add Block
            <ChevronDown className="w-3 h-3" />
          </button>
          {showAddMenu && (
            <div className="absolute top-full left-0 mt-1 bg-surface-elevated border border-border rounded-lg shadow-xl z-20 overflow-hidden">
              {(['text', 'image', 'audio', 'video', 'youtube'] as BlockType[]).map((type) => {
                const Icon = blockTypeIcons[type];
                return (
                  <button
                    key={type}
                    onClick={() => addBlock(type)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-surface hover:text-white transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {blockTypeLabels[type]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CardEditor() {
  const { editingCard, showCardEditor, setShowCardEditor, createCard, updateCard, cardSets } = useStore();
  const [frontBlocks, setFrontBlocks] = useState<EditableBlock[]>([]);
  const [backBlocks, setBackBlocks] = useState<EditableBlock[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedSetId, setSelectedSetId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingCard) {
      // Populate from existing card
      setFrontBlocks(
        editingCard.front.media_blocks.map((b) => ({
          id: b.id,
          block_type: b.block_type,
          text_content: b.text_content || '',
          file_path: b.file_path,
          file_name: b.file_name,
          file_size: b.file_size,
          mime_type: b.mime_type,
          youtube_url: b.youtube_url || '',
          youtube_embed_id: b.youtube_embed_id,
        }))
      );
      setBackBlocks(
        editingCard.back.media_blocks.map((b) => ({
          id: b.id,
          block_type: b.block_type,
          text_content: b.text_content || '',
          file_path: b.file_path,
          file_name: b.file_name,
          file_size: b.file_size,
          mime_type: b.mime_type,
          youtube_url: b.youtube_url || '',
          youtube_embed_id: b.youtube_embed_id,
        }))
      );
      setTags(JSON.parse(editingCard.tags || '[]'));
      setSelectedSetId(editingCard.card_set_id);
    } else {
      // New card — start with one text block per side
      setFrontBlocks([newBlock('text')]);
      setBackBlocks([newBlock('text')]);
      setTags([]);
      setSelectedSetId(cardSets[0]?.id || '');
    }
  }, [editingCard, cardSets]);

  if (!showCardEditor) return null;

  const handleSave = async () => {
    if (!selectedSetId) return;
    setSaving(true);

    const toMediaBlocks = (blocks: EditableBlock[]) =>
      blocks.map((b) => ({
        block_type: b.block_type,
        text_content: b.text_content || null,
        file_path: b.file_path,
        file_name: b.file_name,
        file_size: b.file_size,
        mime_type: b.mime_type,
        youtube_url: b.youtube_url || null,
        youtube_embed_id: b.youtube_embed_id,
      }));

    try {
      if (editingCard) {
        await updateCard(editingCard.id, {
          tags,
          front: { media_blocks: toMediaBlocks(frontBlocks) },
          back: { media_blocks: toMediaBlocks(backBlocks) },
        });
      } else {
        await createCard(selectedSetId, {
          tags,
          front: { media_blocks: toMediaBlocks(frontBlocks) },
          back: { media_blocks: toMediaBlocks(backBlocks) },
        });
      }
      setShowCardEditor(false);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-modal border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-heading font-semibold text-white">
            {editingCard ? 'Edit Card' : 'New Card'}
          </h2>
          <button
            onClick={() => setShowCardEditor(false)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Front Side */}
          <SideEditor
            label="Front Side"
            blocks={frontBlocks}
            onBlocksChange={setFrontBlocks}
            cardSideId={editingCard?.front?.id}
          />

          {/* Back Side */}
          <SideEditor
            label="Back Side"
            blocks={backBlocks}
            onBlocksChange={setBackBlocks}
            cardSideId={editingCard?.back?.id}
          />

          {/* Tags */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-accent/15 text-accent text-sm px-2.5 py-0.5 rounded-full"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                  }}
                  placeholder="Add tag..."
                  className="input text-sm py-0.5 px-2 w-32"
                />
                <button onClick={addTag} className="text-xs text-accent hover:text-accent-hover">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Card Set selector */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Card Set</h3>
            <select
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="input w-full"
            >
              {cardSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={() => setShowCardEditor(false)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedSetId}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : editingCard ? 'Update Card' : 'Create Card'}
          </button>
        </div>
      </div>
    </div>
  );
}
