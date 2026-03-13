import { create } from 'zustand';

interface Topic {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  parent_topic_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  card_count: number;
  due_count: number;
}

interface CardSet {
  id: string;
  topic_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  card_count: number;
  due_count: number;
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
}

export interface CardSideFull {
  id: string;
  card_id?: string;
  side: 0 | 1;
  media_blocks: MediaBlock[];
}

export interface CardFull {
  id: string;
  card_set_id: string;
  sort_order: number;
  tags: string;
  created_at: string;
  updated_at: string;
  sr_tier: number;
  sr_last_reviewed_at: string | null;
  sr_next_due_at: string | null;
  sr_consecutive_correct: number;
  sr_consecutive_wrong: number;
  sr_total_reviews: number;
  sr_total_correct: number;
  sr_is_active: number;
  front: CardSideFull;
  back: CardSideFull;
}

interface AppState {
  // Topics
  topics: Topic[];
  selectedTopicId: string | null;
  loadingTopics: boolean;

  // Card Sets
  cardSets: CardSet[];
  loadingSets: boolean;

  // Cards
  cards: CardFull[];
  selectedCardId: string | null;
  loadingCards: boolean;
  editingCard: CardFull | null;
  showCardEditor: boolean;

  // Topic actions
  fetchTopics: () => Promise<void>;
  selectTopic: (id: string | null) => void;
  createTopic: (data: { name: string; description?: string; color?: string; icon?: string }) => Promise<void>;
  updateTopic: (id: string, data: Partial<Topic>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;

  // Card Set actions
  fetchCardSets: (topicId: string) => Promise<void>;
  createCardSet: (topicId: string, data: { name: string; description?: string }) => Promise<void>;
  updateCardSet: (id: string, data: { name?: string; description?: string }) => Promise<void>;
  deleteCardSet: (id: string) => Promise<void>;

  // Card actions
  fetchCards: (setId: string) => Promise<void>;
  createCard: (setId: string, data: { tags?: string[]; front: { media_blocks: Partial<MediaBlock>[] }; back: { media_blocks: Partial<MediaBlock>[] } }) => Promise<void>;
  updateCard: (id: string, data: { tags?: string[]; front?: { media_blocks: Partial<MediaBlock>[] }; back?: { media_blocks: Partial<MediaBlock>[] } }) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  setEditingCard: (card: CardFull | null) => void;
  setShowCardEditor: (show: boolean) => void;
  openNewCard: () => void;
  openEditCard: (card: CardFull) => void;
}

const API = '/api';

export const useStore = create<AppState>((set, get) => ({
  topics: [],
  selectedTopicId: null,
  loadingTopics: false,
  cardSets: [],
  loadingSets: false,
  cards: [],
  selectedCardId: null,
  loadingCards: false,
  editingCard: null,
  showCardEditor: false,

  fetchTopics: async () => {
    set({ loadingTopics: true });
    try {
      const res = await fetch(`${API}/topics`);
      const topics = await res.json();
      set({ topics, loadingTopics: false });
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      set({ loadingTopics: false });
    }
  },

  selectTopic: (id) => {
    set({ selectedTopicId: id, cardSets: [], cards: [], editingCard: null, showCardEditor: false });
    if (id) get().fetchCardSets(id);
  },

  createTopic: async (data) => {
    try {
      const res = await fetch(`${API}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) await get().fetchTopics();
    } catch (err) {
      console.error('Failed to create topic:', err);
    }
  },

  updateTopic: async (id, data) => {
    try {
      const res = await fetch(`${API}/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) await get().fetchTopics();
    } catch (err) {
      console.error('Failed to update topic:', err);
    }
  },

  deleteTopic: async (id) => {
    try {
      const res = await fetch(`${API}/topics/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const state = get();
        if (state.selectedTopicId === id) set({ selectedTopicId: null, cardSets: [] });
        await get().fetchTopics();
      }
    } catch (err) {
      console.error('Failed to delete topic:', err);
    }
  },

  fetchCardSets: async (topicId) => {
    set({ loadingSets: true });
    try {
      const res = await fetch(`${API}/topics/${topicId}/sets`);
      const cardSets = await res.json();
      set({ cardSets, loadingSets: false });
    } catch (err) {
      console.error('Failed to fetch sets:', err);
      set({ loadingSets: false });
    }
  },

  createCardSet: async (topicId, data) => {
    try {
      const res = await fetch(`${API}/topics/${topicId}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) await get().fetchCardSets(topicId);
    } catch (err) {
      console.error('Failed to create set:', err);
    }
  },

  updateCardSet: async (id, data) => {
    try {
      const res = await fetch(`${API}/sets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const topicId = get().selectedTopicId;
        if (topicId) await get().fetchCardSets(topicId);
      }
    } catch (err) {
      console.error('Failed to update set:', err);
    }
  },

  deleteCardSet: async (id) => {
    try {
      const res = await fetch(`${API}/sets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const topicId = get().selectedTopicId;
        if (topicId) await get().fetchCardSets(topicId);
      }
    } catch (err) {
      console.error('Failed to delete set:', err);
    }
  },

  fetchCards: async (setId) => {
    set({ loadingCards: true });
    try {
      const res = await fetch(`${API}/sets/${setId}/cards`);
      const cards = await res.json();
      set({ cards, loadingCards: false });
    } catch (err) {
      console.error('Failed to fetch cards:', err);
      set({ loadingCards: false });
    }
  },

  createCard: async (setId, data) => {
    try {
      const res = await fetch(`${API}/sets/${setId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await get().fetchCards(setId);
        // Also refresh card sets to update counts
        const topicId = get().selectedTopicId;
        if (topicId) get().fetchCardSets(topicId);
        get().fetchTopics();
      }
    } catch (err) {
      console.error('Failed to create card:', err);
    }
  },

  updateCard: async (id, data) => {
    try {
      const res = await fetch(`${API}/cards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        // Find which set this card belongs to and refresh
        const card = get().cards.find(c => c.id === id);
        if (card) await get().fetchCards(card.card_set_id);
      }
    } catch (err) {
      console.error('Failed to update card:', err);
    }
  },

  deleteCard: async (id) => {
    try {
      const card = get().cards.find(c => c.id === id);
      const res = await fetch(`${API}/cards/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (card) await get().fetchCards(card.card_set_id);
        const topicId = get().selectedTopicId;
        if (topicId) get().fetchCardSets(topicId);
        get().fetchTopics();
      }
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  },

  setEditingCard: (card) => set({ editingCard: card }),
  setShowCardEditor: (show) => set({ showCardEditor: show }),

  openNewCard: () => {
    set({
      editingCard: null,
      showCardEditor: true,
    });
  },

  openEditCard: (card) => {
    set({
      editingCard: card,
      showCardEditor: true,
    });
  },
}));
