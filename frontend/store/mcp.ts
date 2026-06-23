import { create } from "zustand";
import { api } from "@/services/api";

/* ------------------------------------------------------------------ */
/*  Interfaces                                                         */
/* ------------------------------------------------------------------ */

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
  deleteTemplate: (id: number) => Promise<void>;

  /* Contacts */
  contacts: EmailContact[];
  contactsLoading: boolean;
  loadContacts: (tag?: string, status?: string) => Promise<void>;
  createContact: (body: { email: string; name?: string; tags?: string[] }) => Promise<void>;
  importContacts: (file: File) => Promise<{ imported: number }>;
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
}));
