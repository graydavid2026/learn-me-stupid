import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run, getDb, CardSideRow, MaxOrderRow } from '../db/index.js';
import { v4 as uuid } from 'uuid';
import AdmZip from 'adm-zip';
import initSqlJs from 'sql.js';
import multer from 'multer';
import logger from '../logger.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

function genId(): string {
  return uuid().replace(/-/g, '').slice(0, 16);
}

/** Strip HTML tags from Anki field content */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Find or create a topic by name, returning its id. */
function findOrCreateTopic(name: string): string {
  const existing = queryOne<{ id: string }>('SELECT id FROM topics WHERE name = ?', [name.trim()]);
  if (existing) return existing.id;

  const id = genId();
  const maxOrder = queryOne<MaxOrderRow>('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM topics');
  run(
    `INSERT INTO topics (id, name, sort_order) VALUES (?, ?, ?)`,
    [id, name.trim(), maxOrder!.next]
  );
  return id;
}

/** Find or create a card set by name within a topic, returning its id. */
function findOrCreateSet(topicId: string, name: string): string {
  const existing = queryOne<{ id: string }>(
    'SELECT id FROM card_sets WHERE topic_id = ? AND name = ?',
    [topicId, name.trim()]
  );
  if (existing) return existing.id;

  const id = genId();
  const maxOrder = queryOne<MaxOrderRow>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM card_sets WHERE topic_id = ?',
    [topicId]
  );
  run(
    `INSERT INTO card_sets (id, topic_id, name, sort_order) VALUES (?, ?, ?, ?)`,
    [id, topicId, name.trim(), maxOrder!.next]
  );
  return id;
}

/** Create a card with front/back text. Returns the card id. */
function createCard(setId: string, frontText: string, backText: string): string {
  const cardId = genId();
  const maxOrder = queryOne<MaxOrderRow>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM cards WHERE card_set_id = ?',
    [setId]
  );

  run(
    `INSERT INTO cards (id, card_set_id, sort_order, tags) VALUES (?, ?, ?, ?)`,
    [cardId, setId, maxOrder!.next, '[]']
  );

  // Front side
  const frontId = genId();
  run(`INSERT INTO card_sides (id, card_id, side) VALUES (?, ?, 0)`, [frontId, cardId]);
  if (frontText.trim()) {
    run(
      `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, text_content)
       VALUES (?, ?, 'text', 0, ?)`,
      [genId(), frontId, frontText.trim()]
    );
  }

  // Back side
  const backId = genId();
  run(`INSERT INTO card_sides (id, card_id, side) VALUES (?, ?, 1)`, [backId, cardId]);
  if (backText.trim()) {
    run(
      `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, text_content)
       VALUES (?, ?, 'text', 0, ?)`,
      [genId(), backId, backText.trim()]
    );
  }

  return cardId;
}

interface AnkiDeck {
  name?: string;
  [key: string]: unknown;
}

interface TextBlock {
  text_content: string | null;
}

interface CardWithTopic {
  id: string;
  card_set_id: string;
  topic_id: string;
}

interface TopicExportRow {
  id: string;
  name: string;
  description: string | null;
}

