import { Router, Request, Response } from 'express';
import { queryOne, run, getDb, MaxOrderRow } from '../db/index.js';
import { v4 as uuid } from 'uuid';
import logger from '../logger.js';

const router = Router();

function genId(): string {
  return uuid().replace(/-/g, '').slice(0, 16);
}

interface ImportMediaBlock {
  block_type?: string;
  sort_order?: number;
  text_content?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  youtube_url?: string | null;
  youtube_embed_id?: string | null;
}

interface ImportCard {
  tags?: string[];
  front?: ImportMediaBlock[];
  back?: ImportMediaBlock[];
}

interface ImportSet {
  name?: string;
  description?: string | null;
  cards?: ImportCard[];
}

interface ImportTopic {
  name?: string;
  description?: string | null;
  color?: string;
  icon?: string;
  sets?: ImportSet[];
}

interface ImportJsonBody {
  topics?: ImportTopic[];
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

/** Create a card with front/back text blocks. Returns the card id. */
function createCard(
  setId: string,
  frontText: string,
  backText: string,
  tags: string[] = []
): string {
  const cardId = genId();
  const maxOrder = queryOne<MaxOrderRow>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM cards WHERE card_set_id = ?',
    [setId]
  );

  run(
    `INSERT INTO cards (id, card_set_id, sort_order, tags) VALUES (?, ?, ?, ?)`,
    [cardId, setId, maxOrder!.next, JSON.stringify(tags)]
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

/**
 * Parse CSV text into rows. Handles quoted fields with commas, newlines, and
 * escaped quotes (doubled ""). This is intentionally simple -- no external deps.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const row: string[] = [];
    while (i < len) {
      let value = '';
      if (text[i] === '"') {
        // Quoted field
        i++; // skip opening quote
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              value += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            value += text[i];
            i++;
          }
        }
      } else {
        // Unquoted field
        while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          value += text[i];
          i++;
        }
      }
      row.push(value);
      if (i < len && text[i] === ',') {
        i++; // skip comma, continue to next field
      } else {
        break; // end of row
      }
    }
    // Skip line endings
    if (i < len && text[i] === '\r') i++;
    if (i < len && text[i] === '\n') i++;
    // Skip fully empty rows (trailing newline)
    if (row.length === 1 && row[0] === '' && i >= len) break;
    rows.push(row);
  }

  return rows;
}

// POST /api/import/csv
router.post('/csv', (req: Request, res: Response) => {
  try {
    const { csv } = req.body as { csv?: string };
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'Request body must include a "csv" string field' });
    }

    const rows = parseCsv(csv.trim());
    if (rows.length < 2) {
      return res.status(400).json({ error: 'CSV must have a header row and at least one data row' });
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const frontIdx = header.indexOf('front_text');
    const backIdx = header.indexOf('back_text');
    if (frontIdx === -1 || backIdx === -1) {
      return res.status(400).json({
        error: 'CSV must have "front_text" and "back_text" columns. Optional: "topic_name", "set_name".',
      });
    }
    const topicIdx = header.indexOf('topic_name');
    const setIdx = header.indexOf('set_name');

    const errors: string[] = [];
    let imported = 0;
    const defaultTopicName = 'Imported';
    const defaultSetName = 'Imported Cards';

    const d = getDb();
    d.exec('BEGIN TRANSACTION');
    try {
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const front = row[frontIdx]?.trim() || '';
        const back = row[backIdx]?.trim() || '';
        if (!front && !back) {
          errors.push(`Row ${r + 1}: both front and back are empty, skipped`);
          continue;
        }

        const topicName = (topicIdx >= 0 ? row[topicIdx]?.trim() : '') || defaultTopicName;
        const setName = (setIdx >= 0 ? row[setIdx]?.trim() : '') || defaultSetName;

        try {
          const topicId = findOrCreateTopic(topicName);
          const setId = findOrCreateSet(topicId, setName);
          createCard(setId, front, back);
          imported++;
        } catch (rowErr: unknown) {
          const message = rowErr instanceof Error ? rowErr.message : String(rowErr);
          errors.push(`Row ${r + 1}: ${message}`);
        }
      }
      d.exec('COMMIT');
    } catch (txErr) {
      d.exec('ROLLBACK');
      throw txErr;
    }

    res.json({ imported, errors });
  } catch (err) {
    logger.error({ err }, 'Error importing CSV');
    res.status(500).json({ error: 'Failed to import CSV' });
  }
});

// POST /api/import/json
router.post('/json', (req: Request, res: Response) => {
  try {
    const data = req.body as ImportJsonBody;
    if (!data || !Array.isArray(data.topics)) {
      return res.status(400).json({
        error: 'Request body must match the JSON export format with a "topics" array',
      });
    }

    let imported = 0;
    let skipped = 0;

    const d = getDb();
    d.exec('BEGIN TRANSACTION');
    try {
      for (const topic of data.topics) {
        if (!topic.name) {
          skipped++;
          continue;
        }
        const topicId = findOrCreateTopic(topic.name);

        // Update topic metadata if provided
        if (topic.color || topic.icon || topic.description) {
          run(
            `UPDATE topics SET
              color = COALESCE(?, color),
              icon = COALESCE(?, icon),
              description = COALESCE(?, description)
            WHERE id = ?`,
            [topic.color || null, topic.icon || null, topic.description || null, topicId]
          );
        }

        const sets = Array.isArray(topic.sets) ? topic.sets : [];
        for (const set of sets) {
          if (!set.name) {
            skipped++;
            continue;
          }
          const setId = findOrCreateSet(topicId, set.name);

          const cards = Array.isArray(set.cards) ? set.cards : [];
          for (const card of cards) {
            const frontBlocks: ImportMediaBlock[] = Array.isArray(card.front) ? card.front : [];
            const backBlocks: ImportMediaBlock[] = Array.isArray(card.back) ? card.back : [];

            if (frontBlocks.length === 0 && backBlocks.length === 0) {
              skipped++;
              continue;
            }

            const cardId = genId();
            const maxOrder = queryOne<MaxOrderRow>(
              'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM cards WHERE card_set_id = ?',
              [setId]
            );
            const tags = Array.isArray(card.tags) ? card.tags : [];

            // Create card -- fresh SR state (no importing SR data)
            run(
              `INSERT INTO cards (id, card_set_id, sort_order, tags) VALUES (?, ?, ?, ?)`,
              [cardId, setId, maxOrder!.next, JSON.stringify(tags)]
            );

            // Front side with all blocks
            const frontSideId = genId();
            run(`INSERT INTO card_sides (id, card_id, side) VALUES (?, ?, 0)`, [frontSideId, cardId]);
            for (let i = 0; i < frontBlocks.length; i++) {
              const block = frontBlocks[i];
              run(
                `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, text_content, file_path, file_name, file_size, mime_type, youtube_url, youtube_embed_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  genId(), frontSideId, block.block_type || 'text', block.sort_order ?? i,
                  block.text_content || null, block.file_path || null, block.file_name || null,
                  block.file_size || null, block.mime_type || null,
                  block.youtube_url || null, block.youtube_embed_id || null,
                ]
              );
            }

            // Back side with all blocks
            const backSideId = genId();
            run(`INSERT INTO card_sides (id, card_id, side) VALUES (?, ?, 1)`, [backSideId, cardId]);
            for (let i = 0; i < backBlocks.length; i++) {
              const block = backBlocks[i];
              run(
                `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, text_content, file_path, file_name, file_size, mime_type, youtube_url, youtube_embed_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  genId(), backSideId, block.block_type || 'text', block.sort_order ?? i,
                  block.text_content || null, block.file_path || null, block.file_name || null,
                  block.file_size || null, block.mime_type || null,
                  block.youtube_url || null, block.youtube_embed_id || null,
                ]
              );
            }

            imported++;
          }
        }
      }
      d.exec('COMMIT');
    } catch (txErr) {
      d.exec('ROLLBACK');
      throw txErr;
    }

    res.json({ imported, skipped });
  } catch (err) {
    logger.error({ err }, 'Error importing JSON');
    res.status(500).json({ error: 'Failed to import JSON' });
  }
});

export default router;
