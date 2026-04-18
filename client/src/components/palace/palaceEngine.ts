/* ══════════════════════════════════════════════════
   PALACE ENGINE — Types, Themes & World Generator
   ══════════════════════════════════════════════════ */

// ─── Types ───────────────────────────────────────

export interface World {
  id: string;
  subject: string;
  themeKey: string;
  name: string;
  description: string;
  rooms: PalaceRoom[];
  createdAt: string;
}

export interface PalaceRoom {
  id: string;
  name: string;
  description: string;
  style: RoomStyle;
  loci: Locus[];
  // Building-map layout (0–100 coordinate space)
  bx: number;
  by: number;
  bw: number;
  bh: number;
}

export interface RoomStyle {
  wallColor: string;
  wallStroke: string;
  floorPattern: 'wood' | 'tile' | 'stone' | 'metal' | 'carpet';
  floorBase: string;
  floorLine: string;
  floorAlt: string;
  accentColor: string;
}

export interface Locus {
  id: string;
  objectName: string;   // themed name e.g. "Conveyor Belt"
  objectType: string;    // renderer key
  x: number;
  y: number;
  content: string;       // fact / concept to remember
  mnemonicHint: string;
  order: number;
  color: string;
  srTier: number;
  srCorrect: number;
  srTotal: number;
}

// ─── Constants ───────────────────────────────────

export const LOCUS_COLORS = [
  '#d4a853', '#5b8a9a', '#c75a5a', '#c9943b', '#3d9a6e',
  '#b8a44a', '#3a8a8a', '#4a8aaa', '#8a6a9a', '#c97a3b',
];

// ─── Theme Definitions ──────────────────────────

interface ThemeObject {
  name: string;
  type: string;  // furniture renderer key
}

interface ThemeRoom {
  name: string;
  description: string;
}

interface ThemeDef {
  key: string;
  label: string;
  keywords: string[];
  worldName: (s: string) => string;
  description: string;
  style: RoomStyle;
  rooms: ThemeRoom[];
  objects: ThemeObject[];
}

const S_WOOD: RoomStyle = {
  wallColor: '#2c2f48', wallStroke: '#3e4265',
  floorPattern: 'wood', floorBase: '#1b1d30', floorLine: '#16182a', floorAlt: '#1e2034',
  accentColor: '#d4a853',
};
const S_TILE: RoomStyle = {
  wallColor: '#283040', wallStroke: '#3a4860',
  floorPattern: 'tile', floorBase: '#181e28', floorLine: '#222e3a', floorAlt: '#1c2530',
  accentColor: '#38bdf8',
};
const S_STONE: RoomStyle = {
  wallColor: '#322a24', wallStroke: '#4a3e34',
  floorPattern: 'stone', floorBase: '#1a1614', floorLine: '#2a2420', floorAlt: '#221e1a',
  accentColor: '#d4a76a',
};
const S_METAL: RoomStyle = {
  wallColor: '#2a2e3a', wallStroke: '#3e4454',
  floorPattern: 'metal', floorBase: '#1a1c24', floorLine: '#282c38', floorAlt: '#1e2028',
  accentColor: '#f97316',
};
const S_CARPET: RoomStyle = {
  wallColor: '#2e2434', wallStroke: '#443650',
  floorPattern: 'carpet', floorBase: '#1c1620', floorLine: '#241e2a', floorAlt: '#201a24',
  accentColor: '#a855f7',
};

