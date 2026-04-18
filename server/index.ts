import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/index.js';
import logger from './logger.js';
import { migrate } from './db/migrate.js';
import topicsRouter from './routes/topics.js';
import setsRouter from './routes/sets.js';
import cardsRouter from './routes/cards.js';
import mediaRouter from './routes/media.js';
import studyRouter from './routes/study.js';
import searchRouter from './routes/search.js';
import exportRouter from './routes/export.js';
import importRouter from './routes/import.js';
import settingsRouter from './routes/settings.js';
import ankiRouter from './routes/anki.js';
import batchRouter from './routes/batch.js';
import pushRouter from './routes/push.js';
import { runBackupCycle, startScheduledBackups } from './services/backup.js';
import { checkAndSendDueReminder } from './services/pushNotifications.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      workerSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "blob:", "data:"],
      mediaSrc: ["'self'", "blob:", "data:"],
      connectSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "https://www.youtube.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/topics', topicsRouter);
app.use('/api', setsRouter);
app.use('/api', cardsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/study', studyRouter);
app.use('/api/search', searchRouter);
app.use('/api/export', exportRouter);
app.use('/api/import', importRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', ankiRouter);
app.use('/api/batch', batchRouter);
app.use('/api/push', pushRouter);

// Manual backup trigger
app.post('/api/backup/now', (_req, res) => {
  try {
    const result = runBackupCycle();
    res.json({ status: 'ok', backupPath: result.backupPath, prunedCount: result.removedCount });
  } catch (err: unknown) {
    logger.error({ err }, 'Manual backup failed');
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static client in production
if (process.env.NODE_ENV === 'production') {
  const clientDir = path.join(__dirname, '..', 'dist', 'client');
  app.use(express.static(clientDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

async function start() {
  await initDb();
  // Run migrations on startup
  await migrate();

  // Start scheduled daily backups
  startScheduledBackups();

  // Daily push notification reminder (check every 24 hours)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const reminderStartup = setTimeout(() => { checkAndSendDueReminder(); }, 30_000);
  if (reminderStartup.unref) reminderStartup.unref();
  const reminderInterval = setInterval(() => { checkAndSendDueReminder(); }, TWENTY_FOUR_HOURS);
  if (reminderInterval.unref) reminderInterval.unref();

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
