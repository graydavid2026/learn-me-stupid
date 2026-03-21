import { useState, useRef, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import type { PalaceRoom, Locus, RoomStyle } from './palaceEngine';

/* ══════════════════════════════════════════════════
   PALETTE — derived from room style
   ══════════════════════════════════════════════════ */

function palette(s: RoomStyle) {
  return {
    wallFill: s.wallColor,
    wallStroke: s.wallStroke,
    floorBase: s.floorBase,
    floorLine: s.floorLine,
    floorAlt: s.floorAlt,
    accent: s.accentColor,
    baseboard: '#151729',
    glass: '#283848',
    glassPale: '#304858',
    wood: '#3a2e22',
    woodLight: '#4a3c2c',
    furnFill: '#252841',
    furnStroke: '#3a3e5e',
    furnDark: '#1e2038',
    furnAccent: '#2e3250',
    cushion: '#2d2444',
    rugWarm: '#2a1f1f',
    rugBorder: '#3d2a2a',
    rugCool: '#1a2230',
    rugCoolBorder: '#253345',
    plantGreen: '#1a4a2a',
    plantLight: '#2a6a3a',
    potTerra: '#5a3a2a',
    bookSpines: ['#8b3a3a', '#3a5e8b', '#3a8b5e', '#8b7a3a', '#5e3a8b', '#8b5e3a'],
    pathLine: '#4a4e70',
    pathArrow: '#5a5e80',
    doorArc: '#3e4265',
  };
}

/* ══════════════════════════════════════════════════
   WALL / LAYOUT CONSTANTS
   ══════════════════════════════════════════════════ */

const W = 3;
const ROOM = 100;
const INNER = ROOM - 2 * W;
const DOOR_L = 38, DOOR_R = 54, DOOR_W = DOOR_R - DOOR_L;
const WIN_R_T = 22, WIN_R_B = 42;
const WIN_L_T = 52, WIN_L_B = 70;

/* ══════════════════════════════════════════════════
   FLOOR PATTERNS
   ══════════════════════════════════════════════════ */

function FloorPatterns({ style }: { style: RoomStyle }) {
  const C = palette(style);
  switch (style.floorPattern) {
    case 'tile':
      return (
        <pattern id="floorPat" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill={C.floorBase} />
          <rect x="0.3" y="0.3" width="7.1" height="7.1" fill={C.floorAlt} rx="0.2" opacity="0.3" />
          <line x1="0" y1="0" x2="8" y2="0" stroke={C.floorLine} strokeWidth="0.25" />
          <line x1="0" y1="0" x2="0" y2="8" stroke={C.floorLine} strokeWidth="0.25" />
        </pattern>
      );
    case 'stone':
      return (
        <pattern id="floorPat" width="16" height="12" patternUnits="userSpaceOnUse">
          <rect width="16" height="12" fill={C.floorBase} />
          <rect x="0.5" y="0.5" width="7" height="5" rx="0.5" fill={C.floorAlt} opacity="0.2" stroke={C.floorLine} strokeWidth="0.2" />
          <rect x="8.5" y="0.5" width="7" height="5" rx="0.5" fill="none" stroke={C.floorLine} strokeWidth="0.2" />
          <rect x="4" y="6.5" width="8" height="5" rx="0.5" fill={C.floorAlt} opacity="0.15" stroke={C.floorLine} strokeWidth="0.2" />
          <rect x="12.5" y="6.5" width="3" height="5" rx="0.5" fill="none" stroke={C.floorLine} strokeWidth="0.2" />
          <rect x="0.5" y="6.5" width="3" height="5" rx="0.5" fill="none" stroke={C.floorLine} strokeWidth="0.2" />
        </pattern>
      );
    case 'metal':
      return (
        <pattern id="floorPat" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={C.floorBase} />
          <line x1="0" y1="12" x2="12" y2="12" stroke={C.floorLine} strokeWidth="0.35" />
          <line x1="12" y1="0" x2="12" y2="12" stroke={C.floorLine} strokeWidth="0.35" />
          {/* Rivets */}
          <circle cx="2" cy="2" r="0.5" fill={C.floorLine} opacity="0.4" />
          <circle cx="10" cy="2" r="0.5" fill={C.floorLine} opacity="0.4" />
          <circle cx="2" cy="10" r="0.5" fill={C.floorLine} opacity="0.4" />
          <circle cx="10" cy="10" r="0.5" fill={C.floorLine} opacity="0.4" />
          {/* Plate highlight */}
          <rect x="1" y="1" width="10" height="10" fill={C.floorAlt} opacity="0.08" rx="0.3" />
        </pattern>
      );
    case 'carpet':
      return (
        <pattern id="floorPat" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill={C.floorBase} />
          <rect x="0" y="0" width="2" height="2" fill={C.floorAlt} opacity="0.12" />
          <rect x="2" y="2" width="2" height="2" fill={C.floorAlt} opacity="0.12" />
        </pattern>
      );
    default: // wood
      return (
        <>
          <pattern id="floorPat" width="100" height="4" patternUnits="userSpaceOnUse">
            <rect width="100" height="4" fill={C.floorBase} />
            <line x1="0" y1="3.7" x2="100" y2="3.7" stroke={C.floorLine} strokeWidth="0.35" />
            <line x1="20" y1="0" x2="20" y2="3.7" stroke={C.floorLine} strokeWidth="0.12" />
            <line x1="55" y1="0" x2="55" y2="3.7" stroke={C.floorLine} strokeWidth="0.12" />
            <line x1="82" y1="0" x2="82" y2="3.7" stroke={C.floorLine} strokeWidth="0.12" />
            <rect x="0" y="0" width="20" height="3.7" fill={C.floorAlt} opacity="0.15" />
            <rect x="55" y="0" width="27" height="3.7" fill={C.floorAlt} opacity="0.1" />
          </pattern>
          <pattern id="floorPat2" width="100" height="4" patternUnits="userSpaceOnUse" patternTransform="translate(35,2)">
            <rect width="100" height="4" fill="transparent" />
            <line x1="12" y1="0" x2="12" y2="4" stroke={C.floorLine} strokeWidth="0.12" />
            <line x1="45" y1="0" x2="45" y2="4" stroke={C.floorLine} strokeWidth="0.12" />
            <line x1="72" y1="0" x2="72" y2="4" stroke={C.floorLine} strokeWidth="0.12" />
          </pattern>
        </>
      );
  }
}

/* ══════════════════════════════════════════════════
   FURNITURE RENDERERS (themed colors via palette)
   ══════════════════════════════════════════════════ */

function FurnTable({ c }: { c: ReturnType<typeof palette> }) {
  return (
    <g>
      <rect x="-9" y="-6" width="18" height="12" rx="1" fill={c.wood} stroke={c.woodLight} strokeWidth="0.3" />
      <rect x="-7" y="-4.5" width="14" height="9" rx="0.5" fill="none" stroke={c.woodLight} strokeWidth="0.15" opacity="0.3" />
      {/* Objects on table */}
      <rect x="-4" y="-3" width="3" height="2" rx="0.3" fill={c.furnDark} stroke={c.furnStroke} strokeWidth="0.15" />
      <circle cx="3" cy="-1" r="1.2" fill={c.furnAccent} stroke={c.furnStroke} strokeWidth="0.15" />
    </g>
  );
}

function FurnChair({ c }: { c: ReturnType<typeof palette> }) {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="7" ry="6" fill={c.rugCool} stroke={c.rugCoolBorder} strokeWidth="0.2" />
      <rect x="-4" y="-5" width="8" height="2.2" rx="1" fill={c.furnFill} stroke={c.furnStroke} strokeWidth="0.25" />
      <rect x="-3" y="-3.2" width="6" height="5.5" rx="0.8" fill={c.cushion} stroke={c.furnStroke} strokeWidth="0.2" />
      <rect x="-5" y="-4.5" width="1.6" height="7" rx="0.6" fill={c.furnFill} stroke={c.furnStroke} strokeWidth="0.2" />
      <rect x="3.4" y="-4.5" width="1.6" height="7" rx="0.6" fill={c.furnFill} stroke={c.furnStroke} strokeWidth="0.2" />
    </g>
  );
}

