import { create } from "zustand";
import { api } from "@/services/api";

export interface Conversation {
  id: number;
  title: string;
  folder: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  last_message: string | null;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: number | null;
  messages: ChatMessage[];
  streaming: boolean;
  streamContent: string;
  contentPanel: { visible: boolean; generating: boolean; result: Record<string, unknown> | null };

  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<Conversation>;
  selectConversation: (id: number) => Promise<void>;
  deleteConversation: (id: number) => Promise<void>;
  renameConversation: (id: number, title: string) => Promise<void>;
  pinConversation: (id: number, pinned: boolean) => Promise<void>;
  searchConversations: (q: string) => Promise<Conversation[]>;

  sendMessage: (content: string) => Promise<void>;
  setContentPanel: (panel: Partial<ChatState["contentPanel"]>) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  streaming: false,
  streamContent: "",
  contentPanel: { visible: false, generating: false, result: null },

  loadConversations: async () => {
    const data = await api.get<Conversation[]>("/conversations");
    set({ conversations: data });
  },

  createConversation: async (title?: string) => {
    const conv = await api.post<Conversation>("/conversations", {
      title: title || "New conversation",
    });
    set((s) => ({ conversations: [conv, ...s.conversations] }));
    await get().selectConversation(conv.id);
    return conv;
  },

  selectConversation: async (id: number) => {
    set({ activeConversationId: id, messages: [], streamContent: "" });
    const msgs = await api.get<ChatMessage[]>(`/conversations/${id}/messages`);
    set({ messages: msgs });
  },

  deleteConversation: async (id: number) => {
    await api.delete(`/conversations/${id}`);
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
      messages: s.activeConversationId === id ? [] : s.messages,
    }));
  },

  renameConversation: async (id: number, title: string) => {
    await api.patch(`/conversations/${id}`, { title });
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    }));
  },

  pinConversation: async (id: number, pinned: boolean) => {
    await api.patch(`/conversations/${id}`, { is_pinned: pinned });
    set((s) => ({
      conversations: s.conversations
        .map((c) => (c.id === id ? { ...c, is_pinned: pinned } : c))
        .sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }),
    }));
  },

  searchConversations: async (q: string) => {
    return api.get<Conversation[]>(`/conversations/search?q=${encodeURIComponent(q)}`);
  },

  sendMessage: async (content: string) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      conversation_id: activeConversationId,
      role: "user",
      content,
      metadata_json: null,
      created_at: new Date().toISOString(),
    };
    set((s) => ({
      messages: [...s.messages, userMsg],
      streaming: true,
      streamContent: "",
    }));

    const token = (() => {
      try {
        const raw = localStorage.getItem("auth-storage");
        if (!raw) return null;
        return JSON.parse(raw)?.state?.token ?? null;
      } catch {
        return null;
      }
    })();

    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const res = await fetch(`${baseUrl}/chat/${activeConversationId}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
    });

    if (!res.ok || !res.body) {
      set({ streaming: false });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "token") {
            fullContent += data.content;
            set({ streamContent: fullContent });
          } else if (data.type === "done") {
            fullContent = data.content;
            const generateMatch = fullContent.match(/```generate\n([\s\S]*?)\n```/);
            if (generateMatch) {
              set({ contentPanel: { visible: true, generating: true, result: null } });
            }
          }
        } catch {}
      }
    }

    const aiMsg: ChatMessage = {
      id: Date.now() + 1,
      conversation_id: activeConversationId,
      role: "assistant",
      content: fullContent,
      metadata_json: null,
      created_at: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, aiMsg],
      streaming: false,
      streamContent: "",
      conversations: s.conversations.map((c) =>
        c.id === activeConversationId
          ? { ...c, title: c.title === "New conversation" ? content.slice(0, 50) : c.title, last_message: fullContent.slice(0, 100) }
          : c
      ),
    }));
  },

  setContentPanel: (panel) => {
    set((s) => ({ contentPanel: { ...s.contentPanel, ...panel } }));
  },
}));
