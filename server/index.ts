import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/index.js';
import { migrate } from './db/migrate.js';
import topicsRouter from './routes/topics.js';
import setsRouter from './routes/sets.js';
import cardsRouter from './routes/cards.js';
import mediaRouter from './routes/media.js';
import studyRouter from './routes/study.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/topics', topicsRouter);
app.use('/api', setsRouter);
app.use('/api', cardsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/study', studyRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  await initDb();
  // Run migrations on startup
  await migrate();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