function FurnSofa({ c }: { c: ReturnType<typeof palette> }) {
  return (
    <g>
      <rect x="-10" y="-4" width="20" height="8" rx="1.5" fill={c.furnFill} stroke={c.furnStroke} strokeWidth="0.3" />
      <rect x="-8.5" y="-2.5" width="7.5" height="5" rx="0.8" fill={c.cushion} stroke={c.furnStroke} strokeWidth="0.2" />
      <rect x="1" y="-2.5" width="7.5" height="5" rx="0.8" fill={c.cushion} stroke={c.furnStroke} strokeWidth="0.2" />
      <rect x="-10" y="-5.5" width="20" height="2" rx="0.8" fill={c.furnFill} stroke={c.furnStroke} strokeWidth="0.25" />
      <rect x="-11.5" y="-5" width="2" height="8.5" rx="0.8" fill={c.furnFill} stroke={c.furnStroke} strokeWidth="0.25" />
      <rect x="9.5" y="-5" width="2" height="8.5" rx="0.8" fill={c.furnFill} stroke={c.furnStroke} strokeWidth="0.25" />
    </g>
  );
}

function FurnShelf({ c }: { c: ReturnType<typeof palette> }) {
  return (
    <g>
      <rect x="-16" y="-3" width="32" height="6" rx="0.4" fill={c.wood} stroke={c.woodLight} strokeWidth="0.3" />
      <line x1="-5" y1="-3" x2="-5" y2="3" stroke={c.woodLight} strokeWidth="0.2" />
      <line x1="6" y1="-3" x2="6" y2="3" stroke={c.woodLight} strokeWidth="0.2" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={`bl${i}`} x={-15 + i * 1.2} y="-2.2" width="0.9" height={3.5 + (i % 3) * 0.5} rx="0.1" fill={c.bookSpines[i % c.bookSpines.length]} opacity="0.7" />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={`bm${i}`} x={-4 + i * 1.3} y="-2.2" width="1" height={3 + (i % 2) * 0.8} rx="0.1" fill={c.bookSpines[(i + 3) % c.bookSpines.length]} opacity="0.7" />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={`br${i}`} x={7 + i * 1.4} y="-2.2" width="1" height={3.2 + (i % 2) * 0.6} rx="0.1" fill={c.bookSpines[(i + 1) % c.bookSpines.length]} opacity="0.7" />
      ))}
    </g>
  );
}

