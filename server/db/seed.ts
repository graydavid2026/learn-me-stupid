import { initDb, run, exec } from './index.js';

async function seed() {
  await initDb();

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
