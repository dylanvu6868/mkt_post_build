import { create } from "zustand";
import { api, ApiError } from "@/services/api";

/* ------------------------------------------------------------------ */
/*  Interfaces                                                         */
/* ------------------------------------------------------------------ */

export interface ContentItem {
  id: number;
  title: string;
  content_type: string;
  status: string;
  scheduled_date?: string | null;
  tags?: string[] | null;
  body?: string | null;
  published_date?: string | null;
  created_at?: string;
}

export interface CalendarOverview {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

export interface EmailStats {
  campaigns: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  open_rate: number;
  click_rate: number;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  html_body?: string;
  variables?: string[];
  category?: string;
  created_at?: string;
}

export interface EmailContact {
  id: number;
  email: string;
  name?: string;
  tags?: string[];
  status: string;
}

export interface EmailListItem {
  id: number;
  name: string;
  description?: string;
  contact_count: number;
}

export interface ScheduledEmailItem {
  id: number;
  template_id: number;
  list_id: number;
  scheduled_at: string;
  status: string;
  sent_at?: string | null;
}

/* Analytics */

export type AnalyticsPeriod = "7d" | "30d" | "90d";

export interface AnalyticsOverview {
  campaigns: number;
  emails_sent: number;
  open_rate: number;
  click_rate: number;
  content_total: number;
  content_published: number;
  avg_seo_score: number;
}

export interface EmailAnalytics {
  period: AnalyticsPeriod;
  campaigns: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  open_rate: number;
  click_rate: number;
}

export interface ContentAnalytics {
  period: AnalyticsPeriod;
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

export interface SeoTopIssue {
  message: string;
  count: number;
}

export interface SeoAnalytics {
  period: AnalyticsPeriod;
  audits: number;
  avg_score: number;
  top_issues: SeoTopIssue[];
}

export interface ActivityItem {
  id: number;
  action: string;
  resource_type: string;
  resource_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

/* SEO */

export interface SeoIssue {
  severity: "critical" | "warning" | "info";
  message: string;
}

export interface SeoTitleInfo {
  exists: boolean;
  length: number;
  text: string;
}

export interface SeoMetaDescription {
  exists: boolean;
  length: number;
}

export interface SeoHeadings {
  h1_count: number;
  h2_count: number;
  h3_count: number;
}

export interface SeoImages {
  total: number;
  missing_alt: number;
}

export interface SeoLinks {
  internal: number;
  external: number;
  total: number;
}

export interface SeoReadability {
  avg_sentence_length: number;
}

export interface SeoResult {
  score: number;
  url: string | null;
  title: SeoTitleInfo;
  meta_description: SeoMetaDescription;
  headings: SeoHeadings;
  images: SeoImages;
  word_count: number;
  links: SeoLinks;
  readability: SeoReadability;
  issues: SeoIssue[];
  suggestions: string[];
  audit_id: number;
}

export interface SeoAuditListItem {
  id: number;
  url: string | null;
  title: string | null;
  score: number;
  created_at: string;
}

export interface SeoAuditDetail {
  id: number;
  url: string | null;
  title: string | null;
  score: number;
  issues: SeoIssue[] | null;
  suggestions: string[] | null;
  meta_data: SeoResult | null;
  created_at: string;
}

export interface Keyword {
  keyword: string;
  count: number;
  density: number;
}

/* Landing Pages */

export interface LandingPageListItem {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "published";
  created_at: string;
}

export interface LandingPageDetail {
  id: number;
  title: string;
  slug: string;
  html_content: string;
  css_content: string | null;
  status: "draft" | "published";
}

export interface LandingPageCreated {
  id: number;
  title: string;
  slug: string;
}

export interface LandingPageGenerateReq {
  purpose: string;
  product: string;
  tone?: string;
  cta?: string;
}

export interface LandingPageGenerateResult {
  html: string;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

interface McpState {
  /* Email send */
  sending: boolean;
  sendEmail: (to: string[], subject: string, html: string) => Promise<void>;
  sendBatchEmail: (recipients: Record<string, string>[], subject: string, htmlTemplate: string) => Promise<void>;