function FurnBed({ c }: { c: ReturnType<typeof palette> }) {
  return (
    <g>
      <rect x="-10" y="-7" width="20" height="14" rx="1" fill={c.wood} stroke={c.woodLight} strokeWidth="0.3" />
      <rect x="-9" y="-6" width="18" height="12" rx="0.8" fill={c.furnFill} stroke={c.furnStroke} strokeWidth="0.25" />
      <rect x="-8" y="-5.5" width="7" height="3" rx="1" fill="#e8e0d8" stroke="#c8c0b8" strokeWidth="0.2" opacity="0.3" />
      <rect x="1" y="-5.5" width="7" height="3" rx="1" fill="#e8e0d8" stroke="#c8c0b8" strokeWidth="0.2" opacity="0.3" />
      <line x1="-8" y1="0" x2="8" y2="0" stroke={c.furnStroke} strokeWidth="0.2" />
      <rect x="-10" y="-8.5" width="20" height="2" rx="0.5" fill={c.wood} stroke={c.woodLight} strokeWidth="0.3" />
    </g>
  );
}

function FurnStation({ c }: { c: ReturnType<typeof palette> }) {
  return (
    <g>
      <rect x="-8" y="-6" width="16" height="8" rx="0.5" fill={c.wood} stroke={c.woodLight} strokeWidth="0.3" />
      <rect x="-3.5" y="-5" width="7" height="4.5" rx="0.4" fill={c.glass} stroke={c.glassPale} strokeWidth="0.25" />
      <rect x="-4" y="0.5" width="6" height="2" rx="0.3" fill={c.furnDark} stroke={c.furnStroke} strokeWidth="0.15" />
      <ellipse cx="4.5" cy="1.2" rx="1" ry="1.3" fill={c.furnDark} stroke={c.furnStroke} strokeWidth="0.15" />
      <g transform="translate(2,9)">
        <circle r="3" fill={c.furnFill} stroke={c.furnStroke} strokeWidth="0.25" />
        <circle r="2" fill={c.cushion} stroke={c.furnStroke} strokeWidth="0.2" />
      </g>
    </g>
  );
}