export const THEMES: ThemeDef[] = [
  {
    key: 'programming',
    label: 'Code Foundry',
    keywords: ['python', 'javascript', 'typescript', 'java', 'code', 'programming', 'software', 'algorithm', 'data structure', 'react', 'css', 'html', 'api', 'database', 'sql', 'git', 'web', 'computer science', 'cs ', 'coding', 'dev', 'rust', 'go ', 'c++', 'c#'],
    worldName: s => `The ${s} Foundry`,
    description: 'An industrial complex where code is forged. Each workshop processes a different aspect of the craft.',
    style: S_METAL,
    rooms: [
      { name: 'Variable Warehouse', description: 'Storage crates line the walls, each labeled and typed' },
      { name: 'Function Assembly Line', description: 'Conveyor belts carry inputs through transformations to outputs' },
      { name: 'Loop Engine Room', description: 'Pistons and gears cycle endlessly, iterating through sequences' },
      { name: 'Data Structure Vault', description: 'Organized racks of stacks, queues, trees, and graphs' },
      { name: 'Error Handling Fire Station', description: 'Alarms, try/catch ladders, and exception extinguishers' },
      { name: 'API Gateway Terminal', description: 'A dispatch center routing requests and responses' },
      { name: 'Class Workshop', description: 'Blueprints and molds for stamping out object instances' },
      { name: 'Algorithm Observatory', description: 'Charts and diagrams tracking sort orders and search paths' },
      { name: 'Testing Lab', description: 'Specimen jars of test cases and assertion meters on every wall' },
      { name: 'Deploy Control Room', description: 'Dashboards, switches, and the big red production button' },
    ],
    objects: [
      { name: 'Storage Crate', type: 'cabinet' },
      { name: 'Conveyor Belt', type: 'machine' },
      { name: 'Control Panel', type: 'station' },
      { name: 'Pipe Junction', type: 'pedestal' },
      { name: 'Assembly Robot', type: 'machine' },
      { name: 'Testing Bench', type: 'table' },
      { name: 'Debug Terminal', type: 'station' },
      { name: 'Memory Bank', type: 'cabinet' },
      { name: 'Circuit Board', type: 'wall-art' },
      { name: 'Server Rack', type: 'shelf' },
    ],
  },
  {
    key: 'medical',
    label: 'Anatomy Institute',
    keywords: ['anatomy', 'medical', 'medicine', 'biology', 'body', 'organ', 'disease', 'health', 'nursing', 'pharmac', 'cardio', 'neuro', 'cell', 'bone', 'muscle', 'blood', 'hospital', 'clinical', 'pathology', 'physiology'],
    worldName: s => `The ${s} Institute`,
    description: 'A teaching hospital where every wing reveals a system of the body.',
    style: S_TILE,
    rooms: [
      { name: 'Cardiology Wing', description: 'Heart monitors pulse on walls, circulatory models fill the room' },
      { name: 'Neurology Lab', description: 'Brain cross-sections glow, neural pathways lit along the ceiling' },
      { name: 'Skeletal Gallery', description: 'Full skeletons stand in alcoves, bones labeled on every shelf' },
      { name: 'Respiratory Chamber', description: 'Lung models expand and contract, bronchial trees hang from above' },
      { name: 'Digestive Tract Corridor', description: 'A winding path from esophagus to intestine, organs lining the walls' },
      { name: 'Muscular Theater', description: 'Anatomical models flex, tendons and ligaments on display' },
      { name: 'Immunology Command', description: 'White blood cell models patrol, pathogen charts cover the walls' },
      { name: 'Endocrine Control Room', description: 'Gland models with hormone flow diagrams connecting them' },
      { name: 'Surgical Suite', description: 'Operating tables, instrument trays, sterile drapes' },
      { name: 'Pharmacy Vault', description: 'Shelves of labeled compounds, dosage charts, interaction tables' },
    ],
    objects: [
      { name: 'Operating Table', type: 'bed' },
      { name: 'Medicine Cabinet', type: 'cabinet' },
      { name: 'X-Ray Viewer', type: 'wall-art' },
      { name: 'Stethoscope Station', type: 'station' },
      { name: 'Anatomical Model', type: 'pedestal' },
      { name: 'Microscope Bench', type: 'table' },
      { name: 'Defibrillator Cart', type: 'machine' },
      { name: 'IV Stand', type: 'pedestal' },
      { name: 'Specimen Cabinet', type: 'cabinet' },
      { name: 'Diagnostic Screen', type: 'wall-art' },
    ],
  },
  {
    key: 'law',
    label: 'Justice Quarter',
    keywords: ['law', 'legal', 'constitution', 'amendment', 'court', 'criminal', 'civil', 'contract', 'rights', 'tort', 'statute', 'legislation', 'judicial', 'attorney', 'lawyer', 'justice', 'regulation', 'compliance'],
    worldName: s => `The ${s} Quarter`,
    description: 'A colonial courthouse district where every chamber embodies a principle of law.',
    style: S_STONE,
    rooms: [
      { name: 'Supreme Court Chamber', description: 'Nine chairs on a raised bench, the Constitution displayed behind glass' },
      { name: 'Legislative Hall', description: 'Rows of desks, a speaker\'s podium, voting boards on the walls' },
      { name: 'Constitutional Archive', description: 'Original documents under glass, amendment timelines on walls' },
      { name: 'Criminal Courtroom', description: 'Witness stand, jury box, evidence table, holding cell' },
      { name: 'Civil Rights Gallery', description: 'Portraits, protest signs, landmark case displays' },
      { name: 'Administrative Office', description: 'Filing cabinets, regulation binders, bureaucratic stamps' },
      { name: 'Appeals Court', description: 'A smaller courtroom with precedent books lining every shelf' },
      { name: 'Legal Library', description: 'Floor-to-ceiling law books, research desks, citation indexes' },
      { name: 'Town Square', description: 'A printing press, church steeple, speaker\'s podium in open air' },
      { name: 'Evidence Vault', description: 'Locked cases, chain-of-custody logs, sealed exhibits' },
    ],
    objects: [
      { name: 'Judge\'s Bench', type: 'table' },
      { name: 'Witness Stand', type: 'chair' },
      { name: 'Gavel Pedestal', type: 'pedestal' },
      { name: 'Filing Cabinet', type: 'cabinet' },
      { name: 'Law Book Shelf', type: 'shelf' },
      { name: 'Printing Press', type: 'machine' },
      { name: 'Jury Box', type: 'sofa' },
      { name: 'Evidence Locker', type: 'cabinet' },
      { name: 'Case Board', type: 'wall-art' },
      { name: 'Scales of Justice', type: 'pedestal' },
    ],
  },
  {
    key: 'history',
    label: 'Chronicle Museum',
    keywords: ['history', 'war', 'civilization', 'ancient', 'medieval', 'revolution', 'empire', 'dynasty', 'century', 'era ', 'historical', 'world war', 'colonial', 'independence', 'civil war', 'cold war'],
    worldName: s => `The ${s} Museum`,
    description: 'A museum where each wing is a different era, and every artifact tells a story.',
    style: S_CARPET,
    rooms: [
      { name: 'Ancient Civilizations Wing', description: 'Stone tablets, clay vessels, and pyramid models' },
      { name: 'Medieval Hall', description: 'Suits of armor, tapestries, and castle models' },
      { name: 'Renaissance Gallery', description: 'Art reproductions, scientific instruments, maps of exploration' },
      { name: 'Revolution Room', description: 'Flags, weapons, proclamations, and portraits of leaders' },
      { name: 'Industrial Age Workshop', description: 'Steam engines, factory models, labor posters' },
      { name: 'World Wars Memorial', description: 'Uniforms, maps with battle lines, propaganda posters' },
      { name: 'Cold War Bunker', description: 'Radar screens, diplomatic cables, nuclear models' },
      { name: 'Modern Era Exhibit', description: 'Digital screens, globalization charts, technology timeline' },
      { name: 'Origins Hall', description: 'Fossils, migration maps, early tool displays' },
      { name: 'Future Prospects Lab', description: 'Projection screens, trend models, scenario boards' },
    ],
    objects: [
      { name: 'Display Case', type: 'cabinet' },
      { name: 'Timeline Wall', type: 'wall-art' },
      { name: 'Artifact Pedestal', type: 'pedestal' },
      { name: 'Diorama Table', type: 'table' },
      { name: 'Map Table', type: 'table' },
      { name: 'Period Chair', type: 'chair' },
      { name: 'Document Vault', type: 'cabinet' },
      { name: 'Globe Stand', type: 'pedestal' },
      { name: 'Portrait Gallery', type: 'wall-art' },
      { name: 'Armor Stand', type: 'pedestal' },
    ],
  },
  {
    key: 'science',
    label: 'Discovery Lab',
    keywords: ['physics', 'chemistry', 'science', 'atom', 'molecule', 'element', 'force', 'energy', 'quantum', 'thermodynamic', 'reaction', 'experiment', 'hypothesis', 'electron', 'periodic', 'gravity', 'wave', 'particle', 'geology', 'astronomy'],
    worldName: s => `The ${s} Laboratory`,
    description: 'A research campus where every lab explores a different frontier of knowledge.',
    style: S_TILE,
    rooms: [
      { name: 'Physics Lab', description: 'Pendulums swing, prisms split light, magnets hover' },
      { name: 'Chemistry Workshop', description: 'Beakers bubble, periodic table on the wall, fume hoods hum' },
      { name: 'Biology Greenhouse', description: 'Specimens in jars, cell diagrams, DNA helix models' },
      { name: 'Astronomy Dome', description: 'Star charts, planet models, telescope at the center' },
      { name: 'Geology Chamber', description: 'Rock samples, tectonic models, fossil displays' },
      { name: 'Electronics Workshop', description: 'Circuit boards, oscilloscopes, soldering stations' },
      { name: 'Quantum Theory Room', description: 'Probability clouds, wave function diagrams, thought experiments' },
      { name: 'Materials Science Bay', description: 'Stress-test machines, material samples, molecular models' },
      { name: 'Optics Lab', description: 'Lenses, mirrors, laser paths traced in colored light' },
      { name: 'Energy Research Center', description: 'Turbine models, battery arrays, renewable energy diagrams' },
    ],
    objects: [
      { name: 'Lab Bench', type: 'table' },
      { name: 'Fume Hood', type: 'machine' },
      { name: 'Microscope Station', type: 'station' },
      { name: 'Telescope Mount', type: 'pedestal' },
      { name: 'Specimen Cabinet', type: 'cabinet' },
      { name: 'Periodic Table Wall', type: 'wall-art' },
      { name: 'Reactor Chamber', type: 'machine' },
      { name: 'Whiteboard', type: 'wall-art' },
      { name: 'Instrument Shelf', type: 'shelf' },
      { name: 'Model Display', type: 'pedestal' },
    ],
  },
  {
    key: 'language',
    label: 'Linguistics Bazaar',
    keywords: ['language', 'spanish', 'french', 'german', 'japanese', 'chinese', 'korean', 'italian', 'portuguese', 'arabic', 'vocab', 'grammar', 'conjugat', 'verb', 'noun', 'tense', 'linguistic', 'translation', 'pronunciation'],
    worldName: s => `The ${s} Bazaar`,
    description: 'A vibrant marketplace where every stall trades in a different aspect of language.',
    style: S_STONE,
    rooms: [
      { name: 'Grammar Marketplace', description: 'Rule charts, sentence diagrams, conjugation tables' },
      { name: 'Vocabulary Warehouse', description: 'Word crates sorted by theme, frequency shelves' },
      { name: 'Pronunciation Studio', description: 'Mouth diagrams, phonetic charts, recording equipment' },
      { name: 'Writing Workshop', description: 'Calligraphy tables, script charts, practice scrolls' },
      { name: 'Idiom Garden', description: 'Colorful phrase trees, literal vs figurative displays' },
      { name: 'Literature Library', description: 'Bookshelves by genre, author portraits, reading nooks' },
      { name: 'Translation Bureau', description: 'Parallel text displays, dictionary stations, context boards' },
      { name: 'Conversation Café', description: 'Practice tables, dialogue scripts, cultural etiquette guides' },
      { name: 'Etymology Vault', description: 'Word origin trees, root displays, migration maps' },
      { name: 'Culture Gallery', description: 'Art, customs, gestures, and tradition displays' },
    ],
    objects: [
      { name: 'Dictionary Shelf', type: 'shelf' },
      { name: 'Writing Desk', type: 'station' },
      { name: 'Phonetic Chart', type: 'wall-art' },
      { name: 'Practice Stage', type: 'pedestal' },
      { name: 'Book Stand', type: 'pedestal' },
      { name: 'Conversation Table', type: 'table' },
      { name: 'Word Wall', type: 'wall-art' },
      { name: 'Audio Booth', type: 'cabinet' },
      { name: 'Scroll Rack', type: 'shelf' },
      { name: 'Translation Desk', type: 'station' },
    ],
  },
  {
    key: 'math',
    label: 'Calculus Workshop',
    keywords: ['math', 'calculus', 'algebra', 'geometry', 'trigonometry', 'statistics', 'probability', 'equation', 'theorem', 'proof', 'integral', 'derivative', 'matrix', 'linear', 'number theory', 'combinatorics'],
    worldName: s => `The ${s} Workshop`,
    description: 'A precision workshop where every tool and instrument serves a mathematical purpose.',
    style: S_METAL,
    rooms: [
      { name: 'Algebra Forge', description: 'Equation anvils, variable molds, factoring hammers' },
      { name: 'Geometry Chamber', description: 'Compass and straightedge tools, shape specimens, angle measures' },
      { name: 'Calculus Observatory', description: 'Curves plotted on glass, limit telescopes, area calculators' },
      { name: 'Statistics Bureau', description: 'Data tables, distribution curves, sampling instruments' },
      { name: 'Number Theory Vault', description: 'Prime number spirals, modular arithmetic locks' },
      { name: 'Linear Algebra Grid', description: 'Vector arrows, matrix boards, transformation machines' },
      { name: 'Probability Casino', description: 'Dice, cards, Bayesian roulette, outcome trees' },
      { name: 'Trigonometry Tower', description: 'Unit circles, wave generators, angle finders' },
      { name: 'Logic Gate Room', description: 'Truth tables, proof chains, contradiction detectors' },
      { name: 'Applied Math Lab', description: 'Modeling stations, simulation screens, optimization dashboards' },
    ],
    objects: [
      { name: 'Calculation Engine', type: 'machine' },
      { name: 'Drafting Table', type: 'table' },
      { name: 'Abacus Stand', type: 'pedestal' },
      { name: 'Graph Board', type: 'wall-art' },
      { name: 'Measuring Station', type: 'station' },
      { name: 'Proof Board', type: 'wall-art' },
      { name: 'Formula Cabinet', type: 'cabinet' },
      { name: 'Model Display', type: 'pedestal' },
      { name: 'Reference Shelf', type: 'shelf' },
      { name: 'Compass Desk', type: 'station' },
    ],
  },
  {
    key: 'default',
    label: 'Scholar\'s Library',
    keywords: [],
    worldName: s => `The ${s} Library`,
    description: 'A grand library where every reading room is devoted to a branch of knowledge.',
    style: S_WOOD,
    rooms: [
      { name: 'Reading Room', description: 'Leather armchairs, reading lamps, quiet study alcoves' },
      { name: 'Study Hall', description: 'Long tables, desk lamps, reference materials at hand' },
      { name: 'Archive Room', description: 'Filing drawers, cataloged collections, preservation cases' },
      { name: 'Research Lab', description: 'Equipment, notes, and experiments in progress' },
      { name: 'Gallery', description: 'Framed displays, annotated exhibits, guided paths' },
      { name: 'Workshop', description: 'Tools, materials, and hands-on practice stations' },
      { name: 'Reference Hall', description: 'Encyclopedias, dictionaries, comprehensive indexes' },
      { name: 'Seminar Room', description: 'Presentation board, discussion chairs, note stations' },
      { name: 'Map Room', description: 'Charts, atlases, geographic and conceptual maps' },
      { name: 'Commons', description: 'Comfortable seating, discussion areas, idea boards' },
    ],
    objects: [
      { name: 'Reading Desk', type: 'station' },
      { name: 'Bookshelf', type: 'shelf' },
      { name: 'Display Case', type: 'cabinet' },
      { name: 'Work Table', type: 'table' },
      { name: 'Globe Stand', type: 'pedestal' },
      { name: 'Card Catalog', type: 'cabinet' },
      { name: 'Armchair', type: 'chair' },
      { name: 'Notice Board', type: 'wall-art' },
      { name: 'Map Stand', type: 'pedestal' },
      { name: 'Study Carrel', type: 'station' },
    ],
  },
];