  /* Stats */
  emailStats: EmailStats | null;
  emailStatsLoading: boolean;
  loadEmailStats: (campaignId?: number) => Promise<void>;

  /* Templates */
  templates: EmailTemplate[];
  templatesLoading: boolean;
  loadTemplates: () => Promise<void>;
  createTemplate: (body: { name: string; subject: string; html_body: string; variables?: string[]; category?: string }) => Promise<void>;
  getTemplate: (id: number) => Promise<EmailTemplate>;
  updateTemplate: (id: number, body: { name?: string; subject?: string; html_body?: string; variables?: string[]; category?: string }) => Promise<void>;
  deleteTemplate: (id: number) => Promise<void>;

  /* Contacts */
  contacts: EmailContact[];
  contactsLoading: boolean;
  loadContacts: (tag?: string, status?: string) => Promise<void>;
  createContact: (body: { email: string; name?: string; tags?: string[] }) => Promise<void>;
  importContacts: (file: File) => Promise<{ imported: number }>;
  updateContact: (id: number, body: { name?: string; tags?: string[]; status?: string }) => Promise<void>;
  deleteContact: (id: number) => Promise<void>;

  /* Lists */
  lists: EmailListItem[];
  listsLoading: boolean;
  loadLists: () => Promise<void>;
  createList: (body: { name: string; description?: string }) => Promise<void>;
  addContactsToList: (listId: number, contactIds: number[]) => Promise<void>;
  deleteList: (id: number) => Promise<void>;

  /* Scheduling */
  scheduled: ScheduledEmailItem[];
  scheduledLoading: boolean;
  loadScheduled: () => Promise<void>;
  scheduleEmail: (body: { template_id: number; list_id: number; scheduled_at: string }) => Promise<void>;
  cancelSchedule: (id: number) => Promise<void>;

  /* Calendar */
  calendarItems: ContentItem[];
  calendarLoading: boolean;
  calendarOverview: CalendarOverview | null;
  loadCalendarItems: (filters?: { status?: string; month?: string; content_type?: string }) => Promise<void>;
  createCalendarItem: (body: { title: string; content_type: string; body?: string; scheduled_date?: string; tags?: string[] }) => Promise<void>;
  updateCalendarItemStatus: (id: number, status: string) => Promise<void>;
  updateCalendarItem: (id: number, body: { title?: string; content_type?: string; body?: string; scheduled_date?: string; tags?: string[] }) => Promise<void>;
  deleteCalendarItem: (id: number) => Promise<void>;
  loadCalendarOverview: () => Promise<void>;

  /* SEO */
  seoResult: SeoResult | null;
  seoAnalyzing: boolean;
  seoAudits: SeoAuditListItem[];
  seoAuditsLoading: boolean;
  seoAuditDetail: SeoAuditDetail | null;
  keywords: Keyword[];
  keywordsLoading: boolean;
  analyzeSeo: (input: { url?: string; html?: string }) => Promise<void>;
  analyzeKeywords: (text: string, topN?: number) => Promise<void>;
  loadSeoAudits: () => Promise<void>;
  loadSeoAudit: (id: number) => Promise<void>;

  /* Analytics */
  analyticsOverview: AnalyticsOverview | null;
  analyticsOverviewLoading: boolean;
  emailAnalytics: EmailAnalytics | null;
  emailAnalyticsLoading: boolean;
  contentAnalytics: ContentAnalytics | null;
  contentAnalyticsLoading: boolean;
  seoAnalytics: SeoAnalytics | null;
  seoAnalyticsLoading: boolean;
  activity: ActivityItem[];
  activityLoading: boolean;
  loadAnalyticsOverview: () => Promise<void>;
  loadEmailAnalytics: (period: AnalyticsPeriod) => Promise<void>;
  loadContentAnalytics: (period: AnalyticsPeriod) => Promise<void>;
  loadSeoAnalytics: (period: AnalyticsPeriod) => Promise<void>;
  loadActivity: (limit?: number) => Promise<void>;

