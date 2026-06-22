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

export interface BackgroundTask {
  convId: number;
  title: string;
  type: "chat" | "generation";
  status: "running" | "done" | "error";
  step?: string;
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
  backgroundTasks: Record<number, BackgroundTask>;

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
  startGeneration: (payload: any, targetConvId?: number) => Promise<void>;
  dismissBackgroundTask: (convId: number) => void;
  setSidebarWidth: (width: number) => void;
  setContentPanelWidth: (width: number) => void;
  toggleLeftSidebar: () => void;
}

// Per-conversation abort controllers and typing intervals
const _controllers = new Map<number, AbortController>();
const _typingIntervals = new Map<number, ReturnType<typeof setInterval>>();

function clearTypingForConv(convId: number) {
  const iv = _typingIntervals.get(convId);
  if (iv) {
    clearInterval(iv);
    _typingIntervals.delete(convId);
  }
}

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token ?? null;
  } catch {
    return null;
  }
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

// Sleep that wakes immediately when tab becomes visible (avoids browser throttle)
function sleepUntilVisible(ms: number): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const done = () => { if (!resolved) { resolved = true; document.removeEventListener("visibilitychange", onVisible); resolve(); } };
    const timer = setTimeout(done, ms);
    const onVisible = () => { if (document.visibilityState === "visible") { clearTimeout(timer); done(); } };
    document.addEventListener("visibilitychange", onVisible);
  });
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
      backgroundTasks: {},

      loadConversations: async () => {
        const data = await api.get<Conversation[]>("/conversations");
        set({ conversations: data });
      },

      createConversation: async (title?: string) => {
        const conv = await api.post<Conversation>("/conversations", {
          title: title || "New conversation",
        });
        set((s) => ({
          conversations: [conv, ...s.conversations],
          activeConversationId: conv.id,
          messages: [],
          streaming: false,
          streamContent: "",
          suggestions: [],
          contentPanel: { visible: false, generating: false, result: null },
        }));
        return conv;
      },

      selectConversation: async (id: number) => {
        const { activeConversationId, streaming, contentPanel, conversations } = get();

        if (activeConversationId && activeConversationId !== id && (streaming || contentPanel.generating)) {
          const title = conversations.find((c) => c.id === activeConversationId)?.title || "Cuộc trò chuyện";
          set((s) => ({
            backgroundTasks: {
              ...s.backgroundTasks,
              [activeConversationId]: {
                convId: activeConversationId,
                title,
                type: contentPanel.generating ? "generation" : "chat",
                status: "running",
              },
            },
          }));
        }

        set({
          activeConversationId: id,
          messages: [],
          streaming: false,
          streamContent: "",
          suggestions: [],
          contentPanel: { visible: false, generating: false, result: null },
        });
        // Non-blocking: load messages without awaiting (UI shows spinner-free switch)
        api.get<ChatMessage[]>(`/conversations/${id}/messages`).then((msgs) => {
          if (get().activeConversationId === id) set({ messages: msgs });
        });
      },

      deleteConversation: async (id: number) => {
        const ctrl = _controllers.get(id);
        if (ctrl) {
          ctrl.abort();
          _controllers.delete(id);
        }
        clearTypingForConv(id);

        // Optimistic: remove from UI immediately
        set((s) => {
          const { [id]: _, ...remainingTasks } = s.backgroundTasks;
          return {
            conversations: s.conversations.filter((c) => c.id !== id),
            activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
            messages: s.activeConversationId === id ? [] : s.messages,
            backgroundTasks: remainingTasks,
          };
        });
        api.delete(`/conversations/${id}`).catch(() => {});
      },

      renameConversation: async (id: number, title: string) => {
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
        }));
        api.patch(`/conversations/${id}`, { title }).catch(() => {});
      },

      pinConversation: async (id: number, pinned: boolean) => {
        set((s) => ({
          conversations: s.conversations
            .map((c) => (c.id === id ? { ...c, is_pinned: pinned } : c))
            .sort((a, b) => {
              if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
              return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            }),
        }));
        api.patch(`/conversations/${id}`, { is_pinned: pinned }).catch(() => {});
      },

      searchConversations: async (q: string) => {
        return api.get<Conversation[]>(`/conversations/search?q=${encodeURIComponent(q)}`);
      },

      stopStreaming: () => {
        const convId = get().activeConversationId;
        if (!convId) return;

        const ctrl = _controllers.get(convId);
        if (ctrl) {
          ctrl.abort();
          _controllers.delete(convId);
        }
        clearTypingForConv(convId);

        // Remove from background tasks
        set((s) => {
          const { [convId]: _, ...rest } = s.backgroundTasks;
          return { backgroundTasks: rest };
        });

        const { streamContent } = get();
        if (streamContent) {
          const aiMsg: ChatMessage = {
            id: Date.now() + 1,
            conversation_id: convId,
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
        const targetConvId = get().activeConversationId;
        if (!targetConvId) return;

        clearTypingForConv(targetConvId);

        const userMsg: ChatMessage = {
          id: Date.now(),
          conversation_id: targetConvId,
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

        const token = getToken();
        const baseUrl = getBaseUrl();
        const isFg = () => get().activeConversationId === targetConvId;

        const controller = new AbortController();
        _controllers.set(targetConvId, controller);

        let res: Response;
        try {
          res = await fetch(`${baseUrl}/chat/${targetConvId}/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ content }),
            signal: controller.signal,
          });
        } catch {
          if (isFg()) set({ streaming: false });
          _controllers.delete(targetConvId);
          return;
        }

        if (!res.ok || !res.body) {
          if (isFg()) set({ streaming: false });
          _controllers.delete(targetConvId);
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
                if (isFg()) set({ streamContent: fullContent });
              } else if (data.type === "suggestions") {
                if (isFg()) set({ suggestions: data.suggestions ?? [] });
              } else if (data.type === "done") {
                fullContent = data.content;
                const generateMatch = fullContent.match(/```generate\n([\s\S]*?)\n```/);
                if (generateMatch) {
                  if (isFg()) {
                    set({ contentPanel: { visible: false, generating: true, result: null }, streamContent: "" });
                  }
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
                      get().startGeneration({ ...payload, project_id: projectId }, targetConvId);
                    }
                  } catch {}
                }
              }
            } catch {}
          }
        }

        _controllers.delete(targetConvId);
        if (controller.signal.aborted) return;

        const hasGenerate = fullContent.includes("```generate\n");
        const wasNew = get().conversations.find((c) => c.id === targetConvId)?.title === "New conversation";

        // Only add assistant message if there's no generate block
        // (generation result will be saved separately by _saveGenerationResult)
        if (!hasGenerate) {
          const aiMsg: ChatMessage = {
            id: Date.now() + 1,
            conversation_id: targetConvId,
            role: "assistant",
            content: fullContent,
            metadata_json: null,
            created_at: new Date().toISOString(),
          };

          if (isFg()) {
            set((s) => ({
              messages: [...s.messages, aiMsg],
              streaming: false,
              streamContent: "",
              conversations: s.conversations.map((c) =>
                c.id === targetConvId
                  ? { ...c, title: c.title === "New conversation" ? content.split(/\s+/).slice(0, 6).join(" ").slice(0, 30) : c.title }
                  : c
              ),
            }));
          } else {
            set((s) => ({
              backgroundTasks: {
                ...s.backgroundTasks,
                [targetConvId]: {
                  ...(s.backgroundTasks[targetConvId] || { convId: targetConvId, title: "Cuộc trò chuyện", type: "chat" as const }),
                  status: "done" as const,
                },
              },
              conversations: s.conversations.map((c) =>
                c.id === targetConvId
                  ? { ...c, title: c.title === "New conversation" ? content.split(/\s+/).slice(0, 6).join(" ").slice(0, 30) : c.title }
                  : c
              ),
            }));
          }
        } else if (isFg()) {
          // Has generate block: just clear streaming state, generation handler takes over
          set({ streaming: false, streamContent: "" });
        }

        if (wasNew) {
          get().loadConversations();
        }
      },

      setContentPanel: (panel) => {
        set((s) => ({ contentPanel: { ...s.contentPanel, ...panel } }));
      },

      startGeneration: async (payload: any, targetConvId?: number) => {
        const convId = targetConvId || get().activeConversationId;
        if (!convId) return;

        const token = getToken();
        const baseUrl = getBaseUrl();
        const isFg = () => get().activeConversationId === convId;

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
            if (isFg()) {
              set({
                contentPanel: { visible: false, generating: false, result: { error: message, upgradeRequired: res.status === 403 || res.status === 429 } },
                streamContent: "",
              });
            }
            set((s) => {
              if (!s.backgroundTasks[convId]) return s;
              return { backgroundTasks: { ...s.backgroundTasks, [convId]: { ...s.backgroundTasks[convId], status: "error" } } };
            });
            return;
          }
          const data = await res.json();
          const jobId = data.job_id;

          let isPolling = true;
          while (isPolling) {
            await sleepUntilVisible(800);
            const statusRes = await fetch(`${baseUrl}/generate/${jobId}`, {
              headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (!statusRes.ok) continue;
            const statusData = await statusRes.json();

            if (statusData.status === "error") {
              if (isFg()) {
                set({ contentPanel: { visible: false, generating: false, result: { error: statusData.error } }, streamContent: "" });
              }
              set((s) => {
                if (!s.backgroundTasks[convId]) return s;
                return { backgroundTasks: { ...s.backgroundTasks, [convId]: { ...s.backgroundTasks[convId], status: "error" } } };
              });
              isPolling = false;
              break;
            }

            if (statusData.status === "done" && statusData.result) {
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

              if (isFg()) {
                set({
                  contentPanel: { visible: false, generating: false, result: { ...statusData.result, _contentType: payload.content_type } },
                  streamContent: "",
                });
                _saveGenerationResult(baseUrl, token, convId, draftText, set, get);
              } else {
                // Background: skip animation, save directly
                _saveGenerationResult(baseUrl, token, convId, draftText, set, get);
                set((s) => ({
                  backgroundTasks: {
                    ...s.backgroundTasks,
                    [convId]: {
                      ...(s.backgroundTasks[convId] || { convId, title: "Cuộc trò chuyện", type: "generation" as const }),
                      status: "done" as const,
                    },
                  },
                }));
              }

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
              if (isFg()) {
                set({ streamContent: `Đang xử lý: ${stepMap[step] || step}...` });
              }
              // Update background task step
              set((s) => {
                if (!s.backgroundTasks[convId]) return s;
                return {
                  backgroundTasks: {
                    ...s.backgroundTasks,
                    [convId]: { ...s.backgroundTasks[convId], step: stepMap[step] || step },
                  },
                };
              });
            }
          }
        } catch (err) {
          console.error(err);
        }
      },

      dismissBackgroundTask: (convId: number) => {
        set((s) => {
          const { [convId]: _, ...rest } = s.backgroundTasks;
          return { backgroundTasks: rest };
        });
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
          generating: false,
        },
        sidebarWidth: state.sidebarWidth,
        contentPanelWidth: state.contentPanelWidth,
        leftSidebarCollapsed: state.leftSidebarCollapsed,
      }),
    }
  )
);

function _saveGenerationResult(
  baseUrl: string,
  token: string | null,
  convId: number,
  draftText: string,
  _set: (fn: any) => void,
  _get: () => ChatState,
) {
  if (!token || !draftText) return;
  fetch(`${baseUrl}/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content: draftText }),
  }).catch(() => {});
}
