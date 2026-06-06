import { initDb, run, exec, queryOne } from './index.js';

async function seed() {
  await initDb();

  // Safety guard: db:seed is destructive (DELETE FROM card_sets/topics). Refuse
  // to run if real data already exists or we're in production, unless explicitly
  // forced with --force or SEED_FORCE=true. This sample data (topic001/set001 …)
  // is the fingerprint of an accidental seed-over-real-data wipe.
  const forced = process.argv.includes('--force') || process.env.SEED_FORCE === 'true';
  const existing = queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM topics')?.n ?? 0;
  if ((existing > 0 || process.env.NODE_ENV === 'production') && !forced) {
    console.error(
      `Refusing to seed: ${existing} topic(s) already present` +
      (process.env.NODE_ENV === 'production' ? ' (NODE_ENV=production)' : '') +
      '. This would DELETE all topics, sets, cards and review history. ' +
      'Re-run with --force (or SEED_FORCE=true) only if you truly want a clean sample DB.'
    );
    process.exit(1);
  }

  // Clear existing data
  exec('DELETE FROM card_sets; DELETE FROM topics;');

  // Insert sample topics
  run(
    `INSERT INTO topics (id, name, description, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    ['topic001', 'JavaScript', 'Core JS concepts and patterns', '#f59e0b', 'code', 0]
  );
  run(
    `INSERT INTO topics (id, name, description, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    ['topic002', 'Data Structures', 'Arrays, trees, graphs, and more', '#22c55e', 'database', 1]
  );
  run(
    `INSERT INTO topics (id, name, description, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    ['topic003', 'System Design', 'Distributed systems and architecture', '#6366f1', 'server', 2]
  );

  // Insert sample card sets
  run(
    `INSERT INTO card_sets (id, topic_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)`,
    ['set001', 'topic001', 'Closures & Scope', 'Understanding lexical scope and closures', 0]
  );
  run(
    `INSERT INTO card_sets (id, topic_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)`,
    ['set002', 'topic001', 'Promises & Async', 'Async patterns in JavaScript', 1]
  );
  run(
    `INSERT INTO card_sets (id, topic_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)`,
    ['set003', 'topic002', 'Binary Trees', 'Tree traversals and operations', 0]
  );

  console.log('Database seeded successfully');
}

seed().catch(console.error);