  /* Landing Pages */
  landingPages: LandingPageListItem[];
  landingPagesLoading: boolean;
  landingPageDetail: LandingPageDetail | null;
  landingGenerating: boolean;
  loadLandingPages: () => Promise<void>;
  getLandingPage: (id: number) => Promise<LandingPageDetail>;
  createLandingPage: (body: { title: string; slug: string; html_content?: string; css_content?: string }) => Promise<LandingPageCreated>;
  updateLandingPage: (id: number, body: { title?: string; html_content?: string; css_content?: string }) => Promise<{ id: number; title: string }>;
  generateLandingPage: (req: LandingPageGenerateReq) => Promise<LandingPageGenerateResult>;
  publishLandingPage: (id: number) => Promise<{ id: number; status: string; slug: string }>;
  deleteLandingPage: (id: number) => Promise<void>;
}

export const useMcpStore = create<McpState>()((set) => ({
  /* ---- Email send ---- */
  sending: false,

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

  /* ---- Stats ---- */
  emailStats: null,
  emailStatsLoading: false,

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

  /* ---- Templates ---- */
  templates: [],
  templatesLoading: false,

  loadTemplates: async () => {
    set({ templatesLoading: true });
    try {
      const data = await api.get<EmailTemplate[]>("/mcp/email/templates");
      set({ templates: data });
    } catch {
      set({ templates: [] });
    } finally {
      set({ templatesLoading: false });
    }
  },

  createTemplate: async (body) => {
    await api.post("/mcp/email/templates", body);
  },

  getTemplate: async (id) => {
    return await api.get<EmailTemplate>(`/mcp/email/templates/${id}`);
  },

  updateTemplate: async (id, body) => {
    try {
      await api.patch(`/mcp/email/templates/${id}`, body);
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;
      const msg = e instanceof Error ? e.message : "Lỗi cập nhật template";
      throw new Error(msg);
    }
  },

  deleteTemplate: async (id) => {
    await api.delete(`/mcp/email/templates/${id}`);
  },

  /* ---- Contacts ---- */
  contacts: [],
  contactsLoading: false,

  loadContacts: async (tag, status) => {
    set({ contactsLoading: true });
    try {
      const params = new URLSearchParams();
      if (tag) params.set("tag", tag);
      if (status) params.set("status", status);
      const qs = params.toString();
      const url = qs ? `/mcp/email/contacts?${qs}` : "/mcp/email/contacts";
      const data = await api.get<EmailContact[]>(url);
      set({ contacts: data });
    } catch {
      set({ contacts: [] });
    } finally {
      set({ contactsLoading: false });
    }
  },

  createContact: async (body) => {
    await api.post("/mcp/email/contacts", body);
  },

  importContacts: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return await api.post<{ imported: number }>("/mcp/email/contacts/import", fd);
  },

  updateContact: async (id, body) => {
    try {
      await api.patch(`/mcp/email/contacts/${id}`, body);
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;
      const msg = e instanceof Error ? e.message : "Lỗi cập nhật liên hệ";
      throw new Error(msg);
    }
  },

  deleteContact: async (id) => {
    await api.delete(`/mcp/email/contacts/${id}`);
  },

  /* ---- Lists ---- */
  lists: [],
  listsLoading: false,

  loadLists: async () => {
    set({ listsLoading: true });
    try {
      const data = await api.get<EmailListItem[]>("/mcp/email/lists");
      set({ lists: data });
    } catch {
      set({ lists: [] });
    } finally {
      set({ listsLoading: false });
    }
  },

  createList: async (body) => {
    await api.post("/mcp/email/lists", body);
  },

  addContactsToList: async (listId, contactIds) => {
    await api.post(`/mcp/email/lists/${listId}/contacts`, { contact_ids: contactIds });
  },

  deleteList: async (id) => {
    await api.delete(`/mcp/email/lists/${id}`);
  },

  /* ---- Scheduling ---- */
  scheduled: [],
  scheduledLoading: false,

  loadScheduled: async () => {
    set({ scheduledLoading: true });
    try {
      const data = await api.get<ScheduledEmailItem[]>("/mcp/email/scheduled");
      set({ scheduled: data });
    } catch {
      set({ scheduled: [] });
    } finally {
      set({ scheduledLoading: false });
    }
  },

  scheduleEmail: async (body) => {
    await api.post("/mcp/email/schedule", body);
  },

  cancelSchedule: async (id) => {
    await api.post(`/mcp/email/cancel-schedule?schedule_id=${id}`);
  },

  /* ---- Calendar ---- */
  calendarItems: [],
  calendarLoading: false,
  calendarOverview: null,

  loadCalendarItems: async (filters) => {
    set({ calendarLoading: true });
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.month) params.set("month", filters.month);
      if (filters?.content_type) params.set("content_type", filters.content_type);
      const qs = params.toString();
      const url = qs ? `/mcp/calendar/items?${qs}` : "/mcp/calendar/items";
      const data = await api.get<ContentItem[]>(url);
      set({ calendarItems: data });
    } catch {
      set({ calendarItems: [] });
    } finally {
      set({ calendarLoading: false });
    }
  },

