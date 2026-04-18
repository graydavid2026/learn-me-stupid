import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB layer before importing the router
vi.mock('../../db/index.js', () => ({
  queryAll: vi.fn(),
  queryOne: vi.fn(),
}));

import { queryAll, queryOne } from '../../db/index.js';

// We test the route handlers by importing the router and simulating Express req/res.
// Since the router uses queryAll/queryOne directly (no middleware), we can call handlers
// via a lightweight mock.

/** Build a mock Express response */
function mockRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    _headers: {} as Record<string, string>,
  };
  res.setHeader.mockImplementation((k: string, v: string) => {
    res._headers[k] = v;
    return res;
  });
  return res;
}

/** Extract route handler from the router stack */
async function getHandler(method: string, path: string) {
  const mod = await import('../export.js');
  const router = mod.default;
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method]
  );
  if (!layer) throw new Error(`No ${method.toUpperCase()} ${path} handler found`);
  return layer.route.stack[0].handle;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /csv
// ---------------------------------------------------------------------------
describe('GET /csv', () => {
  it('returns CSV with header and data rows', async () => {
    const handler = await getHandler('get', '/csv');
    const mockedQueryAll = vi.mocked(queryAll);
    const mockedQueryOne = vi.mocked(queryOne);

    // Main query returns one card row
    mockedQueryAll.mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('FROM cards c')) {
        return [
          {
            id: 'card1',
            sr_slot: 4,
            sr_total_reviews: 10,
            sr_total_correct: 8,
            sr_last_reviewed_at: '2024-01-15',
            sr_next_due_at: '2024-01-16',
            created_at: '2024-01-01',
            set_name: 'Set A',
            topic_name: 'Topic X',
          },
        ];
      }
      // sideText → media_blocks query
      if (sql.includes('FROM media_blocks')) {
        return [{ text_content: 'Hello world' }];
      }
      return [];
    });

    // sideText → card_sides query
    mockedQueryOne.mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('FROM card_sides')) {
        return { id: 'side1' };
      }
      return null;
    });

    const res = mockRes();
    handler({}, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.send).toHaveBeenCalledTimes(1);

    const csv = res.send.mock.calls[0][0] as string;
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'topic_name,set_name,front_text,back_text,sr_slot,sr_total_reviews,sr_total_correct,sr_last_reviewed_at,sr_next_due_at,created_at'
    );
    expect(lines.length).toBe(2); // header + 1 data row
    expect(lines[1]).toContain('Topic X');
    expect(lines[1]).toContain('Set A');
  });

  it('escapes CSV fields with commas and quotes', async () => {
    const handler = await getHandler('get', '/csv');
    const mockedQueryAll = vi.mocked(queryAll);
    const mockedQueryOne = vi.mocked(queryOne);

    mockedQueryAll.mockImplementation((sql: string) => {
      if (sql.includes('FROM cards c')) {
        return [
          {
            id: 'card1',
            sr_slot: 0,
            sr_total_reviews: 0,
            sr_total_correct: 0,
            sr_last_reviewed_at: '',
            sr_next_due_at: '',
            created_at: '2024-01-01',
            set_name: 'Set "A"',
            topic_name: 'Topic, with comma',
          },
        ];
      }
      if (sql.includes('FROM media_blocks')) {
        return [{ text_content: 'Line1\nLine2' }];
      }
      return [];
    });

    mockedQueryOne.mockImplementation(() => ({ id: 'side1' }));

    const res = mockRes();
    handler({}, res);

    const csv = res.send.mock.calls[0][0] as string;
    // Topic with comma should be quoted
    expect(csv).toContain('"Topic, with comma"');
    // Set with quotes should have doubled quotes
    expect(csv).toContain('"Set ""A"""');
    // Text with newline should be quoted
    expect(csv).toContain('"Line1\nLine2"');
  });

  it('returns empty CSV (header only) when no cards exist', async () => {
    const handler = await getHandler('get', '/csv');
    vi.mocked(queryAll).mockReturnValue([]);

    const res = mockRes();
    handler({}, res);

    const csv = res.send.mock.calls[0][0] as string;
    const lines = csv.split('\n');
    expect(lines.length).toBe(1); // header only
  });

  it('returns 500 on DB error', async () => {
    const handler = await getHandler('get', '/csv');
    vi.mocked(queryAll).mockImplementation(() => {
      throw new Error('DB connection failed');
    });

    const res = mockRes();
    handler({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to export CSV' });
  });

  it('sets Content-Disposition with date-stamped filename', async () => {
    const handler = await getHandler('get', '/csv');
    vi.mocked(queryAll).mockReturnValue([]);

    const res = mockRes();
    handler({}, res);

    const disposition = res._headers['Content-Disposition'];
    expect(disposition).toMatch(/learn-me-stupid-export-\d{4}-\d{2}-\d{2}\.csv/);
  });
});

