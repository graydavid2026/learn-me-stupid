import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, GripVertical, Trash2, Type, Image, Music, Video, Youtube, Upload, ChevronDown, Clipboard, Mic, Square, VideoIcon, Camera, Pencil } from 'lucide-react';
import { useStore, MediaBlock, CardFull } from '../../stores/useStore';
import { ImageAnnotator } from '../ui/ImageAnnotator';

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
  // For pending file uploads (new cards without a side ID yet)
  pendingFile?: File;
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

/* ── Audio Recorder Hook ────────────────────────────── */
function useAudioRecorder(onRecorded: (file: File) => void) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        onRecorded(file);
      };
      recorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, [onRecorded]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
    setElapsed(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stream.getTracks().forEach((t) => t.stop());
        recorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return { recording, elapsed, formatTime, start, stop };
}

function AudioRecordButton({ onFile }: { onFile: (file: File) => void }) {
  const { recording, elapsed, formatTime, start, stop } = useAudioRecorder(onFile);

  if (recording) {
    return (
      <div className="flex items-center justify-center gap-3 py-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-sm text-red-400 font-mono">Recording... {formatTime(elapsed)}</span>
        <button
          onClick={stop}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-md text-sm transition-colors pointer-events-auto relative z-10"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          Stop
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={start}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-md text-sm transition-colors pointer-events-auto relative z-10"
    >
      <Mic className="w-4 h-4" />
      Record Audio
    </button>
  );
}

/* ── Video Recorder Hook ────────────────────────────── */
const MAX_VIDEO_SECONDS = 30;

function useVideoRecorder(onRecorded: (file: File) => void) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
      streamRef.current = stream;
      setPreviewing(true);

      // Show live preview
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
      });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setPreviewing(false);
        onRecorded(file);
      };
      recorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= MAX_VIDEO_SECONDS) {
            // Auto-stop at 30 seconds
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
              recorderRef.current.stop();
            }
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            setRecording(false);
            return 0;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  }, [onRecorded]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
    setElapsed(0);
  }, []);

  const cancel = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      // Clear chunks so onstop doesn't produce a file
      chunksRef.current = [];
      recorderRef.current.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setPreviewing(false);
      };
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
    setPreviewing(false);
    setElapsed(0);
  }, []);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stream.getTracks().forEach((t) => t.stop());
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return { recording, previewing, elapsed, formatTime, start, stop, cancel, videoPreviewRef };
}