  createCalendarItem: async (body) => {
    await api.post("/mcp/calendar/items", body);
  },

  updateCalendarItemStatus: async (id, status) => {
    await api.patch(`/mcp/calendar/items/${id}/status`, { status });
  },

  updateCalendarItem: async (id, body) => {
    await api.patch(`/mcp/calendar/items/${id}`, body);
  },

  deleteCalendarItem: async (id) => {
    await api.delete(`/mcp/calendar/items/${id}`);
  },

  loadCalendarOverview: async () => {
    try {
      const data = await api.get<CalendarOverview>("/mcp/calendar/overview");
      set({ calendarOverview: data });
    } catch {
      set({ calendarOverview: null });
    }
  },

  /* ---- SEO ---- */
  seoResult: null,
  seoAnalyzing: false,
  seoAudits: [],
  seoAuditsLoading: false,
  seoAuditDetail: null,
  keywords: [],
  keywordsLoading: false,

  analyzeSeo: async (input) => {
    set({ seoAnalyzing: true, seoResult: null });
    try {
      const data = await api.post<SeoResult>("/mcp/seo/analyze", input);
      set({ seoResult: data });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi phân tích SEO";
      throw new Error(msg);
    } finally {
      set({ seoAnalyzing: false });
    }
  },

  analyzeKeywords: async (text, topN) => {
    set({ keywordsLoading: true, keywords: [] });
    try {
      const data = await api.post<Keyword[]>("/mcp/seo/keywords", { text, top_n: topN });
      set({ keywords: data });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi phân tích từ khóa";
      throw new Error(msg);
    } finally {
      set({ keywordsLoading: false });
    }
  },

  loadSeoAudits: async () => {
    set({ seoAuditsLoading: true });
    try {
      const data = await api.get<SeoAuditListItem[]>("/mcp/seo/audits");
      set({ seoAudits: data });
    } catch {
      set({ seoAudits: [] });
    } finally {
      set({ seoAuditsLoading: false });
    }
  },

  loadSeoAudit: async (id) => {
    try {
      const data = await api.get<SeoAuditDetail>(`/mcp/seo/audits/${id}`);
      set({ seoAuditDetail: data });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi tải audit";
      throw new Error(msg);
    }
  },

  /* ---- Analytics ---- */
  analyticsOverview: null,
  analyticsOverviewLoading: false,
  emailAnalytics: null,
  emailAnalyticsLoading: false,
  contentAnalytics: null,
  contentAnalyticsLoading: false,
  seoAnalytics: null,
  seoAnalyticsLoading: false,
  activity: [],
  activityLoading: false,