function FurnMachine({ c }: { c: ReturnType<typeof palette> }) {
  return (
    <g>
      {/* Base */}
      <rect x="-10" y="-6" width="20" height="12" rx="0.8" fill={c.furnFill} stroke={c.furnStroke} strokeWidth="0.35" />
      {/* Panel */}
      <rect x="-8" y="-4.5" width="10" height="6" rx="0.4" fill={c.furnDark} stroke={c.furnStroke} strokeWidth="0.2" />
      {/* Dials */}
      <circle cx="-5" cy="-2" r="1.2" fill={c.furnAccent} stroke={c.furnStroke} strokeWidth="0.2" />
      <circle cx="-2" cy="-2" r="1.2" fill={c.furnAccent} stroke={c.furnStroke} strokeWidth="0.2" />
      {/* Indicator lights */}
      <circle cx="-5" cy="1" r="0.5" fill="#22c55e" opacity="0.6" />
      <circle cx="-3" cy="1" r="0.5" fill="#ef4444" opacity="0.4" />
      {/* Output chute */}
      <rect x="4" y="-3" width="5" height="6" rx="0.4" fill={c.furnDark} stroke={c.furnStroke} strokeWidth="0.2" />
      <line x1="4" y1="-1" x2="9" y2="-1" stroke={c.furnStroke} strokeWidth="0.15" />
      <line x1="4" y1="1" x2="9" y2="1" stroke={c.furnStroke} strokeWidth="0.15" />
    </g>
  );
}

function FurnPedestal({ c }: { c: ReturnType<typeof palette> }) {
  return (
    <g>
      {/* Base */}
      <rect x="-4" y="-1" width="8" height="4" rx="0.5" fill={c.wood} stroke={c.woodLight} strokeWidth="0.25" />
      {/* Column */}
      <rect x="-2.5" y="-4" width="5" height="3.5" rx="0.3" fill={c.wood} stroke={c.woodLight} strokeWidth="0.2" />
      {/* Top platform */}
      <rect x="-3.5" y="-5" width="7" height="1.5" rx="0.3" fill={c.woodLight} stroke={c.wood} strokeWidth="0.2" />
      {/* Object on top */}
      <circle cx="0" cy="-6.5" r="2" fill={c.furnAccent} stroke={c.furnStroke} strokeWidth="0.2" opacity="0.7" />
    </g>
  );
}

function FurnCabinet({ c }: { c: ReturnType<typeof palette> }) {
  return (
    <g>
      <rect x="-6" y="-5" width="12" height="10" rx="0.5" fill={c.furnFill} stroke={c.furnStroke} strokeWidth="0.3" />
      {/* Doors */}
      <line x1="0" y1="-4.5" x2="0" y2="4.5" stroke={c.furnStroke} strokeWidth="0.2" />
      {/* Handles */}
      <circle cx="-1" cy="0" r="0.5" fill={c.furnStroke} />
      <circle cx="1" cy="0" r="0.5" fill={c.furnStroke} />
      {/* Top surface */}
      <rect x="-6.5" y="-5.5" width="13" height="1" rx="0.3" fill={c.furnFill} stroke={c.furnStroke} strokeWidth="0.2" />
    </g>
  );
}

