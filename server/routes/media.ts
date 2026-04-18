import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { queryOne, run, CardSideRow, MediaBlockRow, MaxOrderRow } from '../db/index.js';
import { v4 as uuid } from 'uuid';
import logger from '../logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/png', 'image/jpeg', 'image/webp', 'image/gif',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm',
      'video/mp4', 'video/webm', 'video/quicktime',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

function detectBlockType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'text';
}

const router = Router();

// POST /api/media/upload — Upload file
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or unsupported type' });
    }

    const { cardSideId } = req.body as { cardSideId?: string };
    if (!cardSideId) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'cardSideId is required' });
    }

    const side = queryOne<CardSideRow>('SELECT * FROM card_sides WHERE id = ?', [cardSideId]);
    if (!side) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Card side not found' });
    }

    const blockType = detectBlockType(req.file.mimetype);
    const blockId = uuid().replace(/-/g, '').slice(0, 16);
    const maxOrder = queryOne<MaxOrderRow>(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM media_blocks WHERE card_side_id = ?',
      [cardSideId]
    );
    const nextOrder = maxOrder?.next ?? 0;

    run(
      `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, file_path, file_name, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [blockId, cardSideId, blockType, nextOrder, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype]
    );

    const block = queryOne<MediaBlockRow>('SELECT * FROM media_blocks WHERE id = ?', [blockId]);
    res.status(201).json(block);
  } catch (err) {
    logger.error({ err }, 'Error uploading media');
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

// DELETE /api/media/:id — Delete media block + file
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const block = queryOne<MediaBlockRow>('SELECT * FROM media_blocks WHERE id = ?', [id]);
    if (!block) return res.status(404).json({ error: 'Media block not found' });

    // Delete file if it exists (use basename to prevent path traversal)
    if (block.file_path) {
      const safeName = path.basename(block.file_path);
      const filePath = path.join(UPLOADS_DIR, safeName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    run('DELETE FROM media_blocks WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Error deleting media');
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

// PATCH /api/media/reorder — Reorder media blocks within a side
router.patch('/reorder', (req: Request, res: Response) => {
  try {
    const { blockIds } = req.body as { blockIds?: string[] };
    if (!Array.isArray(blockIds)) {
      return res.status(400).json({ error: 'blockIds array is required' });
    }

    for (let i = 0; i < blockIds.length; i++) {
      run('UPDATE media_blocks SET sort_order = ? WHERE id = ?', [i, blockIds[i]]);
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Error reordering media');
    res.status(500).json({ error: 'Failed to reorder media' });
  }
});

export default router;
