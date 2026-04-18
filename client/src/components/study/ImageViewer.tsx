import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

// ─── Image Lightbox with Zoom/Pan ───

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale(s => Math.min(Math.max(s + delta, 0.5), 5));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [scale, translate]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setTranslate({
      x: translateStart.current.x + (e.clientX - dragStart.current.x),
      y: translateStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  const reset = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setScale(s => Math.min(s + 0.25, 5));
      if (e.key === '-') setScale(s => Math.max(s - 0.25, 0.5));
      if (e.key === '0') reset();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50" onClick={e => e.stopPropagation()}>
        <span className="text-gray-400 text-sm">{Math.round(scale * 100)}%</span>
        <div className="flex gap-2">
          <button onClick={() => setScale(s => Math.min(s + 0.25, 5))} className="p-3 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Zoom in"><ZoomIn className="w-5 h-5" /></button>
          <button onClick={() => setScale(s => Math.max(s - 0.25, 0.5))} className="p-3 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Zoom out"><ZoomOut className="w-5 h-5" /></button>
          <button onClick={reset} className="p-3 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Reset zoom"><RotateCcw className="w-5 h-5" /></button>
          <button onClick={onClose} className="p-3 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center"
        onClick={e => e.stopPropagation()}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in', touchAction: 'none' }}
      >
        <img
          src={src}
          alt={alt || ''}
          className="max-w-none select-none"
          draggable={false}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transition: dragging ? 'none' : 'transform 0.15s ease-out',
          }}
          onDoubleClick={() => scale === 1 ? setScale(2.5) : reset()}
        />
      </div>

      <div className="text-center py-2 text-gray-500 text-xs">
        Scroll to zoom · Double-click to toggle · Drag to pan · Esc to close
      </div>
    </div>
  );
}

// ─── Hotspot Image Viewer ───

export interface HotspotDef {
  x: number;      // % from left
  y: number;      // % from top
  label: string;
  text: string;
  color?: string;  // optional marker color
}

interface HotspotImageProps {
  imageSrc: string;
  spots: HotspotDef[];
  title?: string;
}

export function HotspotImage({ imageSrc, spots, title }: HotspotImageProps) {
  const [activeSpot, setActiveSpot] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSpotClick = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSpot(activeSpot === idx ? null : idx);
  };

  return (
    <>
      <div className="w-full">
        {title && <div className="text-xs text-gray-400 mb-1 text-center">{title}</div>}
        <div
          ref={containerRef}
          className="relative inline-block w-full cursor-pointer group"
          onClick={() => setLightbox(true)}
        >
          <img
            src={imageSrc}
            alt={title || 'Interactive diagram'}
            className="w-full rounded-lg"
            draggable={false}
          />

          {/* Zoom hint */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg px-2 py-1 flex items-center gap-1 pointer-events-none">
            <Maximize2 className="w-3 h-3 text-white" />
            <span className="text-[10px] text-white">Click to zoom</span>
          </div>

          {/* Hotspot markers */}
          {spots.map((spot, idx) => (
            <button
              key={idx}
              className={`absolute w-9 h-9 -ml-[18px] -mt-[18px] rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all z-10 ${
                activeSpot === idx
                  ? 'bg-accent border-accent text-white scale-125 ring-2 ring-accent/40'
                  : 'bg-secondary/80 border-secondary text-white hover:scale-110 active:scale-95 hover:bg-secondary-hover'
              }`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              onClick={(e) => handleSpotClick(idx, e)}
              aria-label={`Hotspot ${idx + 1}: ${spot.label}`}
            >
              {idx + 1}
            </button>
          ))}

          {/* Active spot popover */}
          {activeSpot !== null && spots[activeSpot] && (
            <div
              className="absolute z-20 bg-surface-dark border border-accent/30 rounded-lg p-3 shadow-xl max-w-[260px] sm:max-w-[320px]"
              style={{
                left: `${Math.min(Math.max(spots[activeSpot].x, 15), 85)}%`,
                top: `${spots[activeSpot].y + 5}%`,
                transform: 'translate(-50%, 0)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-accent font-bold text-sm">{spots[activeSpot].label}</span>
                <button onClick={(e) => { e.stopPropagation(); setActiveSpot(null); }} className="text-gray-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">{spots[activeSpot].text}</p>
            </div>
          )}
        </div>

        {/* Spot legend below image */}
        <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
          {spots.map((spot, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSpot(activeSpot === idx ? null : idx)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                activeSpot === idx
                  ? 'bg-accent/20 border-accent/40 text-accent'
                  : 'bg-surface-base border-border text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {idx + 1}. {spot.label}
            </button>
          ))}
        </div>
      </div>

      {lightbox && (
        <ImageLightbox
          src={imageSrc}
          alt={title}
          onClose={() => setLightbox(false)}
        />
      )}
    </>
  );
}

// ─── Parse hotspot JSON from text_content ───

export function parseHotspotData(textContent: string): { image: string; spots: HotspotDef[]; title?: string } | null {
  try {
    const data = JSON.parse(textContent);
    if (data.image && Array.isArray(data.spots)) {
      return {
        image: data.image.startsWith('http') ? data.image : `/uploads/${data.image}`,
        spots: data.spots,
        title: data.title,
      };
    }
    return null;
  } catch {
    return null;
  }
}
