import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/services/api";
import { useProjectStore } from "@/store/project";

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
  suggestions: string[];
  contentPanel: { visible: boolean; generating: boolean; result: Record<string, unknown> | null };
  sidebarWidth: number;
  contentPanelWidth: number;
  leftSidebarCollapsed: boolean;

  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<Conversation>;
  selectConversation: (id: number) => Promise<void>;
  deleteConversation: (id: number) => Promise<void>;
  renameConversation: (id: number, title: string) => Promise<void>;
  pinConversation: (id: number, pinned: boolean) => Promise<void>;
  searchConversations: (q: string) => Promise<Conversation[]>;

  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  setContentPanel: (panel: Partial<ChatState["contentPanel"]>) => void;
  startGeneration: (payload: any) => Promise<void>;
  setSidebarWidth: (width: number) => void;
  setContentPanelWidth: (width: number) => void;
  toggleLeftSidebar: () => void;
}

let _typingInterval: ReturnType<typeof setInterval> | null = null;
let _abortController: AbortController | null = null;

function clearTypingInterval() {
  if (_typingInterval) {
    clearInterval(_typingInterval);
    _typingInterval = null;
  }
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
  activeConversationId: null,
  messages: [],
  streaming: false,
  streamContent: "",
  suggestions: [],
  contentPanel: { visible: false, generating: false, result: null },
  sidebarWidth: 280,
  contentPanelWidth: 450,
  leftSidebarCollapsed: false,

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
    set({ activeConversationId: id, messages: [], streamContent: "", suggestions: [], contentPanel: { visible: false, generating: false, result: null } });
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

  stopStreaming: () => {
    if (_abortController) {
      _abortController.abort();
      _abortController = null;
    }
    clearTypingInterval();
    const { streamContent, activeConversationId } = get();
    if (streamContent) {
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        conversation_id: activeConversationId!,
        role: "assistant",
        content: streamContent,
        metadata_json: null,
        created_at: new Date().toISOString(),
      };
      set((s) => ({
        messages: [...s.messages, aiMsg],
        streaming: false,
        streamContent: "",
      }));
    } else {
      set({ streaming: false, streamContent: "" });
    }
  },

  sendMessage: async (content: string) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    clearTypingInterval();

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
      suggestions: [],
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

    _abortController = new AbortController();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/chat/${activeConversationId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
        signal: _abortController.signal,
      });
    } catch {
      set({ streaming: false });
      return;
    }

    if (!res.ok || !res.body) {
      set({ streaming: false });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    while (true) {
      let done: boolean, value: Uint8Array | undefined;
      try {
        ({ done, value } = await reader.read());
      } catch {
        break;
      }
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
          } else if (data.type === "suggestions") {
            set({ suggestions: data.suggestions ?? [] });
          } else if (data.type === "done") {
            fullContent = data.content;
            const generateMatch = fullContent.match(/```generate\n([\s\S]*?)\n```/);
            if (generateMatch) {
              set({ contentPanel: { visible: false, generating: true, result: null }, streamContent: "" });
              try {
                const payload = JSON.parse(generateMatch[1]);
                let projectId = useProjectStore.getState().activeProject?.id;
                if (!projectId) {
                  const createRes = await fetch(`${baseUrl}/projects`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify({ name: "Default Project" }),
                  });
                  if (createRes.ok) {
                    const proj = await createRes.json();
                    projectId = proj.id;
                    useProjectStore.getState().setActiveProject(proj);
                  }
                }
                if (projectId) {
                  get().startGeneration({ ...payload, project_id: projectId });
                }
              } catch {}
            }
          }
        } catch {}
      }
    }

    if (!get().streaming) return;
    _abortController = null;

    const aiMsg: ChatMessage = {
      id: Date.now() + 1,
      conversation_id: activeConversationId,
      role: "assistant",
      content: fullContent,
      metadata_json: null,
      created_at: new Date().toISOString(),
    };

    const wasNew = get().conversations.find((c) => c.id === activeConversationId)?.title === "New conversation";

    set((s) => ({
      messages: [...s.messages, aiMsg],
      streaming: false,
      streamContent: "",
      conversations: s.conversations.map((c) =>
        c.id === activeConversationId
          ? { ...c, title: c.title === "New conversation" ? content.split(/\s+/).slice(0, 6).join(" ").slice(0, 30) : c.title }
          : c
      ),
    }));

    if (wasNew) {
      setTimeout(() => get().loadConversations(), 3000);
    }
  },

      setContentPanel: (panel) => {
        set((s) => ({ contentPanel: { ...s.contentPanel, ...panel } }));
      },

      startGeneration: async (payload: any) => {
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

        try {
          const res = await fetch(`${baseUrl}/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({ detail: "Không thể tạo nội dung" }));
            const message = typeof body.detail === "string" ? body.detail : "Không thể tạo nội dung";
            set({
              contentPanel: {
                visible: false,
                generating: false,
                result: {
                  error: message,
                  upgradeRequired: res.status === 403 || res.status === 429,
                },
              },
              streamContent: "",
            });
            return;
          }
          const data = await res.json();
          const jobId = data.job_id;

          let isPolling = true;
          while (isPolling) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            const statusRes = await fetch(`${baseUrl}/generate/${jobId}`, {
              headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (!statusRes.ok) continue;
            const statusData = await statusRes.json();

            if (statusData.status === "error") {
              set({
                contentPanel: { visible: false, generating: false, result: { error: statusData.error } },
                streamContent: "",
              });
              isPolling = false;
              break;
            }

            if (statusData.status === "done" && statusData.result) {
              // Extract text to fake stream
              let draftText = "";
              if (statusData.result.draft) {
                const d = statusData.result.draft;
                if (payload.content_type === "facebook_post") {
                  draftText = [d.hook, "", d.body, "", d.cta, "", d.hashtags?.join(" ")].filter(Boolean).join("\n");
                } else if (payload.content_type === "seo_blog") {
                  const faqText = d.faq?.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n") ?? "";
                  draftText = [d.seo_title, d.meta_description, "", d.blog_content, "", faqText].filter(Boolean).join("\n");
                } else if (payload.content_type === "email") {
                  draftText = [`Subject: ${d.subject}`, "", d.body, "", d.cta].filter(Boolean).join("\n");
                } else if (payload.content_type === "landing_page") {
                  draftText = [d.headline, d.subheadline, "", d.benefits?.map((b: string) => `• ${b}`).join("\n"), "", d.cta].filter(Boolean).join("\n");
                } else if (payload.content_type === "tiktok_script") {
                  draftText = [`[HOOK] ${d.hook}`, "", d.script, "", `[CTA] ${d.cta}`].filter(Boolean).join("\n");
                } else {
                  draftText = JSON.stringify(d, null, 2);
                }
              } else if (statusData.result.final) {
                const f = statusData.result.final;
                draftText = f.body || JSON.stringify(f, null, 2);
              }

              set({ streamContent: "" });
              clearTypingInterval();

              let i = 0;
              _typingInterval = setInterval(() => {
                if (i < draftText.length) {
                  set((s) => ({ streamContent: s.streamContent + draftText.charAt(i) }));
                  i++;
                } else {
                  clearTypingInterval();
                  set({
                    contentPanel: { visible: false, generating: false, result: { ...statusData.result, _contentType: payload.content_type } },
                    streamContent: "",
                  });

                  const convId = get().activeConversationId;
                  if (convId && token && draftText) {
                    fetch(`${baseUrl}/conversations/${convId}/messages`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ content: draftText }),
                    })
                      .then((r) => r.json())
                      .then((saved) => {
                        set((s) => ({
                          messages: [
                            ...s.messages,
                            { id: saved.id, conversation_id: convId, role: "assistant" as const, content: draftText, metadata_json: null, created_at: saved.created_at },
                          ],
                        }));
                      })
                      .catch(() => {});
                  }
                }
              }, 15);

              isPolling = false;
              break;
            } else {
              const step = statusData.current_step || "chuẩn bị";
              const stepMap: Record<string, string> = {
                planner: "Lên kế hoạch",
                research: "Nghiên cứu thị trường",
                seo: "Tối ưu hóa SEO",
                brand: "Phân tích thương hiệu",
                fusion: "Tổng hợp dữ liệu",
                copywriter: "Viết nội dung",
                reviewer: "Kiểm duyệt & Đánh giá",
              };
              set({ streamContent: `Đang xử lý: ${stepMap[step] || step}...` });
            }
          }
        } catch (err) {
          console.error(err);
        }
      },

      setSidebarWidth: (width: number) => set({ sidebarWidth: width }),
      setContentPanelWidth: (width: number) => set({ contentPanelWidth: width }),
      toggleLeftSidebar: () => set((s) => ({ leftSidebarCollapsed: !s.leftSidebarCollapsed })),
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({
        contentPanel: {
          ...state.contentPanel,
          generating: false // Never persist generating state so it doesn't get stuck on refresh
        },
        sidebarWidth: state.sidebarWidth,
        contentPanelWidth: state.contentPanelWidth,
        leftSidebarCollapsed: state.leftSidebarCollapsed,
      }),
    }
  )
);