// ─── Theme Matching ─────────────────────────────

export function matchTheme(subject: string): ThemeDef {
  const lower = subject.toLowerCase();
  for (const theme of THEMES) {
    if (theme.keywords.some(kw => lower.includes(kw))) return theme;
  }
  return THEMES[THEMES.length - 1]; // default
}

export function getThemeByKey(key: string): ThemeDef {
  return THEMES.find(t => t.key === key) || THEMES[THEMES.length - 1];
}

// ─── Locus Position Layouts (clockwise walk) ────

const POSITION_POOLS: { x: number; y: number }[] = [
  { x: 46, y: 14 },  // near door
  { x: 20, y: 30 },  // upper-left
  { x: 75, y: 22 },  // upper-right
  { x: 82, y: 50 },  // right-center
  { x: 75, y: 78 },  // lower-right
  { x: 45, y: 85 },  // bottom-center
  { x: 18, y: 75 },  // lower-left
  { x: 15, y: 50 },  // left-center
  { x: 50, y: 50 },  // center
  { x: 40, y: 35 },  // inner-left
];

function getPositions(count: number): { x: number; y: number }[] {
  return POSITION_POOLS.slice(0, count);
}

// ─── Building Layout ────────────────────────────

function layoutRooms(count: number): { bx: number; by: number; bw: number; bh: number }[] {
  const RW = 28;
  const RH = 22;
  const GAP = 4;

  if (count === 1) return [{ bx: 36, by: 39, bw: RW, bh: RH }];

  const cols = Math.min(count, 3);
  const rows = Math.ceil(count / cols);
  const totalW = cols * RW + (cols - 1) * GAP;
  const totalH = rows * RH + (rows - 1) * GAP;
  const startX = (100 - totalW) / 2;
  const startY = (100 - totalH) / 2;

  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      bx: startX + col * (RW + GAP),
      by: startY + row * (RH + GAP),
      bw: RW,
      bh: RH,
    };
  });
}