function FurnWallArt({ c }: { c: ReturnType<typeof palette> }) {
  return (
    <g>
      {/* Frame */}
      <rect x="-8" y="-5" width="16" height="10" rx="0.5" fill={c.furnDark} stroke={c.furnStroke} strokeWidth="0.35" />
      {/* Inner frame */}
      <rect x="-6.5" y="-3.5" width="13" height="7" rx="0.3" fill={c.furnAccent} stroke={c.furnStroke} strokeWidth="0.15" opacity="0.5" />
      {/* Content lines */}
      <line x1="-5" y1="-1.5" x2="5" y2="-1.5" stroke={c.furnStroke} strokeWidth="0.15" opacity="0.4" />
      <line x1="-5" y1="0" x2="3" y2="0" stroke={c.furnStroke} strokeWidth="0.15" opacity="0.4" />
      <line x1="-5" y1="1.5" x2="4" y2="1.5" stroke={c.furnStroke} strokeWidth="0.15" opacity="0.4" />
    </g>
  );
}

function FurnDoorway({ c }: { c: ReturnType<typeof palette> }) {
  return (
    <g>
      <rect x="-7" y="-4" width="14" height="8" rx="1" fill={c.rugWarm} stroke={c.rugBorder} strokeWidth="0.3" />
      <rect x="-5.5" y="-2.5" width="11" height="5" rx="0.5" fill="none" stroke={c.rugBorder} strokeWidth="0.2" opacity="0.5" />
      {[-1.5, 0, 1.5].map(dy => (
        <line key={dy} x1="-5" y1={dy} x2="5" y2={dy} stroke={c.rugBorder} strokeWidth="0.15" opacity="0.4" />
      ))}
      <rect x="-5" y="-7" width="10" height="3" rx="0.4" fill={c.wood} stroke={c.woodLight} strokeWidth="0.25" />
    </g>
  );
}

const RENDERERS: Record<string, (props: { c: ReturnType<typeof palette> }) => JSX.Element> = {
  table: FurnTable,
  chair: FurnChair,
  sofa: FurnSofa,
  shelf: FurnShelf,
  bed: FurnBed,
  station: FurnStation,
  machine: FurnMachine,
  pedestal: FurnPedestal,
  cabinet: FurnCabinet,
  'wall-art': FurnWallArt,
  doorway: FurnDoorway,
};

/* ══════════════════════════════════════════════════
   DECORATIVE PLANTS
   ══════════════════════════════════════════════════ */

function Plant({ x, y, c }: { x: number; y: number; c: ReturnType<typeof palette> }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-1.8,0 L-1.4,3 L1.4,3 L1.8,0 Z" fill={c.potTerra} stroke={c.woodLight} strokeWidth="0.2" />
      <rect x="-2" y="-0.4" width="4" height="0.8" rx="0.3" fill={c.potTerra} stroke={c.woodLight} strokeWidth="0.15" />
      <ellipse cx="-1.5" cy="-2" rx="2" ry="1.5" fill={c.plantGreen} stroke={c.plantLight} strokeWidth="0.2" transform="rotate(-20,-1.5,-2)" />
      <ellipse cx="1.5" cy="-2.5" rx="1.8" ry="1.3" fill={c.plantLight} stroke={c.plantGreen} strokeWidth="0.2" transform="rotate(25,1.5,-2.5)" />
      <ellipse cx="0" cy="-3" rx="1.5" ry="1.8" fill={c.plantGreen} stroke={c.plantLight} strokeWidth="0.2" />
    </g>
  );
}

/* ══════════════════════════════════════════════════
   ROOM VIEW COMPONENT
   ══════════════════════════════════════════════════ */

interface RoomViewProps {
  room: PalaceRoom;
  mode: 'explore' | 'edit';
  activeLocus: string | null;
  walkthroughIndex: number | null;
  onLocusClick: (locus: Locus) => void;
  onLocusDrag: (id: string, x: number, y: number) => void;
  onLocusDelete: (id: string) => void;
}