// ---------------------------------------------------------------------------
// GET /json
// ---------------------------------------------------------------------------
describe('GET /json', () => {
  it('returns structured JSON with topics, sets, and cards', async () => {
    const handler = await getHandler('get', '/json');
    const mockedQueryAll = vi.mocked(queryAll);

    mockedQueryAll.mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('FROM topics')) {
        return [{ id: 't1', name: 'Math', description: 'Numbers', color: '#f00', icon: '📐', sort_order: 0, created_at: '2024-01-01' }];
      }
      if (sql.includes('FROM card_sets')) {
        return [{ id: 's1', topic_id: 't1', name: 'Algebra', description: null, sort_order: 0, created_at: '2024-01-01' }];
      }
      if (sql.includes('FROM cards')) {
        return [{
          id: 'c1', card_set_id: 's1', sort_order: 0, tags: '["math"]',
          sr_slot: 5, sr_total_reviews: 3, sr_total_correct: 2,
          sr_last_reviewed_at: '2024-01-10', sr_next_due_at: '2024-01-13',
          sr_is_active: 1, created_at: '2024-01-01',
        }];
      }
      if (sql.includes('FROM card_sides')) {
        return [
          { id: 'fs1', card_id: 'c1', side: 0 },
          { id: 'bs1', card_id: 'c1', side: 1 },
        ];
      }
      if (sql.includes('FROM media_blocks')) {
        return [{ block_type: 'text', sort_order: 0, text_content: 'What is x?', file_path: null, file_name: null, file_size: null, mime_type: null, youtube_url: null, youtube_embed_id: null }];
      }
      return [];
    });

    const res = mockRes();
    handler({}, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.json).toHaveBeenCalledTimes(1);

    const data = res.json.mock.calls[0][0];
    expect(data.version).toBe('1.0');
    expect(data.exportedAt).toBeDefined();
    expect(data.topics).toHaveLength(1);
    expect(data.topics[0].name).toBe('Math');
    expect(data.topics[0].sets).toHaveLength(1);
    expect(data.topics[0].sets[0].name).toBe('Algebra');
    expect(data.topics[0].sets[0].cards).toHaveLength(1);
    expect(data.topics[0].sets[0].cards[0].sr.slot).toBe(5);
    expect(data.topics[0].sets[0].cards[0].tags).toEqual(['math']);
  });

  it('returns 500 on DB error', async () => {
    const handler = await getHandler('get', '/json');
    vi.mocked(queryAll).mockImplementation(() => {
      throw new Error('DB error');
    });

    const res = mockRes();
    handler({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to export JSON' });
  });
});

// ---------------------------------------------------------------------------
// GET /stats
// ---------------------------------------------------------------------------
describe('GET /stats', () => {
  it('returns aggregated stats', async () => {
    const handler = await getHandler('get', '/stats');
    const mockedQueryAll = vi.mocked(queryAll);
    const mockedQueryOne = vi.mocked(queryOne);

    mockedQueryOne.mockImplementation((sql: string) => {
      if (sql.includes('COUNT(*) as count FROM cards')) return { count: 50 };
      if (sql.includes('COUNT(*) as count FROM review_log') && !sql.includes('correct')) return { count: 100 };
      if (sql.includes("result = 'correct'")) return { count: 80 };
      return null;
    });

    mockedQueryAll.mockImplementation((sql: string) => {
      if (sql.includes('review_log rl')) {
        return [{ topic_name: 'Math', reviews: 50, correct: 40 }];
      }
      if (sql.includes('sr_slot as slot')) {
        return [{ slot: 4, count: 10 }, { slot: 5, count: 20 }];
      }
      if (sql.includes('DISTINCT date')) {
        // Simulate a 2-day streak
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return [
          { day: today.toISOString().slice(0, 10) },
          { day: yesterday.toISOString().slice(0, 10) },
        ];
      }
      return [];
    });

    const res = mockRes();
    handler({}, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const data = res.json.mock.calls[0][0];
    expect(data.totalCards).toBe(50);
    expect(data.totalReviews).toBe(100);
    expect(data.totalCorrect).toBe(80);
    expect(data.overallAccuracy).toBe(80);
    expect(data.accuracyByTopic).toHaveLength(1);
    expect(data.accuracyByTopic[0].accuracy).toBe(80);
    expect(data.slotDistribution).toHaveLength(2);
    expect(data.streak).toBe(2);
  });

  it('returns 0 accuracy when no reviews', async () => {
    const handler = await getHandler('get', '/stats');
    vi.mocked(queryOne).mockReturnValue({ count: 0 });
    vi.mocked(queryAll).mockReturnValue([]);

    const res = mockRes();
    handler({}, res);

    const data = res.json.mock.calls[0][0];
    expect(data.overallAccuracy).toBe(0);
    expect(data.streak).toBe(0);
  });
});
