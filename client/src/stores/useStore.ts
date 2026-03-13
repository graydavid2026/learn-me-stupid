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

interface AppState {
  // Topics
  topics: Topic[];
  selectedTopicId: string | null;
  loadingTopics: boolean;

  // Card Sets
  cardSets: CardSet[];
  loadingSets: boolean;

  // Actions
  fetchTopics: () => Promise<void>;
  selectTopic: (id: string | null) => void;
  createTopic: (data: { name: string; description?: string; color?: string; icon?: string }) => Promise<void>;
  updateTopic: (id: string, data: Partial<Topic>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  fetchCardSets: (topicId: string) => Promise<void>;
  createCardSet: (topicId: string, data: { name: string; description?: string }) => Promise<void>;
  updateCardSet: (id: string, data: { name?: string; description?: string }) => Promise<void>;
  deleteCardSet: (id: string) => Promise<void>;
}

const API = '/api';

export const useStore = create<AppState>((set, get) => ({
  topics: [],
  selectedTopicId: null,
  loadingTopics: false,
  cardSets: [],
  loadingSets: false,

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
    set({ selectedTopicId: id, cardSets: [] });
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
}));
