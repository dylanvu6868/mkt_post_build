import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, getToken, API_BASE_URL } from "@/services/api";
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
  contentPanel: { visible: boolean; generating: boolean; result: Record<string, unknown> | null; contentType?: string | null };
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
let creatingPromise: Promise<Conversation> | null = null;

function clearTypingForConv(convId: number) {
  const iv = _typingIntervals.get(convId);
  if (iv) {
    clearInterval(iv);
    _typingIntervals.delete(convId);
  }
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

// Renders a generation result's structured fields into readable text for the
// chat bubble / history save. Shared by startGeneration's polling/sync path
// and sendMessage's inline quickpost path (chat-stream, no /generate call).
function buildDraftText(contentType: string, result: Record<string, unknown>): string {
  const draft = result.draft as Record<string, any> | undefined;
  if (draft) {
    if (contentType === "facebook_post") {
      return [draft.hook, "", draft.body, "", draft.cta, "", draft.hashtags?.join(" ")].filter(Boolean).join("\n");
    }
    if (contentType === "seo_blog") {
      const faqText = draft.faq?.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n") ?? "";
      return [draft.seo_title, draft.meta_description, "", draft.blog_content, "", faqText].filter(Boolean).join("\n");
    }
    if (contentType === "email") {
      return [`Subject: ${draft.subject}`, "", draft.body, "", draft.cta].filter(Boolean).join("\n");
    }
    if (contentType === "landing_page") {
      return [draft.headline, draft.subheadline, "", draft.benefits?.map((b: string) => `• ${b}`).join("\n"), "", draft.cta].filter(Boolean).join("\n");
    }
    if (contentType === "tiktok_script") {
      return [`[HOOK] ${draft.hook}`, "", draft.script, "", `[CTA] ${draft.cta}`].filter(Boolean).join("\n");
    }
    return JSON.stringify(draft, null, 2);
  }
  const final = result.final as Record<string, any> | undefined;
  if (final) {
    return final.body || JSON.stringify(final, null, 2);
  }
  return "";
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
        if (creatingPromise) {
          return creatingPromise;
        }

        creatingPromise = api.post<Conversation>("/conversations", {
          title: title || "New conversation",
        }).then((conv) => {
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
        }).finally(() => {
          creatingPromise = null;
        });

        return creatingPromise;
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
        if (get().streaming) return;
        
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
        const baseUrl = API_BASE_URL;
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
        let buffer = "";
        let receivedDone = false;
        let quickResult: { content_type: string; result: Record<string, unknown> } | null = null;

        while (true) {
          let done: boolean, value: Uint8Array | undefined;
          try {
            ({ done, value } = await reader.read());
          } catch {
            break;
          }
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

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
                receivedDone = true;
                fullContent = data.content;
                if (data.quick_result) {
                  quickResult = data.quick_result;
                  continue;
                }
                const generateMatch = fullContent.match(/```generate\n([\s\S]*?)\n```/);
                if (generateMatch) {
                  try {
                    const payload = JSON.parse(generateMatch[1]);
                    if (isFg()) {
                      set({
                        contentPanel: { visible: false, generating: true, result: null, contentType: payload.content_type },
                        streamContent: "",
                      });
                    }
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

        const wasNew = get().conversations.find((c) => c.id === targetConvId)?.title === "New conversation";

        if (quickResult) {
          // facebook_post/email/tiktok_script: the post was already written
          // inline in this same SSE stream (real-time) and persisted
          // server-side — no /generate round-trip, just render it.
          const draftText = buildDraftText(quickResult.content_type, quickResult.result);
          if (isFg()) {
            const resultMsg: ChatMessage = {
              id: Date.now() + 1,
              conversation_id: targetConvId,
              role: "assistant",
              content: draftText,
              metadata_json: { ...quickResult.result, _contentType: quickResult.content_type } as Record<string, unknown> | null,
              created_at: new Date().toISOString(),
            };
            set((s) => ({
              messages: [...s.messages, resultMsg],
              streaming: false,
              streamContent: "",
              conversations: s.conversations.map((c) =>
                c.id === targetConvId
                  ? { ...c, title: c.title === "New conversation" ? content.split(/\s+/).slice(0, 6).join(" ").slice(0, 30) : c.title, updated_at: new Date().toISOString() }
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
          if (wasNew) get().loadConversations();
          return;
        }

        let hasGenerate = fullContent.includes("```generate\n");

        // Handle network timeouts/disconnects where the stream didn't finish properly
        if (!receivedDone) {
          hasGenerate = false; // Force it to show the partial message
          if (fullContent) {
            fullContent += "\n\n*(Kết nối bị gián đoạn do phản hồi dài. Bạn có thể reload trang để xem bản lưu đầy đủ nếu AI vẫn đang viết ngầm)*";
          }
        }

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
        const baseUrl = API_BASE_URL;
        const isFg = () => get().activeConversationId === convId;

        const handleResult = (statusData: any) => {
          if (statusData.status === "error") {
            if (isFg()) {
              set({
                contentPanel: { visible: false, generating: false, result: { error: statusData.error } },
                streamContent: "",
              });
            }
            set((s) => {
              if (!s.backgroundTasks[convId]) return s;
              return { backgroundTasks: { ...s.backgroundTasks, [convId]: { ...s.backgroundTasks[convId], status: "error" } } };
            });
            return;
          }

          if (statusData.status === "done" && statusData.result) {
            const draftText = buildDraftText(payload.content_type, statusData.result);

            if (isFg()) {
              set({ contentPanel: { visible: false, generating: false, result: null }, streamContent: "" });
              _saveGenerationResult(baseUrl, token, convId, draftText, set, get);
              const resultMsg: ChatMessage = {
                id: Date.now() + 1,
                conversation_id: convId,
                role: "assistant",
                content: draftText,
                metadata_json: { ...statusData.result, _contentType: payload.content_type } as Record<string, unknown> | null,
                created_at: new Date().toISOString(),
              };
              set((s) => ({
                messages: [...s.messages, resultMsg],
                conversations: s.conversations.map((c) =>
                  c.id === convId ? { ...c, updated_at: new Date().toISOString() } : c
                ),
              }));
            } else {
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
          }
        };

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

          if (data.status === "done" || data.status === "error") {
            handleResult(data);
            return;
          }

          const jobId = data.job_id;
          let isPolling = true;
          while (isPolling) {
            await sleepUntilVisible(800);
            const statusRes = await fetch(`${baseUrl}/generate/${jobId}`, {
              headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (!statusRes.ok) continue;
            const statusData = await statusRes.json();

            if (statusData.status === "error" || (statusData.status === "done" && statusData.result)) {
              handleResult(statusData);
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