export function RoomView({ room, mode, activeLocus, walkthroughIndex, onLocusClick, onLocusDrag, onLocusDelete }: RoomViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState({ x: -8, y: -8, w: 116, h: 116 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  const C = palette(room.style);
  const sorted = [...room.loci].sort((a, b) => a.order - b.order);
  const pathPoints = sorted.map(l => ({ x: l.x, y: l.y }));
  const pathD = pathPoints.length > 1
    ? `M ${pathPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`
    : '';

  const toSVG = useCallback((cx: number, cy: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const r = svgRef.current.getBoundingClientRect();
    return { x: viewBox.x + ((cx - r.left) / r.width) * viewBox.w, y: viewBox.y + ((cy - r.top) / r.height) * viewBox.h };
  }, [viewBox]);

  const onDown = (e: React.MouseEvent, lid?: string) => {
    if (mode === 'edit' && lid) { e.stopPropagation(); setDragging(lid); }
    else if (e.button === 0 && !lid) { setIsPanning(true); panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y }; }
  };

  const onMove = useCallback((e: React.MouseEvent) => {
    if (dragging) { const p = toSVG(e.clientX, e.clientY); onLocusDrag(dragging, Math.max(5, Math.min(95, p.x)), Math.max(5, Math.min(95, p.y))); }
    if (isPanning && svgRef.current) {
      const r = svgRef.current.getBoundingClientRect();
      setViewBox(v => ({ ...v, x: panStart.current.vx - ((e.clientX - panStart.current.x) / r.width) * v.w, y: panStart.current.vy - ((e.clientY - panStart.current.y) / r.height) * v.h }));
    }
  }, [dragging, isPanning, toSVG, onLocusDrag]);

  const onUp = () => { setDragging(null); setIsPanning(false); };

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const s = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(v => {
      const nw = Math.max(40, Math.min(220, v.w * s));
      const nh = Math.max(40, Math.min(220, v.h * s));
      return { x: v.x + v.w / 2 - nw / 2, y: v.y + v.h / 2 - nh / 2, w: nw, h: nh };
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onMouseDown={e => onDown(e)} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onWheel={onWheel}
      >
        <defs>
          <FloorPatterns style={room.style} />
          <filter id="locusGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Void */}
        <rect x="-50" y="-50" width="200" height="200" fill="#0d0e18" />

        {/* Floor */}
        <rect x={W} y={W} width={INNER} height={INNER} fill="url(#floorPat)" />
        {room.style.floorPattern === 'wood' && <rect x={W} y={W} width={INNER} height={INNER} fill="url(#floorPat2)" />}

        {/* Baseboards */}
        <rect x={W} y={W} width={INNER} height="1" fill={C.baseboard} opacity="0.6" />
        <rect x={W} y={ROOM - W - 1} width={INNER} height="1" fill={C.baseboard} opacity="0.6" />
        <rect x={W} y={W} width="1" height={INNER} fill={C.baseboard} opacity="0.6" />
        <rect x={ROOM - W - 1} y={W} width="1" height={INNER} fill={C.baseboard} opacity="0.6" />

        {/* Decorative plants */}
        <Plant x={10} y={10} c={C} />
        <Plant x={90} y={90} c={C} />
        <Plant x={90} y={12} c={C} />

        {/* Furniture at locus positions */}
        {sorted.map(locus => {
          const Comp = RENDERERS[locus.objectType] || FurnTable;
          return <g key={`f-${locus.id}`} transform={`translate(${locus.x},${locus.y})`}><Comp c={C} /></g>;
        })}

        {/* ─── WALLS ─── */}
        <rect x="0" y="0" width={DOOR_L} height={W} fill={C.wallFill} stroke={C.wallStroke} strokeWidth="0.3" />
        <rect x={DOOR_R} y="0" width={ROOM - DOOR_R} height={W} fill={C.wallFill} stroke={C.wallStroke} strokeWidth="0.3" />
        {/* Door frame + arc */}
        <rect x={DOOR_L - 0.5} y="0" width="1" height={W + 0.5} fill={C.woodLight} rx="0.2" />
        <rect x={DOOR_R - 0.5} y="0" width="1" height={W + 0.5} fill={C.woodLight} rx="0.2" />
        <rect x={DOOR_L + 0.5} y={W - 0.5} width={DOOR_W - 1} height="0.6" fill={C.wood} rx="0.2" />
        <path d={`M ${DOOR_L + 1} ${W + 0.5} A ${DOOR_W - 2} ${DOOR_W - 2} 0 0 1 ${DOOR_R - 1} ${W + 0.5}`} fill="none" stroke={C.doorArc} strokeWidth="0.25" strokeDasharray="1 0.8" opacity="0.5" />
        <line x1={DOOR_R - 1} y1={W + 0.2} x2={DOOR_R - 1 - (DOOR_W - 2) * 0.7} y2={W + 0.2 + (DOOR_W - 2) * 0.7} stroke={C.wood} strokeWidth="0.6" strokeLinecap="round" opacity="0.6" />

        {/* Bottom wall */}
        <rect x="0" y={ROOM - W} width={ROOM} height={W} fill={C.wallFill} stroke={C.wallStroke} strokeWidth="0.3" />

        {/* Left wall with window */}
        <rect x="0" y={W} width={W} height={WIN_L_T - W} fill={C.wallFill} stroke={C.wallStroke} strokeWidth="0.3" />
        <rect x="0" y={WIN_L_B} width={W} height={ROOM - W - WIN_L_B} fill={C.wallFill} stroke={C.wallStroke} strokeWidth="0.3" />
        <rect x="0" y={WIN_L_T} width={W} height={WIN_L_B - WIN_L_T} fill={C.glass} stroke={C.glassPale} strokeWidth="0.3" />
        <line x1="0.4" y1={WIN_L_T} x2="0.4" y2={WIN_L_B} stroke={C.glassPale} strokeWidth="0.2" />
        <line x1={W - 0.4} y1={WIN_L_T} x2={W - 0.4} y2={WIN_L_B} stroke={C.glassPale} strokeWidth="0.2" />
        <line x1="0" y1={(WIN_L_T + WIN_L_B) / 2} x2={W} y2={(WIN_L_T + WIN_L_B) / 2} stroke={C.glassPale} strokeWidth="0.2" />

        {/* Right wall with window */}
        <rect x={ROOM - W} y={W} width={W} height={WIN_R_T - W} fill={C.wallFill} stroke={C.wallStroke} strokeWidth="0.3" />
        <rect x={ROOM - W} y={WIN_R_B} width={W} height={ROOM - W - WIN_R_B} fill={C.wallFill} stroke={C.wallStroke} strokeWidth="0.3" />
        <rect x={ROOM - W} y={WIN_R_T} width={W} height={WIN_R_B - WIN_R_T} fill={C.glass} stroke={C.glassPale} strokeWidth="0.3" />
        <line x1={ROOM - W + 0.4} y1={WIN_R_T} x2={ROOM - W + 0.4} y2={WIN_R_B} stroke={C.glassPale} strokeWidth="0.2" />
        <line x1={ROOM - 0.4} y1={WIN_R_T} x2={ROOM - 0.4} y2={WIN_R_B} stroke={C.glassPale} strokeWidth="0.2" />
        <line x1={ROOM - W} y1={(WIN_R_T + WIN_R_B) / 2} x2={ROOM} y2={(WIN_R_T + WIN_R_B) / 2} stroke={C.glassPale} strokeWidth="0.2" />

        {/* Corners */}
        {[[0, 0], [ROOM - W, 0], [0, ROOM - W], [ROOM - W, ROOM - W]].map(([cx, cy], i) => (
          <rect key={`c${i}`} x={cx} y={cy} width={W} height={W} fill={C.wallFill} stroke={C.wallStroke} strokeWidth="0.3" />
        ))}

        {/* Room label */}
        <text x={ROOM / 2} y={-3} textAnchor="middle" fill="#5a5e7a" fontSize="3" fontFamily="system-ui" fontWeight="600">{room.name}</text>
        <text x={ROOM / 2} y={ROOM + 5} textAnchor="middle" fill="#3a3e5a" fontSize="2" fontFamily="system-ui" fontStyle="italic">{room.description}</text>

        {/* Walking path */}
        {pathD && (
          <g>
            <path d={pathD} fill="none" stroke="#000" strokeWidth="0.8" strokeDasharray="2 1.2" strokeLinecap="round" opacity="0.15" />
            <path d={pathD} fill="none" stroke={C.pathLine} strokeWidth="0.5" strokeDasharray="2 1.2" strokeLinecap="round" />
            {pathPoints.slice(0, -1).map((p, i) => {
              const n = pathPoints[i + 1];
              const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2;
              const a = Math.atan2(n.y - p.y, n.x - p.x) * (180 / Math.PI);
              return <g key={`a${i}`} transform={`translate(${mx},${my}) rotate(${a})`}><polygon points="-1,-0.9 1.2,0 -1,0.9" fill={C.pathArrow} opacity="0.6" /></g>;
            })}
          </g>
        )}

        {/* Locus badges */}
        {sorted.map((locus, idx) => {
          const isActive = activeLocus === locus.id;
          const isCurrent = walkthroughIndex !== null && idx === walkthroughIndex;
          const isPast = walkthroughIndex !== null && idx < walkthroughIndex;
          const lit = isActive || isCurrent;

          return (
            <g
              key={locus.id}
              transform={`translate(${locus.x},${locus.y})`}
              onMouseDown={e => onDown(e, locus.id)}
              onClick={e => { if (!dragging) { e.stopPropagation(); onLocusClick(locus); } }}
              className={mode === 'edit' ? 'cursor-move' : 'cursor-pointer'}
            >
              {lit && (
                <circle r="8" fill="none" stroke={locus.color} strokeWidth="0.4" opacity="0.5" filter="url(#locusGlow)">
                  <animate attributeName="r" values="7;9;7" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <g transform="translate(-6,-8)">
                <line x1="0" y1="0" x2="6" y2="8" stroke={lit ? locus.color : '#555'} strokeWidth="0.3" opacity="0.5" />
                <circle r="2.6" fill="#000" opacity="0.25" cx="0.2" cy="0.2" />
                <circle r="2.5" fill={lit ? locus.color : isPast ? locus.color + 'aa' : locus.color + '80'} stroke={lit ? '#fff' : locus.color} strokeWidth={lit ? '0.4' : '0.25'} />
                <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize="2.4" fontWeight="bold" fontFamily="system-ui">{locus.order}</text>
              </g>
              {/* Object name label */}
              <text y={locus.objectType === 'shelf' || locus.objectType === 'sofa' ? 8 : locus.objectType === 'bed' ? 12 : 10}
                textAnchor="middle" fill={lit ? '#e5e7eb' : '#7a7e9a'} fontSize="2" fontFamily="system-ui" fontWeight={lit ? '600' : '400'}>
                {locus.objectName}
              </text>
              {mode === 'edit' && (
                <g transform="translate(6,-8)" onClick={e => { e.stopPropagation(); onLocusDelete(locus.id); }} className="cursor-pointer">
                  <circle r="2" fill="#dc2626" stroke="#fff" strokeWidth="0.2" />
                  <line x1="-0.8" y1="-0.8" x2="0.8" y2="0.8" stroke="white" strokeWidth="0.4" />
                  <line x1="0.8" y1="-0.8" x2="-0.8" y2="0.8" stroke="white" strokeWidth="0.4" />
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <button onClick={() => setViewBox({ x: -8, y: -8, w: 116, h: 116 })} className="absolute bottom-3 right-3 p-2 bg-surface-elevated border border-border rounded-lg text-gray-400 hover:text-white transition-colors" title="Reset view">
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