  loadAnalyticsOverview: async () => {
    set({ analyticsOverviewLoading: true });
    try {
      const data = await api.get<AnalyticsOverview>("/mcp/analytics/overview");
      set({ analyticsOverview: data });
    } catch {
      set({ analyticsOverview: null });
    } finally {
      set({ analyticsOverviewLoading: false });
    }
  },

  loadEmailAnalytics: async (period) => {
    set({ emailAnalyticsLoading: true });
    try {
      const data = await api.get<EmailAnalytics>(`/mcp/analytics/email?period=${period}`);
      set({ emailAnalytics: data });
    } catch {
      set({ emailAnalytics: null });
    } finally {
      set({ emailAnalyticsLoading: false });
    }
  },

  loadContentAnalytics: async (period) => {
    set({ contentAnalyticsLoading: true });
    try {
      const data = await api.get<ContentAnalytics>(`/mcp/analytics/content?period=${period}`);
      set({ contentAnalytics: data });
    } catch {
      set({ contentAnalytics: null });
    } finally {
      set({ contentAnalyticsLoading: false });
    }
  },

  loadSeoAnalytics: async (period) => {
    set({ seoAnalyticsLoading: true });
    try {
      const data = await api.get<SeoAnalytics>(`/mcp/analytics/seo?period=${period}`);
      set({ seoAnalytics: data });
    } catch {
      set({ seoAnalytics: null });
    } finally {
      set({ seoAnalyticsLoading: false });
    }
  },

  loadActivity: async (limit = 50) => {
    set({ activityLoading: true });
    try {
      const data = await api.get<ActivityItem[]>(`/mcp/analytics/activity?limit=${limit}`);
      set({ activity: data });
    } catch {
      set({ activity: [] });
    } finally {
      set({ activityLoading: false });
    }
  },

  /* ---- Landing Pages ---- */
  landingPages: [],
  landingPagesLoading: false,
  landingPageDetail: null,
  landingGenerating: false,

  loadLandingPages: async () => {
    set({ landingPagesLoading: true });
    try {
      const data = await api.get<LandingPageListItem[]>("/mcp/landing/pages");
      set({ landingPages: data });
    } catch {
      set({ landingPages: [] });
    } finally {
      set({ landingPagesLoading: false });
    }
  },

  getLandingPage: async (id) => {
    const data = await api.get<LandingPageDetail>(`/mcp/landing/pages/${id}`);
    set({ landingPageDetail: data });
    return data;
  },

  createLandingPage: async (body) => {
    try {
      return await api.post<LandingPageCreated>("/mcp/landing/pages", body);
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;
      const msg = e instanceof Error ? e.message : "Lỗi tạo trang đích";
      throw new Error(msg);
    }
  },

  updateLandingPage: async (id, body) => {
    try {
      return await api.patch<{ id: number; title: string }>(`/mcp/landing/pages/${id}`, body);
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;
      const msg = e instanceof Error ? e.message : "Lỗi cập nhật trang đích";
      throw new Error(msg);
    }
  },

  generateLandingPage: async (req) => {
    set({ landingGenerating: true });
    try {
      return await api.post<LandingPageGenerateResult>("/mcp/landing/generate", req);
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;
      const msg = e instanceof Error ? e.message : "Lỗi tạo trang bằng AI";
      throw new Error(msg);
    } finally {
      set({ landingGenerating: false });
    }
  },

  publishLandingPage: async (id) => {
    try {
      const data = await api.patch<{ id: number; status: string; slug: string }>(`/mcp/landing/pages/${id}/publish`);
      set((state) => ({
        landingPages: state.landingPages.map((p) =>
          p.id === id ? { ...p, status: "published" as const } : p
        ),
      }));
      return data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi xuất bản trang";
      throw new Error(msg);
    }
  },

  deleteLandingPage: async (id) => {
    try {
      await api.delete(`/mcp/landing/pages/${id}`);
      set((state) => ({
        landingPages: state.landingPages.filter((p) => p.id !== id),
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi xóa trang đích";
      throw new Error(msg);
    }
  },
}));
