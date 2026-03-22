import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowRight, Hash, Crop, Palette, Undo2, Check, X, Move, Trash2 } from 'lucide-react';

/**
 * Image annotation editor with:
 * - Draggable/resizable arrows
 * - Numbered markers with color picker
 * - Crop tool
 * - Touch-friendly (mobile-first)
 * - Exports annotated image as Blob
 */

type Tool = 'arrow' | 'number' | 'crop' | 'move' | null;

interface Arrow {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
}

interface NumberMarker {
  id: string;
  x: number; y: number;
  num: number;
  color: string;
}

interface CropRect {
  x: number; y: number;
  w: number; h: number;
}

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'];

interface Props {
  imageSrc: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

export function ImageAnnotator({ imageSrc, onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<Tool>(null);
  const [color, setColor] = useState('#ef4444');
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [numbers, setNumbers] = useState<NumberMarker[]>([]);
  const [nextNum, setNextNum] = useState(1);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Drawing state
  const [drawing, setDrawing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragHandle, setDragHandle] = useState<'start' | 'end' | 'body' | 'marker' | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0, scale: 1, offsetX: 0, offsetY: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      fitImage();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Fit image to container
  const fitImage = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw / img.width, ch / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    const offsetX = (cw - w) / 2;
    const offsetY = (ch - h) / 2;

    setImgSize({ w, h, scale, offsetX, offsetY });
    redraw({ w, h, scale, offsetX, offsetY });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', fitImage);
    return () => window.removeEventListener('resize', fitImage);
  }, [fitImage]);

