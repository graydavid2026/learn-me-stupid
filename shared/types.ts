// === Database Row Types ===

export interface Topic {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  parent_topic_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CardSet {
  id: string;
  topic_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  card_set_id: string;
  sort_order: number;
  tags: string; // JSON array string
  card_type: 'standard' | 'cloze' | 'typing';
  created_at: string;
  updated_at: string;
  sr_tier: number;
  sr_last_reviewed_at: string | null;
  sr_next_due_at: string | null;
  sr_consecutive_correct: number;
  sr_consecutive_wrong: number;
  sr_total_reviews: number;
  sr_total_correct: number;
  sr_is_active: number; // 0 or 1
}

export interface CardSide {
  id: string;
  card_id: string;
  side: 0 | 1; // 0=front, 1=back
  created_at: string;
}

export interface MediaBlock {
  id: string;
  card_side_id: string;
  block_type: 'text' | 'image' | 'audio' | 'video' | 'youtube';
  sort_order: number;
  text_content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  youtube_url: string | null;
  youtube_embed_id: string | null;
  created_at: string;
}

export interface MindmapNode {
  id: string;
  topic_id: string;
  label: string;
  node_type: 'topic' | 'card_set' | 'card' | 'custom';
  ref_id: string | null;
  x: number;
  y: number;
  color: string | null;
  parent_node_id: string | null;
  created_at: string;
}

export interface MindmapEdge {
  id: string;
  topic_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  edge_type: string;
}

export interface ReviewLog {
  id: string;
  card_id: string;
  reviewed_at: string;
  result: 'correct' | 'wrong';
  tier_before: number;
  tier_after: number;
  response_time_ms: number | null;
}

// === API Response Types ===

export interface TopicWithCounts extends Topic {
  card_count: number;
  due_count: number;
}

export interface CardSetWithCounts extends CardSet {
  card_count: number;
  due_count: number;
}

export interface CardFull extends Card {
  front: CardSideFull;
  back: CardSideFull;
}

export interface CardSideFull extends CardSide {
  media_blocks: MediaBlock[];
}

// === API Request Types ===

export interface CreateTopicRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_topic_id?: string;
}

export interface UpdateTopicRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_topic_id?: string | null;
  sort_order?: number;
}

export interface CreateCardSetRequest {
  name: string;
  description?: string;
}

export interface UpdateCardSetRequest {
  name?: string;
  description?: string;
  sort_order?: number;
}

export interface ReviewRequest {
  cardId: string;
  result: 'correct' | 'wrong';
  response_time_ms?: number;
}

// === SR Types ===

export const SLOT_LABELS: Record<number, string> = {
  0: 'New', 1: '10m', 2: '1h', 3: '4h', 4: '1d', 5: '3d', 6: '1w',
  7: '2w', 8: '1mo', 9: '2mo', 10: '4mo', 11: '8mo', 12: '1yr', 13: '2yr',
};

// Keep TIER_LABELS as alias for backward compat during migration
export const TIER_LABELS = SLOT_LABELS;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export const SLOT_INTERVALS_MS: Record<number, number> = {
  1: 10 * 60 * 1000,
  2: 1 * HOUR,
  3: 4 * HOUR,
  4: 1 * DAY,
  5: 3 * DAY,
  6: 1 * WEEK,
  7: 2 * WEEK,
  8: 4 * WEEK,
  9: 8 * WEEK,
  10: 120 * DAY,
  11: 240 * DAY,
  12: 365 * DAY,
  13: 730 * DAY,
};

export const TIER_INTERVALS_MS = SLOT_INTERVALS_MS;
