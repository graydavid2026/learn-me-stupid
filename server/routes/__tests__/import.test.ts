import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB layer and uuid
vi.mock('../../db/index.js', () => ({
  queryOne: vi.fn(),
  run: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
}));

import { queryOne, run, getDb } from '../../db/index.js';

function mockRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

function mockReq(body: any) {
  return { body } as any;
}

/** Extract route handler from the router stack */
async function getHandler(method: string, path: string) {
  // Re-import to get fresh module with mocks
  const mod = await import('../import.js');
  const router = mod.default;
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method]
  );
  if (!layer) throw new Error(`No ${method.toUpperCase()} ${path} handler found`);
  return layer.route.stack[0].handle;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default DB mock: getDb returns exec mock
  vi.mocked(getDb).mockReturnValue({ exec: vi.fn() } as any);
  // Default run: no-op (allows INSERTs to succeed)
  vi.mocked(run).mockImplementation(() => {});
  // Default queryOne: return next sort_order, or null for lookups
  vi.mocked(queryOne).mockImplementation((sql: string, params?: any[]) => {
    if (sql.includes('MAX(sort_order)')) return { next: 0 };
    if (sql.includes('SELECT id FROM topics')) return null; // not found → create
    if (sql.includes('SELECT id FROM card_sets')) return null;
    return null;
  });
});