// ─── Mnemonic Hint Generator ────────────────────

function generateHint(objectName: string, content: string): string {
  const shortContent = content.length > 60 ? content.slice(0, 57) + '...' : content;
  const templates = [
    `Picture the ${objectName} — it's engraved with "${shortContent}." The image is vivid and impossible to forget.`,
    `The ${objectName} is glowing. Written across it in burning letters: "${shortContent}."`,
    `You reach out and touch the ${objectName}. It whispers to you: "${shortContent}."`,
    `The ${objectName} transforms before your eyes, spelling out: "${shortContent}."`,
  ];
  return templates[content.length % templates.length];
}

// ─── World Generator ────────────────────────────

const MAX_ITEMS_PER_ROOM = 8;

export function generateWorld(subject: string, items: string[], themeKeyOverride?: string): World {
  const theme = themeKeyOverride ? getThemeByKey(themeKeyOverride) : matchTheme(subject);

  // Chunk items into rooms
  const groups: string[][] = [];
  for (let i = 0; i < items.length; i += MAX_ITEMS_PER_ROOM) {
    groups.push(items.slice(i, i + MAX_ITEMS_PER_ROOM));
  }
  if (groups.length === 0) groups.push([]);

  const layouts = layoutRooms(groups.length);

  const rooms: PalaceRoom[] = groups.map((group, gi) => {
    const roomTemplate = theme.rooms[gi % theme.rooms.length];
    const positions = getPositions(group.length);

    const loci: Locus[] = group.map((item, li) => {
      const obj = theme.objects[li % theme.objects.length];
      const pos = positions[li] || { x: 30 + Math.random() * 40, y: 30 + Math.random() * 40 };
      return {
        id: `l-${gi}-${li}-${Date.now()}`,
        objectName: obj.name,
        objectType: obj.type,
        x: pos.x,
        y: pos.y,
        content: item,
        mnemonicHint: generateHint(obj.name, item),
        order: li + 1,
        color: LOCUS_COLORS[li % LOCUS_COLORS.length],
        srTier: 0,
        srCorrect: 0,
        srTotal: 0,
      };
    });

    return {
      id: `room-${gi}-${Date.now()}`,
      name: roomTemplate.name,
      description: roomTemplate.description,
      style: { ...theme.style },
      loci,
      ...layouts[gi],
    };
  });

  return {
    id: `world-${Date.now()}`,
    subject,
    themeKey: theme.key,
    name: theme.worldName(subject),
    description: theme.description,
    rooms,
    createdAt: new Date().toISOString(),
  };
}

// ─── Demo Worlds ────────────────────────────────

export function createDemoWorld(): World {
  return generateWorld('Memory Techniques', [
    'Method of Loci — An ancient Greek mnemonic technique where you mentally place items along a familiar route inside a building.',
    'Chunking — Grouping individual pieces of information into larger, meaningful units. Working memory holds ~4 chunks.',
    'Spaced Repetition — Review at exponentially increasing intervals: 1d → 3d → 1w → 2w → 1mo → 3mo.',
    'Elaborative Encoding — Connect new information to existing knowledge by asking "why" and "how" questions.',
    'Dual Coding Theory — Combining verbal and visual information creates two memory traces, dramatically improving recall.',
  ], 'default');
}
