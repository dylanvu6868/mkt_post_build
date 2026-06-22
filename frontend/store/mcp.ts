import { create } from "zustand";
import { api } from "@/services/api";

export interface MetaPage {
  page_id: string;
  name: string | null;
  category: string | null;
  followers: number;
}

export interface Campaign {
  post_id: string;
  campaign_id: number;
}

export interface Comment {
  id: string;
  message: string;
  from?: { name: string; id: string };
  created_time: string;
}

export interface PageInsights {
  reach: number;
  engagement: number;
  followers: number;
}

export interface EmailStats {
  campaigns: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  open_rate: number;
  click_rate: number;
}

interface McpState {
  pages: MetaPage[];
  pagesLoading: boolean;
  insights: PageInsights | null;
  insightsLoading: boolean;
  comments: Comment[];
  commentsLoading: boolean;
  emailStats: EmailStats | null;
  emailStatsLoading: boolean;
  publishing: boolean;
  sending: boolean;

  loadPages: () => Promise<void>;
  getMetaOAuthUrl: () => Promise<string>;
  publishPost: (pageId: string, message: string, imageUrl?: string) => Promise<Campaign>;
  schedulePost: (pageId: string, message: string, publishTime: string) => Promise<Campaign>;
  loadComments: (pageId: string, postId: string) => Promise<void>;
  replyComment: (pageId: string, commentId: string, message: string) => Promise<void>;
  loadInsights: (pageId: string, days?: number) => Promise<void>;
  sendEmail: (to: string[], subject: string, html: string) => Promise<void>;
  sendBatchEmail: (recipients: Record<string, string>[], subject: string, htmlTemplate: string) => Promise<void>;
  loadEmailStats: (campaignId?: number) => Promise<void>;
}

export const useMcpStore = create<McpState>()((set) => ({
  pages: [],
  pagesLoading: false,
  insights: null,
  insightsLoading: false,
  comments: [],
  commentsLoading: false,
  emailStats: null,
  emailStatsLoading: false,
  publishing: false,
  sending: false,

  loadPages: async () => {
    set({ pagesLoading: true });
    try {
      const pages = await api.get<MetaPage[]>("/mcp/meta/pages");
      set({ pages });
    } catch {
      set({ pages: [] });
    } finally {
      set({ pagesLoading: false });
    }
  },

  getMetaOAuthUrl: async () => {
    const data = await api.get<{ url: string }>("/oauth/meta/url");
    return data.url;
  },

  publishPost: async (pageId, message, imageUrl) => {
    set({ publishing: true });
    try {
      return await api.post<Campaign>("/mcp/meta/publish", {
        page_id: pageId,
        message,
        image_url: imageUrl || null,
      });
    } finally {
      set({ publishing: false });
    }
  },

  schedulePost: async (pageId, message, publishTime) => {
    set({ publishing: true });
    try {
      return await api.post<Campaign>("/mcp/meta/schedule", {
        page_id: pageId,
        message,
        publish_time: publishTime,
      });
    } finally {
      set({ publishing: false });
    }
  },

  loadComments: async (pageId, postId) => {
    set({ commentsLoading: true });
    try {
      const comments = await api.post<Comment[]>("/mcp/meta/comments", {
        page_id: pageId,
        post_id: postId,
      });
      set({ comments });
    } catch {
      set({ comments: [] });
    } finally {
      set({ commentsLoading: false });
    }
  },

  replyComment: async (pageId, commentId, message) => {
    await api.post("/mcp/meta/reply", {
      page_id: pageId,
      comment_id: commentId,
      message,
    });
  },

  loadInsights: async (pageId, days = 7) => {
    set({ insightsLoading: true });
    try {
      const data = await api.post<PageInsights>("/mcp/meta/insights", {
        page_id: pageId,
        days,
      });
      set({ insights: data });
    } catch {
      set({ insights: null });
    } finally {
      set({ insightsLoading: false });
    }
  },

  sendEmail: async (to, subject, html) => {
    set({ sending: true });
    try {
      await api.post("/mcp/email/send", { to, subject, html });
    } finally {
      set({ sending: false });
    }
  },

  sendBatchEmail: async (recipients, subject, htmlTemplate) => {
    set({ sending: true });
    try {
      await api.post("/mcp/email/batch", {
        recipients,
        subject,
        html_template: htmlTemplate,
      });
    } finally {
      set({ sending: false });
    }
  },

  loadEmailStats: async (campaignId) => {
    set({ emailStatsLoading: true });
    try {
      const url = campaignId ? `/mcp/email/stats?campaign_id=${campaignId}` : "/mcp/email/stats";
      const stats = await api.get<EmailStats>(url);
      set({ emailStats: stats });
    } catch {
      set({ emailStats: null });
    } finally {
      set({ emailStatsLoading: false });
    }
  },
}));