function VideoRecordButton({ onFile }: { onFile: (file: File) => void }) {
  const { recording, previewing, elapsed, formatTime, start, stop, cancel, videoPreviewRef } = useVideoRecorder(onFile);

  if (previewing || recording) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-40">
          <video
            ref={videoPreviewRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            // Set srcObject when ref attaches
            onLoadedMetadata={(e) => (e.target as HTMLVideoElement).play()}
          />
          {recording && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 px-2 py-1 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-xs text-red-400 font-mono">{formatTime(elapsed)} / 0:{MAX_VIDEO_SECONDS.toString().padStart(2, '0')}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          {recording ? (
            <button
              onClick={stop}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-md text-sm transition-colors pointer-events-auto relative z-10"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop
            </button>
          ) : null}
          <button
            onClick={cancel}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 rounded-md text-sm transition-colors pointer-events-auto relative z-10"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={start}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 rounded-md text-sm transition-colors pointer-events-auto relative z-10"
    >
      <VideoIcon className="w-4 h-4" />
      Record Video (max {MAX_VIDEO_SECONDS}s)
    </button>
  );
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
  const [annotatingIndex, setAnnotatingIndex] = useState<number | null>(null);

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

  const uploadFile = async (index: number, file: File) => {
    if (!cardSideId) {
      // New card — store file reference + blob URL for preview, will upload after card creation
      const blobUrl = URL.createObjectURL(file);
      updateBlock(index, {
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        pendingFile: file,
        file_path: `blob:${blobUrl}`,
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
          pendingFile: undefined,
        });
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  // Handle paste on the entire side editor area
  const handlePasteOnImage = (e: React.ClipboardEvent, index: number) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/') || item.type.startsWith('audio/') || item.type.startsWith('video/')) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          e.stopPropagation();
          const ext = item.type.split('/')[1] || 'png';
          uploadFile(index, new File([blob], `clipboard-${Date.now()}.${ext}`, { type: blob.type }));
        }
        return;
      }
    }

    // If clipboard has text and this is an image block, check if it's a URL
    const text = e.clipboardData?.getData('text');
    if (text && text.startsWith('http')) {
      // Could be an image URL — store as file_name for reference
      e.preventDefault();
      e.stopPropagation();
      updateBlock(index, { file_name: text });
    }
  };

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
                {/* TEXT BLOCK */}
                {block.block_type === 'text' && (
                  <textarea
                    value={block.text_content}
                    onChange={(e) => updateBlock(index, { text_content: e.target.value })}
                    placeholder="Enter text content... (paste text with Ctrl+V)"
                    className="w-full input resize-none min-h-[60px]"
                    rows={2}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                )}

                {/* IMAGE / AUDIO / VIDEO BLOCK */}
                {(block.block_type === 'image' || block.block_type === 'audio' || block.block_type === 'video') && (
                  <div
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files);
                      if (files.length > 0) uploadFile(index, files[0]);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    className="border-2 border-dashed border-border rounded-lg text-center hover:border-accent/50 transition-colors relative"
                  >
                    {block.file_path ? (
                      <div className="p-4">
                        {block.block_type === 'image' && (
                          <div className="relative group/img">
                            <img src={block.file_path.startsWith('blob:') ? block.file_path.slice(5) : `/uploads/${block.file_path}`} alt="" className="max-h-40 mx-auto rounded" />
                            <button
                              onClick={() => setAnnotatingIndex(index)}
                              className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-lg opacity-0 group-hover/img:opacity-100 sm:opacity-0 active:opacity-100 transition-opacity"
                              title="Annotate image"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {block.block_type === 'audio' && (
                          <audio controls src={block.file_path.startsWith('blob:') ? block.file_path.slice(5) : `/uploads/${block.file_path}`} className="w-full" />
                        )}
                        {block.block_type === 'video' && (
                          <video controls src={block.file_path.startsWith('blob:') ? block.file_path.slice(5) : `/uploads/${block.file_path}`} className="max-h-40 mx-auto rounded" playsInline />
                        )}
                        <p className="text-xs text-gray-500 mt-2">{block.file_name}{block.pendingFile ? ' — will upload on save' : ''}</p>
                      </div>
                    ) : (
                      <div className="p-4">
                        {/* Hidden paste target — an invisible input that receives Ctrl+V */}
                        <input
                          type="text"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onPaste={(e) => handlePasteOnImage(e, index)}
                          onKeyDown={(e) => {
                            // Prevent typing visible characters — only allow paste
                            if (!e.ctrlKey && !e.metaKey && e.key.length === 1) {
                              e.preventDefault();
                            }
                          }}
                          onChange={() => {}} // prevent React warning
                          value=""
                          title={`Click here then Ctrl+V to paste ${block.block_type}`}
                        />
                        <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2 pointer-events-none" />
                        <p className="text-sm text-gray-400 pointer-events-none">
                          Drop {block.block_type} here, <span className="text-accent">click to paste</span>, or
                        </p>
                        <label className="inline-block mt-2 cursor-pointer pointer-events-auto relative z-10">
                          <span className="text-accent text-sm hover:text-accent-hover underline">browse files</span>
                          <input
                            type="file"
                            className="hidden"
                            accept={
                              block.block_type === 'image' ? 'image/png,image/jpeg,image/webp,image/gif' :
                              block.block_type === 'audio' ? 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm' :
                              'video/mp4,video/webm,video/quicktime'
                            }
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadFile(index, file);
                            }}
                          />
                        </label>
                        {block.block_type === 'image' && (
                          <>
                            <div className="mt-3 flex items-center gap-2 justify-center pointer-events-auto">
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent/15 text-accent hover:bg-accent/25 rounded-md text-sm transition-colors cursor-pointer">
                                <Camera className="w-4 h-4" />
                                Take Photo
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadFile(index, file);
                                  }}
                                />
                              </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 pointer-events-none">
                              PNG, JPG, WEBP, GIF — Paste, browse, or take a photo
                            </p>
                          </>
                        )}
                        {block.block_type === 'audio' && (
                          <div className="mt-3 pointer-events-auto">
                            <div className="flex items-center gap-2 justify-center text-gray-600 text-xs mb-2 pointer-events-none">
                              <span className="flex-1 border-t border-gray-700" />
                              <span>or</span>
                              <span className="flex-1 border-t border-gray-700" />
                            </div>
                            <AudioRecordButton onFile={(file) => uploadFile(index, file)} />
                          </div>
                        )}
                        {block.block_type === 'video' && (
                          <div className="mt-3 pointer-events-auto">
                            <div className="flex items-center gap-2 justify-center text-gray-600 text-xs mb-2 pointer-events-none">
                              <span className="flex-1 border-t border-gray-700" />
                              <span>or</span>
                              <span className="flex-1 border-t border-gray-700" />
                            </div>
                            <VideoRecordButton onFile={(file) => uploadFile(index, file)} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* YOUTUBE BLOCK */}
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
                      onPaste={(e) => {
                        const pastedText = e.clipboardData.getData('text');
                        if (pastedText) {
                          e.preventDefault();
                          e.stopPropagation();
                          const embedId = extractYouTubeId(pastedText);
                          updateBlock(index, { youtube_url: pastedText, youtube_embed_id: embedId });
                        }
                      }}
                      placeholder="Paste YouTube URL here (Ctrl+V)..."
                      className="w-full input"
                    />
                    {block.youtube_embed_id && (
                      <div className="mt-2 rounded-lg overflow-hidden aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${block.youtube_embed_id}`}
                          className="w-full h-full"
                          allowFullScreen
                          loading="lazy"
                          title="YouTube video preview"
                          sandbox="allow-scripts allow-same-origin allow-presentation"
                        />
                      </div>
                    )}
                    {block.youtube_url && !block.youtube_embed_id && (
                      <p className="text-xs text-red-400 mt-1">Invalid YouTube URL — try pasting the full link</p>
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
                    className="flex items-center gap-2 w-full px-3 py-2.5 sm:py-2 text-sm text-gray-300 hover:bg-surface hover:text-white active:bg-surface transition-colors"
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

      {/* Image Annotator */}
      {annotatingIndex !== null && blocks[annotatingIndex]?.file_path && (
        <ImageAnnotator
          imageSrc={blocks[annotatingIndex].file_path.startsWith('blob:') ? blocks[annotatingIndex].file_path.slice(5) : `/uploads/${blocks[annotatingIndex].file_path}`}
          onSave={async (blob) => {
            // Upload annotated image, replace original
            const file = new File([blob], `annotated-${Date.now()}.png`, { type: 'image/png' });
            await uploadFile(annotatingIndex, file);
            setAnnotatingIndex(null);
          }}
          onCancel={() => setAnnotatingIndex(null)}
        />
      )}
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

    // Strip blob: prefixes from file_path for pending files (server doesn't need them)
    const toMediaBlocks = (blocks: EditableBlock[]) =>
      blocks.map((b) => ({
        block_type: b.block_type,
        text_content: b.text_content || null,
        file_path: b.file_path && !b.file_path.startsWith('blob:') ? b.file_path : null,
        file_name: b.file_name,
        file_size: b.file_size,
        mime_type: b.mime_type,
        youtube_url: b.youtube_url || null,
        youtube_embed_id: b.youtube_embed_id,
      }));

    // Upload all pending files for a given side, then update the card
    const uploadPendingFiles = async (blocks: EditableBlock[], sideId: string) => {
      for (const block of blocks) {
        if (block.pendingFile) {
          const formData = new FormData();
          formData.append('file', block.pendingFile);
          formData.append('cardSideId', sideId);
          try {
            const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
            if (res.ok) {
              const mediaBlock = await res.json();
              block.file_path = mediaBlock.file_path;
              block.file_name = mediaBlock.file_name;
              block.file_size = mediaBlock.file_size;
              block.mime_type = mediaBlock.mime_type;
              block.pendingFile = undefined;
            }
          } catch (err) {
            console.error('Upload failed:', err);
          }
        }
      }
    };

    try {
      if (editingCard) {
        // For existing cards, upload any pending files first
        if (editingCard.front?.id) await uploadPendingFiles(frontBlocks, editingCard.front.id);
        if (editingCard.back?.id) await uploadPendingFiles(backBlocks, editingCard.back.id);
        await updateCard(editingCard.id, {
          tags,
          front: { media_blocks: toMediaBlocks(frontBlocks) },
          back: { media_blocks: toMediaBlocks(backBlocks) },
        });
      } else {
        // Create card first (without file paths for pending files)
        const created = await createCard(selectedSetId, {
          tags,
          front: { media_blocks: toMediaBlocks(frontBlocks) },
          back: { media_blocks: toMediaBlocks(backBlocks) },
        });

        // Upload pending files using the new side IDs
        if (created) {
          const hasPending = [...frontBlocks, ...backBlocks].some(b => b.pendingFile);
          if (hasPending) {
            if (created.front?.id) await uploadPendingFiles(frontBlocks, created.front.id);
            if (created.back?.id) await uploadPendingFiles(backBlocks, created.back.id);
            // Update card with actual file paths
            await updateCard(created.id, {
              tags,
              front: { media_blocks: toMediaBlocks(frontBlocks) },
              back: { media_blocks: toMediaBlocks(backBlocks) },
            });
          }
        }
      }
      // Clean up any blob URLs
      [...frontBlocks, ...backBlocks].forEach(b => {
        if (b.file_path?.startsWith('blob:')) {
          URL.revokeObjectURL(b.file_path.slice(5));
        }
      });
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-surface rounded-t-2xl sm:rounded-modal border border-border w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          <SideEditor
            label="Front Side"
            blocks={frontBlocks}
            onBlocksChange={setFrontBlocks}
            cardSideId={editingCard?.front?.id}
          />

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
        <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-border shrink-0 safe-bottom">
          <button onClick={() => setShowCardEditor(false)} className="btn-secondary">
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