// ---------------------------------------------------------------------------
// POST /csv
// ---------------------------------------------------------------------------
describe('POST /csv', () => {
  it('imports cards from valid CSV with topic and set columns', async () => {
    const handler = await getHandler('post', '/csv');
    const csv = [
      'topic_name,set_name,front_text,back_text',
      'Math,Algebra,What is 2+2?,4',
      'Math,Algebra,What is 3+3?,6',
    ].join('\n');

    const res = mockRes();
    handler(mockReq({ csv }), res);

    expect(res.json).toHaveBeenCalledWith({ imported: 2, errors: [] });
    // Should have called run for INSERT INTO topics, card_sets, cards, card_sides, media_blocks
    expect(vi.mocked(run)).toHaveBeenCalled();
  });

  it('uses default topic/set when columns are missing', async () => {
    const handler = await getHandler('post', '/csv');
    const csv = 'front_text,back_text\nHello,World';

    const res = mockRes();
    handler(mockReq({ csv }), res);

    expect(res.json).toHaveBeenCalledWith({ imported: 1, errors: [] });
  });

  it('returns 400 when csv field is missing', async () => {
    const handler = await getHandler('post', '/csv');
    const res = mockRes();
    handler(mockReq({}), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Request body must include a "csv" string field',
    });
  });

  it('returns 400 when csv is not a string', async () => {
    const handler = await getHandler('post', '/csv');
    const res = mockRes();
    handler(mockReq({ csv: 123 }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when CSV has no data rows', async () => {
    const handler = await getHandler('post', '/csv');
    const res = mockRes();
    handler(mockReq({ csv: 'front_text,back_text' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'CSV must have a header row and at least one data row',
    });
  });

  it('returns 400 when required columns are missing', async () => {
    const handler = await getHandler('post', '/csv');
    const csv = 'col_a,col_b\nfoo,bar';

    const res = mockRes();
    handler(mockReq({ csv }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toContain('front_text');
  });

  it('skips rows where both front and back are empty', async () => {
    const handler = await getHandler('post', '/csv');
    const csv = 'front_text,back_text\n,\nHello,World';

    const res = mockRes();
    handler(mockReq({ csv }), res);

    const result = res.json.mock.calls[0][0];
    expect(result.imported).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Row 2');
  });

  it('handles CSV with quoted fields containing commas', async () => {
    const handler = await getHandler('post', '/csv');
    const csv = 'front_text,back_text\n"What is 1,000 + 1?","1,001"';

    const res = mockRes();
    handler(mockReq({ csv }), res);

    expect(res.json).toHaveBeenCalledWith({ imported: 1, errors: [] });
  });

  it('handles CSV with escaped quotes (doubled)', async () => {
    const handler = await getHandler('post', '/csv');
    const csv = 'front_text,back_text\n"She said ""hello""",World';

    const res = mockRes();
    handler(mockReq({ csv }), res);

    expect(res.json).toHaveBeenCalledWith({ imported: 1, errors: [] });
  });

  it('rolls back transaction on DB error and returns 500', async () => {
    const handler = await getHandler('post', '/csv');
    const execMock = vi.fn().mockImplementation((sql: string) => {
      // Simulate a failure on COMMIT to trigger ROLLBACK path
      if (sql === 'COMMIT') throw new Error('COMMIT failed');
    });
    vi.mocked(getDb).mockReturnValue({ exec: execMock } as any);

    const csv = 'front_text,back_text\nQ1,A1';
    const res = mockRes();
    handler(mockReq({ csv }), res);

    // Should have called ROLLBACK after COMMIT failed
    expect(execMock).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('reuses existing topic when found', async () => {
    const handler = await getHandler('post', '/csv');
    vi.mocked(queryOne).mockImplementation((sql: string) => {
      if (sql.includes('SELECT id FROM topics')) return { id: 'existing-topic' };
      if (sql.includes('SELECT id FROM card_sets')) return null;
      if (sql.includes('MAX(sort_order)')) return { next: 0 };
      return null;
    });

    const csv = 'topic_name,front_text,back_text\nMath,Q,A';
    const res = mockRes();
    handler(mockReq({ csv }), res);

    expect(res.json).toHaveBeenCalledWith({ imported: 1, errors: [] });
    // Should NOT have inserted a new topic
    const runCalls = vi.mocked(run).mock.calls;
    const topicInserts = runCalls.filter(c => (c[0] as string).includes('INSERT INTO topics'));
    expect(topicInserts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// POST /json
// ---------------------------------------------------------------------------
describe('POST /json', () => {
  it('imports cards from valid JSON export format', async () => {
    const handler = await getHandler('post', '/json');
    const body = {
      topics: [
        {
          name: 'Science',
          color: '#00f',
          icon: null,
          description: 'Natural science',
          sets: [
            {
              name: 'Physics',
              cards: [
                {
                  front: [{ block_type: 'text', text_content: 'What is gravity?', sort_order: 0 }],
                  back: [{ block_type: 'text', text_content: '9.8 m/s^2', sort_order: 0 }],
                  tags: ['physics'],
                },
              ],
            },
          ],
        },
      ],
    };

    const res = mockRes();
    handler(mockReq(body), res);

    expect(res.json).toHaveBeenCalledWith({ imported: 1, skipped: 0 });
  });

  it('returns 400 when topics array is missing', async () => {
    const handler = await getHandler('post', '/json');
    const res = mockRes();
    handler(mockReq({ foo: 'bar' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toContain('topics');
  });

  it('returns 400 when body is null', async () => {
    const handler = await getHandler('post', '/json');
    const res = mockRes();
    handler(mockReq(null), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('skips topics without a name', async () => {
    const handler = await getHandler('post', '/json');
    const body = {
      topics: [
        { name: '', sets: [{ name: 'Set', cards: [] }] },
      ],
    };

    const res = mockRes();
    handler(mockReq(body), res);

    const result = res.json.mock.calls[0][0];
    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
  });

  it('skips sets without a name', async () => {
    const handler = await getHandler('post', '/json');
    const body = {
      topics: [
        { name: 'Topic', sets: [{ name: '', cards: [{ front: [{ block_type: 'text', text_content: 'Q' }], back: [] }] }] },
      ],
    };

    const res = mockRes();
    handler(mockReq(body), res);

    const result = res.json.mock.calls[0][0];
    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
  });

  it('skips cards with empty front and back blocks', async () => {
    const handler = await getHandler('post', '/json');
    const body = {
      topics: [
        {
          name: 'Topic',
          sets: [
            {
              name: 'Set',
              cards: [
                { front: [], back: [] },
                { front: [{ block_type: 'text', text_content: 'Q' }], back: [] },
              ],
            },
          ],
        },
      ],
    };

    const res = mockRes();
    handler(mockReq(body), res);

    const result = res.json.mock.calls[0][0];
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('handles cards with no tags gracefully', async () => {
    const handler = await getHandler('post', '/json');
    const body = {
      topics: [
        {
          name: 'Topic',
          sets: [
            {
              name: 'Set',
              cards: [{ front: [{ block_type: 'text', text_content: 'Q' }], back: [] }],
            },
          ],
        },
      ],
    };

    const res = mockRes();
    handler(mockReq(body), res);

    expect(res.json).toHaveBeenCalledWith({ imported: 1, skipped: 0 });
  });

  it('rolls back on DB error and returns 500', async () => {
    const handler = await getHandler('post', '/json');
    const execMock = vi.fn();
    vi.mocked(getDb).mockReturnValue({ exec: execMock } as any);

    vi.mocked(run).mockImplementation(() => {
      throw new Error('DB write failed');
    });

    const body = {
      topics: [
        {
          name: 'Topic',
          sets: [{ name: 'Set', cards: [{ front: [{ block_type: 'text', text_content: 'Q' }], back: [] }] }],
        },
      ],
    };

    const res = mockRes();
    handler(mockReq(body), res);

    expect(execMock).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('handles topics with missing sets array', async () => {
    const handler = await getHandler('post', '/json');
    const body = {
      topics: [{ name: 'Topic' }],
    };

    const res = mockRes();
    handler(mockReq(body), res);

    expect(res.json).toHaveBeenCalledWith({ imported: 0, skipped: 0 });
  });

  it('handles sets with missing cards array', async () => {
    const handler = await getHandler('post', '/json');
    const body = {
      topics: [{ name: 'Topic', sets: [{ name: 'Set' }] }],
    };

    const res = mockRes();
    handler(mockReq(body), res);

    expect(res.json).toHaveBeenCalledWith({ imported: 0, skipped: 0 });
  });

  it('updates topic metadata when color/icon/description provided', async () => {
    const handler = await getHandler('post', '/json');
    const body = {
      topics: [
        {
          name: 'Topic',
          color: '#ff0',
          icon: 'star',
          description: 'A topic',
          sets: [],
        },
      ],
    };

    const res = mockRes();
    handler(mockReq(body), res);

    // Should have called run with UPDATE topics
    const runCalls = vi.mocked(run).mock.calls;
    const updateCalls = runCalls.filter(c => (c[0] as string).includes('UPDATE topics'));
    expect(updateCalls.length).toBeGreaterThan(0);
  });
});
