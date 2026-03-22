import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowRight, Type, Square, Crop, Undo2, Check, X, Move, Trash2 } from 'lucide-react';

/**
 * Image annotation editor:
 * - Draggable/resizable arrows (bright colors, thick)
 * - Text boxes (max 80 chars, 10px font, movable, colored)
 * - Rectangles (thick border, resizable, colored)
 * - Crop tool
 * - Colors: red, yellow, white, black
 * - All annotations editable until save
 * - Touch-friendly (mobile-first)
 * - Exports annotated image as Blob (annotations baked into pixels)
 */

type Tool = 'arrow' | 'text' | 'rect' | 'crop' | 'move' | null;

interface Arrow {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
}

interface TextBox {
  id: string;
  x: number; y: number;
  text: string;
  color: string;
}

interface Rect {
  id: string;
  x: number; y: number;
  w: number; h: number;
  color: string;
}

interface CropRect {
  x: number; y: number;
  w: number; h: number;
}

const COLORS = ['#ef4444', '#facc15', '#ffffff', '#000000']; // red, yellow, white, black
const COLOR_LABELS: Record<string, string> = { '#ef4444': 'Red', '#facc15': 'Yellow', '#ffffff': 'White', '#000000': 'Black' };

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
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [rects, setRects] = useState<Rect[]>([]);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');

  // Drawing state
  const [drawing, setDrawing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'arrow-start' | 'arrow-end' | 'arrow-body' | 'text' | 'rect' | 'rect-resize' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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

    // Crop overlay
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

    // Draw rectangles
    for (const r of rects) {
      const rx = r.x * size.scale + size.offsetX;
      const ry = r.y * size.scale + size.offsetY;
      const rw = r.w * size.scale;
      const rh = r.h * size.scale;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4;
      ctx.strokeRect(rx, ry, rw, rh);
      // Resize handle (bottom-right corner)
      ctx.fillStyle = r.color;
      ctx.fillRect(rx + rw - 6, ry + rh - 6, 12, 12);
    }

    // Draw arrows
    for (const arrow of arrows) {
      const x1 = arrow.x1 * size.scale + size.offsetX;
      const y1 = arrow.y1 * size.scale + size.offsetY;
      const x2 = arrow.x2 * size.scale + size.offsetX;
      const y2 = arrow.y2 * size.scale + size.offsetY;

      ctx.strokeStyle = arrow.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 18;
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
        ctx.arc(hx, hy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Draw text boxes
    for (const tb of textBoxes) {
      const tx = tb.x * size.scale + size.offsetX;
      const ty = tb.y * size.scale + size.offsetY;
      const fontSize = Math.max(10, 14 * size.scale);

      // Background
      ctx.font = `bold ${fontSize}px system-ui`;
      const metrics = ctx.measureText(tb.text || ' ');
      const pad = 4;
      const bgW = metrics.width + pad * 2;
      const bgH = fontSize + pad * 2;

      // Semi-transparent background for readability
      const bgColor = tb.color === '#000000' || tb.color === '#ef4444' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
      ctx.fillStyle = bgColor;
      ctx.fillRect(tx - pad, ty - fontSize - pad, bgW, bgH);

      ctx.fillStyle = tb.color;
      ctx.font = `bold ${fontSize}px system-ui`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(tb.text, tx, ty);
    }
  }, [arrows, textBoxes, rects, cropRect, imgSize]);

  useEffect(() => { redraw(); }, [redraw]);

  // Pointer handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (editingTextId) return; // don't interact with canvas while editing text
    e.preventDefault();
    const { x, y } = toImageCoords(e.clientX, e.clientY);
    const hitRadius = 20 / imgSize.scale;

    // Check hits on existing annotations (move mode or no tool)
    if (tool === 'move' || tool === null) {
      // Check arrow handles
      for (const arrow of arrows) {
        if (Math.hypot(x - arrow.x1, y - arrow.y1) < hitRadius) {
          setDragId(arrow.id); setDragType('arrow-start'); setDrawing(true); return;
        }
        if (Math.hypot(x - arrow.x2, y - arrow.y2) < hitRadius) {
          setDragId(arrow.id); setDragType('arrow-end'); setDrawing(true); return;
        }
      }
      // Check text boxes
      for (const tb of textBoxes) {
        if (Math.abs(x - tb.x) < 60 / imgSize.scale && Math.abs(y - tb.y) < 20 / imgSize.scale) {
          setDragId(tb.id); setDragType('text'); setDragOffset({ x: x - tb.x, y: y - tb.y }); setDrawing(true); return;
        }
      }
      // Check rects — resize handle (bottom-right)
      for (const r of rects) {
        if (Math.abs(x - (r.x + r.w)) < hitRadius && Math.abs(y - (r.y + r.h)) < hitRadius) {
          setDragId(r.id); setDragType('rect-resize'); setDrawing(true); return;
        }
        // Body drag
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          setDragId(r.id); setDragType('rect'); setDragOffset({ x: x - r.x, y: y - r.y }); setDrawing(true); return;
        }
      }
    }

    if (tool === 'arrow') {
      setDrawStart({ x, y });
      setDrawing(true);
    } else if (tool === 'text') {
      // Place a text box, then show input
      const tb: TextBox = { id: crypto.randomUUID(), x, y, text: '', color };
      setTextBoxes((prev) => [...prev, tb]);
      setEditingTextId(tb.id);
      setTextInput('');
    } else if (tool === 'rect') {
      setDrawStart({ x, y });
      setDrawing(true);
    } else if (tool === 'crop') {
      setDrawStart({ x, y });
      setDrawing(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const { x, y } = toImageCoords(e.clientX, e.clientY);

    if (dragId && dragType) {
      if (dragType === 'arrow-start') {
        setArrows((prev) => prev.map((a) => a.id === dragId ? { ...a, x1: x, y1: y } : a));
      } else if (dragType === 'arrow-end') {
        setArrows((prev) => prev.map((a) => a.id === dragId ? { ...a, x2: x, y2: y } : a));
      } else if (dragType === 'text') {
        setTextBoxes((prev) => prev.map((t) => t.id === dragId ? { ...t, x: x - dragOffset.x, y: y - dragOffset.y } : t));
      } else if (dragType === 'rect') {
        setRects((prev) => prev.map((r) => r.id === dragId ? { ...r, x: x - dragOffset.x, y: y - dragOffset.y } : r));
      } else if (dragType === 'rect-resize') {
        setRects((prev) => prev.map((r) => r.id === dragId ? { ...r, w: Math.max(20, x - r.x), h: Math.max(20, y - r.y) } : r));
      }
    } else if (tool === 'crop' && drawStart) {
      setCropRect({
        x: Math.min(drawStart.x, x), y: Math.min(drawStart.y, y),
        w: Math.abs(x - drawStart.x), h: Math.abs(y - drawStart.y),
      });
    }
    // Arrow and rect draw preview handled via drawStart state
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!drawing) return;
    const { x, y } = toImageCoords(e.clientX, e.clientY);

    if (dragId) {
      setDragId(null); setDragType(null);
    } else if (tool === 'arrow' && drawStart) {
      if (Math.hypot(x - drawStart.x, y - drawStart.y) > 10 / imgSize.scale) {
        setArrows((prev) => [...prev, { id: crypto.randomUUID(), x1: drawStart.x, y1: drawStart.y, x2: x, y2: y, color }]);
      }
      setDrawStart(null);
    } else if (tool === 'rect' && drawStart) {
      const w = Math.abs(x - drawStart.x);
      const h = Math.abs(y - drawStart.y);
      if (w > 10 / imgSize.scale && h > 10 / imgSize.scale) {
        setRects((prev) => [...prev, { id: crypto.randomUUID(), x: Math.min(drawStart.x, x), y: Math.min(drawStart.y, y), w, h, color }]);
      }
      setDrawStart(null);
    } else if (tool === 'crop' && drawStart) {
      setDrawStart(null);
    }
    setDrawing(false);
  };

  const undo = () => {
    if (textBoxes.length > 0) { setTextBoxes((prev) => prev.slice(0, -1)); }
    else if (rects.length > 0) { setRects((prev) => prev.slice(0, -1)); }
    else if (arrows.length > 0) { setArrows((prev) => prev.slice(0, -1)); }
  };

  const clearAll = () => {
    setArrows([]); setTextBoxes([]); setRects([]); setCropRect(null);
  };

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
        ...a, x1: a.x1 - cropRect.x, y1: a.y1 - cropRect.y, x2: a.x2 - cropRect.x, y2: a.y2 - cropRect.y,
      })));
      setTextBoxes((prev) => prev.map((t) => ({ ...t, x: t.x - cropRect.x, y: t.y - cropRect.y })));
      setRects((prev) => prev.map((r) => ({ ...r, x: r.x - cropRect.x, y: r.y - cropRect.y })));
      fitImage();
    };
    newImg.src = tempCanvas.toDataURL();
  };

  const commitTextEdit = () => {
    if (editingTextId) {
      if (textInput.trim()) {
        setTextBoxes((prev) => prev.map((t) => t.id === editingTextId ? { ...t, text: textInput.slice(0, 80) } : t));
      } else {
        // Remove empty text boxes
        setTextBoxes((prev) => prev.filter((t) => t.id !== editingTextId));
      }
      setEditingTextId(null);
      setTextInput('');
    }
  };

  const handleSave = () => {
    const img = imgRef.current;
    if (!img) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = img.width;
    exportCanvas.height = img.height;
    const ctx = exportCanvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const s = 1; // export at native resolution

    // Draw rectangles
    for (const r of rects) {
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4 / imgSize.scale;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }

    // Draw arrows
    for (const arrow of arrows) {
      ctx.strokeStyle = arrow.color;
      ctx.lineWidth = 4 / imgSize.scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(arrow.x1, arrow.y1);
      ctx.lineTo(arrow.x2, arrow.y2);
      ctx.stroke();

      const angle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);
      const headLen = 18 / imgSize.scale;
      ctx.fillStyle = arrow.color;
      ctx.beginPath();
      ctx.moveTo(arrow.x2, arrow.y2);
      ctx.lineTo(arrow.x2 - headLen * Math.cos(angle - Math.PI / 6), arrow.y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(arrow.x2 - headLen * Math.cos(angle + Math.PI / 6), arrow.y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }

    // Draw text boxes
    for (const tb of textBoxes) {
      const fontSize = 14 / imgSize.scale;
      ctx.font = `bold ${fontSize}px system-ui`;
      const metrics = ctx.measureText(tb.text || ' ');
      const pad = 4 / imgSize.scale;
      const bgW = metrics.width + pad * 2;
      const bgH = fontSize + pad * 2;

      const bgColor = tb.color === '#000000' || tb.color === '#ef4444' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
      ctx.fillStyle = bgColor;
      ctx.fillRect(tb.x - pad, tb.y - fontSize - pad, bgW, bgH);

      ctx.fillStyle = tb.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(tb.text, tb.x, tb.y);
    }

    exportCanvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, 'image/jpeg', 0.85);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      {/* Toolbar */}
      <div className="bg-surface border-b border-border px-2 py-1.5 flex items-center justify-between safe-top">
        <div className="flex items-center gap-0.5">
          <ToolBtn icon={Move} active={tool === 'move'} onClick={() => setTool(tool === 'move' ? null : 'move')} label="Move" />
          <ToolBtn icon={ArrowRight} active={tool === 'arrow'} onClick={() => setTool('arrow')} label="Arrow" />
          <ToolBtn icon={Type} active={tool === 'text'} onClick={() => setTool('text')} label="Text" />
          <ToolBtn icon={Square} active={tool === 'rect'} onClick={() => setTool('rect')} label="Box" />
          <ToolBtn icon={Crop} active={tool === 'crop'} onClick={() => setTool('crop')} label="Crop" />
          <div className="w-px h-6 bg-border mx-0.5" />
          {/* Color swatches inline */}
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-md border-2 transition-transform ${c === color ? 'border-accent scale-110' : 'border-gray-600'}`}
              style={{ backgroundColor: c }}
              title={COLOR_LABELS[c]}
            />
          ))}
          <div className="w-px h-6 bg-border mx-0.5" />
          <ToolBtn icon={Undo2} active={false} onClick={undo} label="Undo" />
          <ToolBtn icon={Trash2} active={false} onClick={clearAll} label="Clear" />
        </div>
        <div className="flex items-center gap-1.5">
          {cropRect && (
            <button onClick={applyCrop} className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-lg font-medium">
              Crop
            </button>
          )}
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
          <button onClick={handleSave} className="bg-accent text-white px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1">
            <Check className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Text input overlay */}
      {editingTextId && (
        <div className="absolute top-12 left-0 right-0 z-20 bg-surface border-b border-border px-3 py-2 flex items-center gap-2 safe-top">
          <input
            type="text"
            autoFocus
            maxLength={80}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitTextEdit(); }}
            placeholder="Label text (max 80 chars)..."
            className="flex-1 bg-surface-base border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
          />
          <span className="text-[10px] text-gray-500 font-mono">{textInput.length}/80</span>
          <button onClick={commitTextEdit} className="bg-accent text-white px-3 py-1.5 rounded-lg text-sm font-medium">
            Add
          </button>
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

      {/* Tool hint */}
      <div className="bg-surface border-t border-border px-3 py-1.5 text-center safe-bottom">
        <span className="text-[10px] text-gray-500">
          {tool === 'arrow' && 'Drag to draw arrow'}
          {tool === 'text' && 'Tap to place text label'}
          {tool === 'rect' && 'Drag to draw rectangle'}
          {tool === 'crop' && 'Drag to select crop area'}
          {tool === 'move' && 'Drag annotations to reposition'}
          {tool === null && 'Select a tool above'}
        </span>
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