// POST /api/import/anki — import an .apkg file
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a multipart form with field "file".' });
    }

    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    // Find the SQLite database inside the .apkg
    let dbEntry = entries.find(e => e.entryName === 'collection.anki21');
    if (!dbEntry) {
      dbEntry = entries.find(e => e.entryName === 'collection.anki2');
    }
    if (!dbEntry) {
      return res.status(400).json({ error: 'Invalid .apkg file: no collection.anki21 or collection.anki2 found.' });
    }

    const dbBuffer = dbEntry.getData();
    const SQL = await initSqlJs();
    const ankiDb = new SQL.Database(dbBuffer);

    // Parse deck names from col table
    const deckMap: Record<number, string> = {};
    try {
      const colStmt = ankiDb.prepare('SELECT decks FROM col');
      if (colStmt.step()) {
        const row = colStmt.getAsObject() as { decks: string };
        const decks = JSON.parse(row.decks) as Record<string, AnkiDeck>;
        for (const [deckId, deck] of Object.entries(decks)) {
          deckMap[Number(deckId)] = deck.name || 'Imported';
        }
      }
      colStmt.free();
    } catch {
      // If col table doesn't exist or decks can't be parsed, use default
    }

    // Read notes: id, flds (fields separated by \x1f), mid (model id)
    const notes: Array<{ id: number; fields: string[] }> = [];
    try {
      const noteStmt = ankiDb.prepare('SELECT id, flds FROM notes');
      while (noteStmt.step()) {
        const row = noteStmt.getAsObject() as { id: number; flds: string };
        notes.push({
          id: row.id,
          fields: String(row.flds).split('\x1f'),
        });
      }
      noteStmt.free();
    } catch (err: unknown) {
      ankiDb.close();
      const message = err instanceof Error ? err.message : String(err);
      return res.status(400).json({ error: `Failed to read notes: ${message}` });
    }

    // Read cards: nid (note id), did (deck id)
    const cardNotes: Array<{ nid: number; did: number }> = [];
    try {
      const cardStmt = ankiDb.prepare('SELECT nid, did FROM cards');
      while (cardStmt.step()) {
        const row = cardStmt.getAsObject() as { nid: number; did: number };
        cardNotes.push({ nid: row.nid, did: row.did });
      }
      cardStmt.free();
    } catch (err: unknown) {
      ankiDb.close();
      const message = err instanceof Error ? err.message : String(err);
      return res.status(400).json({ error: `Failed to read cards: ${message}` });
    }

    ankiDb.close();

    // Build note lookup
    const noteById = new Map(notes.map(n => [n.id, n]));

    // Group cards by deck
    const deckCards = new Map<string, Array<{ front: string; back: string }>>();
    const errors: string[] = [];

    for (const card of cardNotes) {
      const note = noteById.get(card.nid);
      if (!note) {
        errors.push(`Card references missing note ${card.nid}`);
        continue;
      }

      const front = stripHtml(note.fields[0] || '');
      const back = stripHtml(note.fields[1] || '');

      if (!front && !back) {
        errors.push(`Note ${card.nid}: both front and back empty, skipped`);
        continue;
      }

      const deckName = deckMap[card.did] || 'Imported';
      if (!deckCards.has(deckName)) {
        deckCards.set(deckName, []);
      }
      deckCards.get(deckName)!.push({ front, back });
    }

    // Import into our DB
    const d = getDb();
    d.exec('BEGIN TRANSACTION');
    let cardsImported = 0;
    const decksImported = new Set<string>();

    try {
      for (const [deckName, cards] of deckCards) {
        // Anki deck names use :: as separator (e.g. "Parent::Child")
        // Use the top-level name as topic, full name as card set
        const parts = deckName.split('::');
        const topicName = parts[0] || 'Imported';
        const setName = parts.length > 1 ? parts.slice(1).join(' - ') : 'Cards';

        const topicId = findOrCreateTopic(topicName);
        const setId = findOrCreateSet(topicId, setName);

        for (const card of cards) {
          try {
            createCard(setId, card.front, card.back);
            cardsImported++;
            decksImported.add(deckName);
          } catch (cardErr: unknown) {
            const message = cardErr instanceof Error ? cardErr.message : String(cardErr);
            errors.push(`Card import error: ${message}`);
          }
        }
      }
      d.exec('COMMIT');
    } catch (txErr) {
      d.exec('ROLLBACK');
      throw txErr;
    }

    res.json({
      decksImported: decksImported.size,
      cardsImported,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    logger.error({ err }, 'Error importing Anki .apkg');
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Failed to import .apkg: ${message}` });
  }
});

// GET /api/export/anki — export all cards as an .apkg file
router.get('/export', async (_req: Request, res: Response) => {
  try {
    const SQL = await initSqlJs();
    const ankiDb = new SQL.Database();

    const now = Math.floor(Date.now() / 1000);

    // Create Anki schema
    ankiDb.run(`CREATE TABLE col (
      id INTEGER PRIMARY KEY,
      crt INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      scm INTEGER NOT NULL,
      ver INTEGER NOT NULL,
      dty INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      ls INTEGER NOT NULL,
      conf TEXT NOT NULL,
      models TEXT NOT NULL,
      decks TEXT NOT NULL,
      dconf TEXT NOT NULL,
      tags TEXT NOT NULL
    )`);

    ankiDb.run(`CREATE TABLE notes (
      id INTEGER PRIMARY KEY,
      guid TEXT NOT NULL,
      mid INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      tags TEXT NOT NULL,
      flds TEXT NOT NULL,
      sfld TEXT NOT NULL,
      csum INTEGER NOT NULL,
      flags INTEGER NOT NULL,
      data TEXT NOT NULL
    )`);

    ankiDb.run(`CREATE TABLE cards (
      id INTEGER PRIMARY KEY,
      nid INTEGER NOT NULL,
      did INTEGER NOT NULL,
      ord INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      type INTEGER NOT NULL,
      queue INTEGER NOT NULL,
      due INTEGER NOT NULL,
      ivl INTEGER NOT NULL,
      factor INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      lapses INTEGER NOT NULL,
      left INTEGER NOT NULL,
      odue INTEGER NOT NULL,
      odid INTEGER NOT NULL,
      flags INTEGER NOT NULL,
      data TEXT NOT NULL
    )`);

    ankiDb.run(`CREATE TABLE revlog (
      id INTEGER PRIMARY KEY,
      cid INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      ease INTEGER NOT NULL,
      ivl INTEGER NOT NULL,
      lastIvl INTEGER NOT NULL,
      factor INTEGER NOT NULL,
      time INTEGER NOT NULL,
      type INTEGER NOT NULL
    )`);

    ankiDb.run(`CREATE TABLE graves (
      usn INTEGER NOT NULL,
      oid INTEGER NOT NULL,
      type INTEGER NOT NULL
    )`);

    // Build deck and model maps
    const topics = queryAll<TopicExportRow>('SELECT * FROM topics ORDER BY sort_order');
    const deckMapOut: Record<string, Record<string, unknown>> = {};
    const topicToDeckId: Record<string, number> = {};

    // Default deck (id=1)
    deckMapOut['1'] = {
      id: 1,
      mod: now,
      name: 'Default',
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: false,
      desc: '',
      dyn: 0,
      conf: 1,
      extendNew: 10,
      extendRev: 50,
    };

    let deckIdCounter = 1000000000;
    for (const t of topics) {
      const deckId = deckIdCounter++;
      topicToDeckId[t.id] = deckId;
      deckMapOut[String(deckId)] = {
        id: deckId,
        mod: now,
        name: t.name,
        usn: -1,
        lrnToday: [0, 0],
        revToday: [0, 0],
        newToday: [0, 0],
        timeToday: [0, 0],
        collapsed: false,
        desc: t.description || '',
        dyn: 0,
        conf: 1,
        extendNew: 10,
        extendRev: 50,
      };
    }

    // Basic model (id=1000000000)
    const modelId = 1000000000;
    const modelsMap: Record<string, Record<string, unknown>> = {
      [String(modelId)]: {
        id: modelId,
        name: 'Basic',
        type: 0,
        mod: now,
        usn: -1,
        sortf: 0,
        did: 1,
        tmpls: [
          {
            name: 'Card 1',
            ord: 0,
            qfmt: '{{Front}}',
            afmt: '{{FrontSide}}<hr id=answer>{{Back}}',
            bqfmt: '',
            bafmt: '',
            did: null,
            bfont: '',
            bsize: 0,
          },
        ],
        flds: [
          { name: 'Front', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
          { name: 'Back', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
        ],
        css: '.card {\n font-family: arial;\n font-size: 20px;\n text-align: center;\n color: black;\n background-color: white;\n}',
        latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
        latexPost: '\\end{document}',
        latexsvg: false,
        req: [[0, 'all', [0]]],
        tags: [],
        vers: [],
      },
    };

    // Default deck config
    const dconfMap: Record<string, Record<string, unknown>> = {
      '1': {
        id: 1,
        mod: 0,
        name: 'Default',
        usn: 0,
        maxTaken: 60,
        autoplay: true,
        timer: 0,
        replayq: true,
        new: { ints: [1, 10, 0, 0], initialFactor: 2500, separate: true, order: 1, perDay: 20, delays: [1, 10], bury: true },
        rev: { bury: true, ivlFct: 1, maxIvl: 36500, perDay: 200, ease4: 1.3, minSpace: 1, fuzz: 0.05 },
        lapse: { leechFails: 8, minInt: 1, delays: [10], leechAction: 0, mult: 0 },
        dyn: false,
      },
    };

    const colConf = JSON.stringify({
      activeDecks: [1],
      curDeck: 1,
      newSpread: 0,
      collapseTime: 1200,
      timeLim: 0,
      estTimes: true,
      dueCounts: true,
      curModel: String(modelId),
      nextPos: 1,
      sortType: 'noteFld',
      sortBackwards: false,
      addToCur: true,
    });

    ankiDb.run(
      `INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, '{}')`,
      [now, now, now * 1000, colConf, JSON.stringify(modelsMap), JSON.stringify(deckMapOut), JSON.stringify(dconfMap)]
    );

    // Export all cards
    let noteIdCounter = 1000000000;
    let cardIdCounter = 1000000000;

    /** Get text content for a card side */
    function getSideText(cardId: string, side: 0 | 1): string {
      const sideRow = queryOne<CardSideRow>(
        'SELECT id FROM card_sides WHERE card_id = ? AND side = ?',
        [cardId, side]
      );
      if (!sideRow) return '';
      const blocks = queryAll<TextBlock>(
        `SELECT text_content FROM media_blocks
         WHERE card_side_id = ? AND block_type = 'text'
         ORDER BY sort_order`,
        [sideRow.id]
      );
      return blocks
        .map(b => b.text_content || '')
        .filter(Boolean)
        .join('\n')
        .trim();
    }

    const allCards = queryAll<CardWithTopic>(
      `SELECT c.id, c.card_set_id, cs.topic_id
       FROM cards c
       JOIN card_sets cs ON cs.id = c.card_set_id
       ORDER BY cs.topic_id, c.sort_order`
    );

    for (const card of allCards) {
      const front = getSideText(card.id, 0);
      const back = getSideText(card.id, 1);
      if (!front && !back) continue;

      const noteId = noteIdCounter++;
      const ankiCardId = cardIdCounter++;
      const deckId = topicToDeckId[card.topic_id] || 1;

      // Simple checksum of the sort field (first 8 chars of front, as integer)
      let csum = 0;
      for (let i = 0; i < Math.min(front.length, 8); i++) {
        csum = (csum * 31 + front.charCodeAt(i)) >>> 0;
      }

      const flds = front + '\x1f' + back;
      const guid = genId().slice(0, 10);

      ankiDb.run(
        `INSERT INTO notes VALUES (?, ?, ?, ?, -1, '', ?, ?, ?, 0, '')`,
        [noteId, guid, modelId, now, flds, front.slice(0, 100), csum]
      );

      ankiDb.run(
        `INSERT INTO cards VALUES (?, ?, ?, 0, ?, -1, 0, 0, ?, 0, 2500, 0, 0, 0, 0, 0, 0, '')`,
        [ankiCardId, noteId, deckId, now, noteIdCounter]
      );
    }

    // Export as buffer
    const ankiData = ankiDb.export();
    ankiDb.close();

    // Create ZIP (.apkg)
    const zip = new AdmZip();
    zip.addFile('collection.anki21', Buffer.from(ankiData));
    zip.addFile('media', Buffer.from('{}'));

    const zipBuffer = zip.toBuffer();
    const today = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="learn-me-stupid-${today}.apkg"`);
    res.send(zipBuffer);
  } catch (err: unknown) {
    logger.error({ err }, 'Error exporting Anki .apkg');
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Failed to export .apkg: ${message}` });
  }
});

export default router;