  // Convert page coords to image coords
  const toImageCoords = (pageX: number, pageY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: (pageX - rect.left - imgSize.offsetX) / imgSize.scale,
      y: (pageY - rect.top - imgSize.offsetY) / imgSize.scale,
    };
  };

  // Redraw canvas
  const redraw = useCallback((size = imgSize) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(img, size.offsetX, size.offsetY, size.w, size.h);

    // Draw crop overlay
    if (cropRect) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = cropRect.x * size.scale + size.offsetX;
      const cy = cropRect.y * size.scale + size.offsetY;
      const cw = cropRect.w * size.scale;
      const ch = cropRect.h * size.scale;
      ctx.clearRect(cx, cy, cw, ch);
      ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.w, cropRect.h, cx, cy, cw, ch);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cx, cy, cw, ch);
      ctx.setLineDash([]);
    }

    // Draw arrows
    for (const arrow of arrows) {
      const x1 = arrow.x1 * size.scale + size.offsetX;
      const y1 = arrow.y1 * size.scale + size.offsetY;
      const x2 = arrow.x2 * size.scale + size.offsetX;
      const y2 = arrow.y2 * size.scale + size.offsetY;

      ctx.strokeStyle = arrow.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 14;
      ctx.fillStyle = arrow.color;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      // Drag handles
      ctx.fillStyle = 'white';
      ctx.strokeStyle = arrow.color;
      ctx.lineWidth = 2;
      for (const [hx, hy] of [[x1, y1], [x2, y2]]) {
        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Draw number markers
    for (const marker of numbers) {
      const mx = marker.x * size.scale + size.offsetX;
      const my = marker.y * size.scale + size.offsetY;

      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.arc(mx, my, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(marker.num), mx, my);
    }
  }, [arrows, numbers, cropRect, imgSize]);

  useEffect(() => { redraw(); }, [redraw]);

  // Pointer handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const { x, y } = toImageCoords(e.clientX, e.clientY);

    // Check if clicking on an existing arrow handle
    if (tool === 'move' || tool === null) {
      for (const arrow of arrows) {
        const dist1 = Math.hypot(x - arrow.x1, y - arrow.y1);
        const dist2 = Math.hypot(x - arrow.x2, y - arrow.y2);
        if (dist1 < 15 / imgSize.scale) {
          setDragId(arrow.id); setDragHandle('start'); setDrawing(true); return;
        }
        if (dist2 < 15 / imgSize.scale) {
          setDragId(arrow.id); setDragHandle('end'); setDrawing(true); return;
        }
      }
      for (const marker of numbers) {
        const dist = Math.hypot(x - marker.x, y - marker.y);
        if (dist < 20 / imgSize.scale) {
          setDragId(marker.id); setDragHandle('marker'); setDrawing(true); return;
        }
      }
    }

    if (tool === 'arrow') {
      setDrawStart({ x, y });
      setDrawing(true);
    } else if (tool === 'number') {
      const marker: NumberMarker = { id: crypto.randomUUID(), x, y, num: nextNum, color };
      setNumbers((prev) => [...prev, marker]);
      setNextNum((n) => n + 1);
    } else if (tool === 'crop') {
      setDrawStart({ x, y });
      setDrawing(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const { x, y } = toImageCoords(e.clientX, e.clientY);

    if (dragId && dragHandle) {
      if (dragHandle === 'start' || dragHandle === 'end') {
        setArrows((prev) => prev.map((a) => {
          if (a.id !== dragId) return a;
          return dragHandle === 'start' ? { ...a, x1: x, y1: y } : { ...a, x2: x, y2: y };
        }));
      } else if (dragHandle === 'marker') {
        setNumbers((prev) => prev.map((m) => m.id === dragId ? { ...m, x, y } : m));
      }
    } else if (tool === 'arrow' && drawStart) {
      // Preview: handled by redraw with temp arrow
    } else if (tool === 'crop' && drawStart) {
      setCropRect({
        x: Math.min(drawStart.x, x),
        y: Math.min(drawStart.y, y),
        w: Math.abs(x - drawStart.x),
        h: Math.abs(y - drawStart.y),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!drawing) return;
    const { x, y } = toImageCoords(e.clientX, e.clientY);

    if (dragId) {
      setDragId(null);
      setDragHandle(null);
    } else if (tool === 'arrow' && drawStart) {
      const len = Math.hypot(x - drawStart.x, y - drawStart.y);
      if (len > 10 / imgSize.scale) {
        const arrow: Arrow = { id: crypto.randomUUID(), x1: drawStart.x, y1: drawStart.y, x2: x, y2: y, color };
        setArrows((prev) => [...prev, arrow]);
      }
      setDrawStart(null);
    } else if (tool === 'crop' && drawStart) {
      setDrawStart(null);
    }

    setDrawing(false);
  };

  // Undo last annotation
  const undo = () => {
    if (numbers.length > 0) {
      setNumbers((prev) => prev.slice(0, -1));
      setNextNum((n) => Math.max(1, n - 1));
    } else if (arrows.length > 0) {
      setArrows((prev) => prev.slice(0, -1));
    }
  };

  // Apply crop
  const applyCrop = () => {
    if (!cropRect || !imgRef.current) return;
    const img = imgRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropRect.w;
    tempCanvas.height = cropRect.h;
    const ctx = tempCanvas.getContext('2d')!;
    ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);

    const newImg = new Image();
    newImg.onload = () => {
      imgRef.current = newImg;
      setCropRect(null);
      setTool(null);
      // Remap annotations to cropped coords
      setArrows((prev) => prev.map((a) => ({
        ...a,
        x1: a.x1 - cropRect.x, y1: a.y1 - cropRect.y,
        x2: a.x2 - cropRect.x, y2: a.y2 - cropRect.y,
      })));
      setNumbers((prev) => prev.map((m) => ({
        ...m, x: m.x - cropRect.x, y: m.y - cropRect.y,
      })));
      fitImage();
    };
    newImg.src = tempCanvas.toDataURL();
  };

  // Save annotated image
  const handleSave = () => {
    const img = imgRef.current;
    if (!img) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = img.width;
    exportCanvas.height = img.height;
    const ctx = exportCanvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    // Draw arrows at full res
    for (const arrow of arrows) {
      ctx.strokeStyle = arrow.color;
      ctx.lineWidth = 3 / imgSize.scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(arrow.x1, arrow.y1);
      ctx.lineTo(arrow.x2, arrow.y2);
      ctx.stroke();

      const angle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);
      const headLen = 14 / imgSize.scale;
      ctx.fillStyle = arrow.color;
      ctx.beginPath();
      ctx.moveTo(arrow.x2, arrow.y2);
      ctx.lineTo(arrow.x2 - headLen * Math.cos(angle - Math.PI / 6), arrow.y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(arrow.x2 - headLen * Math.cos(angle + Math.PI / 6), arrow.y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }

    // Draw number markers at full res
    for (const marker of numbers) {
      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 14 / imgSize.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${14 / imgSize.scale}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(marker.num), marker.x, marker.y);
    }

    exportCanvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      {/* Toolbar */}
      <div className="bg-surface border-b border-border px-3 py-2 flex items-center justify-between safe-top">
        <div className="flex items-center gap-1">
          <ToolBtn icon={Move} active={tool === 'move'} onClick={() => setTool(tool === 'move' ? null : 'move')} label="Move" />
          <ToolBtn icon={ArrowRight} active={tool === 'arrow'} onClick={() => setTool('arrow')} label="Arrow" />
          <ToolBtn icon={Hash} active={tool === 'number'} onClick={() => setTool('number')} label="Number" />
          <ToolBtn icon={Crop} active={tool === 'crop'} onClick={() => setTool('crop')} label="Crop" />
          <div className="w-px h-6 bg-border mx-1" />
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-8 h-8 rounded-lg border-2 border-border flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Palette className="w-3.5 h-3.5 text-white mix-blend-difference" />
          </button>
          <ToolBtn icon={Undo2} active={false} onClick={undo} label="Undo" />
          <ToolBtn icon={Trash2} active={false} onClick={() => { setArrows([]); setNumbers([]); setNextNum(1); setCropRect(null); }} label="Clear" />
        </div>
        <div className="flex items-center gap-2">
          {cropRect && (
            <button onClick={applyCrop} className="text-xs bg-accent/20 text-accent px-3 py-1.5 rounded-lg font-medium">
              Apply Crop
            </button>
          )}
          <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
          <button onClick={handleSave} className="bg-accent text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Color picker dropdown */}
      {showColorPicker && (
        <div className="absolute top-14 left-3 z-10 bg-surface border border-border rounded-lg p-2 flex gap-1.5 safe-top" style={{ marginTop: 'env(safe-area-inset-top)' }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setShowColorPicker(false); }}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${c === color ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}

function ToolBtn({ icon: Icon, active, onClick, label }: { icon: any; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
        active ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-200 hover:bg-surface-elevated'
      }`}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
