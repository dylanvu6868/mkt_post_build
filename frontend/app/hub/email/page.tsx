"use client";

import { useEffect, useRef, useState } from "react";
import { useMcpStore } from "@/store/mcp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Shared style constants (reuse existing idiom)                      */
/* ------------------------------------------------------------------ */
const btn =
  "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50";
const btn2 =
  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition disabled:opacity-50";
const btnDanger =
  "inline-flex items-center gap-2 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition disabled:opacity-50";
const inp =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50";
const ta = inp + " min-h-[120px] resize-y";

/* ------------------------------------------------------------------ */
/*  Compose Tab                                                        */
/* ------------------------------------------------------------------ */
function ComposeTab() {
  const { sending, sendEmail, sendBatchEmail, loadEmailStats, templates, loadTemplates } = useMcpStore();
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [batchData, setBatchData] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleTemplateSelect = async (val: string) => {
    setSelectedTemplateId(val);
    if (!val) return;
    try {
      const tpl = await useMcpStore.getState().getTemplate(Number(val));
      setSubject(tpl.subject);
      setHtml(tpl.html_body ?? "");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Loi";
      toast.error(msg);
    }
  };

  const handleSend = async () => {
    setResult(null);
    try {
      if (mode === "single") {
        const emails = to.split(",").map((e) => e.trim()).filter(Boolean);
        if (!emails.length || !subject || !html) return;
        await sendEmail(emails, subject, html);
        setResult(`Da gui toi ${emails.length} dia chi!`);
      } else {
        const recipients = JSON.parse(batchData) as Record<string, string>[];
        if (!recipients.length || !subject || !html) return;
        await sendBatchEmail(recipients, subject, html);
        setResult(`Da gui batch toi ${recipients.length} nguoi!`);
      }
      setTo("");
      setSubject("");
      setHtml("");
      setBatchData("");
      setSelectedTemplateId("");
      loadEmailStats();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Loi gui email";
      setResult(`Loi: ${msg}`);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Gui Email</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setMode("single")} className={mode === "single" ? btn : btn2}>Email don</button>
          <button onClick={() => setMode("batch")} className={mode === "batch" ? btn : btn2}>Batch</button>
        </div>

        {/* Template prefill */}
        <div>
          <label className="text-sm font-medium mb-1 block">Chon template (tuy chon)</label>
          <select className={inp} value={selectedTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)}>
            <option value="">-- Khong dung template --</option>
            {templates.map((t) => (
              <option key={t.id} value={String(t.id)}>{t.name}</option>
            ))}
          </select>
        </div>

        {mode === "single" ? (
          <input className={inp} placeholder="Dia chi email (phan cach bang dau phay)" value={to} onChange={(e) => setTo(e.target.value)} />
        ) : (
          <textarea
            className={ta}
            placeholder={'[\n  {"email":"a@b.com","name":"An"},\n  {"email":"c@d.com","name":"Binh"}\n]'}
            value={batchData}
            onChange={(e) => setBatchData(e.target.value)}
          />
        )}
        <input className={inp} placeholder="Tieu de email" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className={ta + " min-h-[200px]"} placeholder="Noi dung HTML (dung {{name}} cho bien ca nhan hoa)" value={html} onChange={(e) => setHtml(e.target.value)} />
        <div className="flex items-center gap-3">
          <button onClick={handleSend} disabled={sending || !subject || !html} className={btn}>
            {sending ? "Dang gui..." : "Gui email"}
          </button>
          {result && <p className="text-sm text-muted-foreground">{result}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Templates Tab                                                      */
/* ------------------------------------------------------------------ */
function TemplatesTab() {
  const { templates, templatesLoading, loadTemplates, createTemplate, deleteTemplate } = useMcpStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleCreate = async () => {
    if (!name || !subject || !htmlBody) return;
    try {
      await createTemplate({
        name,
        subject,
        html_body: htmlBody,
        category: category || undefined,
      });
      toast.success("Da tao template!");
      setDialogOpen(false);
      setName(""); setSubject(""); setHtmlBody(""); setCategory("");
      loadTemplates();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Loi";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTemplate(id);
      toast.success("Da xoa template!");
      loadTemplates();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Loi";
      toast.error(msg);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Templates</CardTitle>
        <button className={btn} onClick={() => setDialogOpen(true)}>Tao template</button>
      </CardHeader>
      <CardContent>
        {templatesLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chua co template nao.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Ten</th>
                  <th className="pb-2 font-medium">Tieu de</th>
                  <th className="pb-2 font-medium">Danh muc</th>
                  <th className="pb-2 font-medium">Ngay tao</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2">{t.name}</td>
                    <td className="py-2">{t.subject}</td>
                    <td className="py-2">{t.category ? <Badge variant="secondary">{t.category}</Badge> : "-"}</td>
                    <td className="py-2 text-muted-foreground">{t.created_at ? new Date(t.created_at).toLocaleDateString("vi-VN") : "-"}</td>
                    <td className="py-2">
                      <button className={btnDanger} onClick={() => handleDelete(t.id)}>Xoa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tao template moi</DialogTitle>
            <DialogDescription>Dien thong tin template email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input className={inp} placeholder="Ten template" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inp} placeholder="Tieu de" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <textarea className={ta} placeholder="Noi dung HTML" value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} />
            <input className={inp} placeholder="Danh muc (tuy chon)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <button className={btn} onClick={handleCreate} disabled={!name || !subject || !htmlBody}>Tao</button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Contacts Tab                                                       */
/* ------------------------------------------------------------------ */
function ContactsTab() {
  const { contacts, contactsLoading, loadContacts, createContact, importContacts, deleteContact } = useMcpStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const handleFilter = () => {
    loadContacts(filterTag || undefined, filterStatus || undefined);
  };

  const handleCreate = async () => {
    if (!email) return;
    try {
      await createContact({
        email,
        name: name || undefined,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      });
      toast.success("Da them lien he!");
      setDialogOpen(false);
      setEmail(""); setName(""); setTags("");
      loadContacts(filterTag || undefined, filterStatus || undefined);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Loi";
      toast.error(msg);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importContacts(file);
      toast.success(`Da import ${res.imported} lien he!`);
      loadContacts(filterTag || undefined, filterStatus || undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Loi import";
      toast.error(msg);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteContact(id);
      toast.success("Da xoa lien he!");
      loadContacts(filterTag || undefined, filterStatus || undefined);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Loi";
      toast.error(msg);
    }
  };

  const statusBadgeVariant = (s: string) => {
    if (s === "active" || s === "subscribed") return "default" as const;
    if (s === "unsubscribed") return "destructive" as const;
    return "secondary" as const;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle>Lien he</CardTitle>
        <div className="flex gap-2 flex-wrap">
          <button className={btn} onClick={() => setDialogOpen(true)}>Them lien he</button>
          <label className={btn2 + " cursor-pointer"}>
            Import CSV
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <input className={inp + " max-w-[200px]"} placeholder="Loc theo tag" value={filterTag} onChange={(e) => setFilterTag(e.target.value)} />
          <select className={inp + " max-w-[180px]"} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tat ca trang thai</option>
            <option value="active">Active</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
          <button className={btn2} onClick={handleFilter}>Loc</button>
        </div>

        {contactsLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chua co lien he nao.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Ten</th>
                  <th className="pb-2 font-medium">Tags</th>
                  <th className="pb-2 font-medium">Trang thai</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2">{c.email}</td>
                    <td className="py-2">{c.name ?? "-"}</td>
                    <td className="py-2">
                      {c.tags && c.tags.length > 0
                        ? c.tags.map((tag) => <Badge key={tag} variant="outline" className="mr-1">{tag}</Badge>)
                        : "-"}
                    </td>
                    <td className="py-2"><Badge variant={statusBadgeVariant(c.status)}>{c.status}</Badge></td>
                    <td className="py-2">
                      <button className={btnDanger} onClick={() => handleDelete(c.id)}>Xoa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Them lien he moi</DialogTitle>
            <DialogDescription>Nhap thong tin lien he.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input className={inp} placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={inp} placeholder="Ten (tuy chon)" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inp} placeholder="Tags (phan cach bang dau phay)" value={tags} onChange={(e) => setTags(e.target.value)} />
            <button className={btn} onClick={handleCreate} disabled={!email}>Them</button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Scheduled Tab                                                      */
/* ------------------------------------------------------------------ */
function ScheduledTab() {
  const {
    scheduled, scheduledLoading, loadScheduled, scheduleEmail, cancelSchedule,
    templates, loadTemplates, lists, loadLists,
  } = useMcpStore();
  const [templateId, setTemplateId] = useState("");
  const [listId, setListId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadScheduled();
    loadTemplates();
    loadLists();
  }, [loadScheduled, loadTemplates, loadLists]);

  const handleSchedule = async () => {
    if (!templateId || !listId || !scheduledAt) return;
    setSubmitting(true);
    try {
      await scheduleEmail({
        template_id: Number(templateId),
        list_id: Number(listId),
        scheduled_at: new Date(scheduledAt).toISOString(),
      });
      toast.success("Da len lich gui email!");
      setTemplateId(""); setListId(""); setScheduledAt("");
      loadScheduled();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Loi";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelSchedule(id);
      toast.success("Da huy lich gui!");
      loadScheduled();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Loi";
      toast.error(msg);
    }
  };

  const statusColor = (s: string) => {
    if (s === "pending") return "default" as const;
    if (s === "sent") return "secondary" as const;
    if (s === "cancelled") return "destructive" as const;
    return "outline" as const;
  };

  /* Build lookup maps for display */
  const tplMap = new Map(templates.map((t) => [t.id, t.name]));
  const listMap = new Map(lists.map((l) => [l.id, l.name]));

  return (
    <Card>
      <CardHeader><CardTitle>Len lich gui email</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {/* Schedule form */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Template</label>
            <select className={inp} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">-- Chon --</option>
              {templates.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Danh sach</label>
            <select className={inp} value={listId} onChange={(e) => setListId(e.target.value)}>
              <option value="">-- Chon --</option>
              {lists.map((l) => <option key={l.id} value={String(l.id)}>{l.name} ({l.contact_count})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Thoi gian gui</label>
            <input type="datetime-local" className={inp} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button className={btn} onClick={handleSchedule} disabled={submitting || !templateId || !listId || !scheduledAt}>
              {submitting ? "Dang len lich..." : "Len lich"}
            </button>
          </div>
        </div>

        {/* Scheduled list */}
        {scheduledLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chua co lich gui nao.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Template</th>
                  <th className="pb-2 font-medium">Danh sach</th>
                  <th className="pb-2 font-medium">Thoi gian gui</th>
                  <th className="pb-2 font-medium">Trang thai</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {scheduled.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2">{tplMap.get(s.template_id) ?? `#${s.template_id}`}</td>
                    <td className="py-2">{listMap.get(s.list_id) ?? `#${s.list_id}`}</td>
                    <td className="py-2 text-muted-foreground">{new Date(s.scheduled_at).toLocaleString("vi-VN")}</td>
                    <td className="py-2"><Badge variant={statusColor(s.status)}>{s.status}</Badge></td>
                    <td className="py-2">
                      {s.status === "pending" && (
                        <button className={btnDanger} onClick={() => handleCancel(s.id)}>Huy</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats Tab                                                          */
/* ------------------------------------------------------------------ */
function StatsTab() {
  const { emailStats, emailStatsLoading, loadEmailStats } = useMcpStore();

  useEffect(() => { loadEmailStats(); }, [loadEmailStats]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Thong ke Email</CardTitle></CardHeader>
      <CardContent>
        {emailStatsLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
        ) : emailStats ? (
          <div className="space-y-4">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Chien dich</span><span className="text-sm font-medium">{emailStats.campaigns}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Tong gui</span><span className="text-sm font-medium">{emailStats.total_sent}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Da mo</span><span className="text-sm font-medium">{emailStats.total_opened} ({emailStats.open_rate}%)</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Da click</span><span className="text-sm font-medium">{emailStats.total_clicked} ({emailStats.click_rate}%)</span></div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Ty le mo</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(emailStats.open_rate, 100)}%` }} /></div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Ty le click</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(emailStats.click_rate, 100)}%` }} /></div>
            </div>
          </div>
        ) : <p className="text-sm text-muted-foreground">Chua co du lieu.</p>}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Lists Tab (mini — create + show)                                   */
/* ------------------------------------------------------------------ */
function ListsSection() {
  const { lists, listsLoading, loadLists, createList, deleteList } = useMcpStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => { loadLists(); }, [loadLists]);

  const handleCreate = async () => {
    if (!name) return;
    try {
      await createList({ name, description: description || undefined });
      toast.success("Da tao danh sach!");
      setDialogOpen(false);
      setName(""); setDescription("");
      loadLists();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Loi";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteList(id);
      toast.success("Da xoa danh sach!");
      loadLists();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Loi";
      toast.error(msg);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Danh sach gui</CardTitle>
        <button className={btn} onClick={() => setDialogOpen(true)}>Tao danh sach</button>
      </CardHeader>
      <CardContent>
        {listsLoading ? (
          <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chua co danh sach nao.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Ten</th>
                  <th className="pb-2 font-medium">Mo ta</th>
                  <th className="pb-2 font-medium">So lien he</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {lists.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2">{l.name}</td>
                    <td className="py-2 text-muted-foreground">{l.description ?? "-"}</td>
                    <td className="py-2">{l.contact_count}</td>
                    <td className="py-2">
                      <button className={btnDanger} onClick={() => handleDelete(l.id)}>Xoa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tao danh sach moi</DialogTitle>
            <DialogDescription>Nhap thong tin danh sach gui.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input className={inp} placeholder="Ten danh sach *" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inp} placeholder="Mo ta (tuy chon)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <button className={btn} onClick={handleCreate} disabled={!name}>Tao</button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function EmailPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Email Marketing</h1>

      <Tabs defaultValue="compose">
        <TabsList className="flex-wrap">
          <TabsTrigger value="compose">Gui email</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="contacts">Lien he</TabsTrigger>
          <TabsTrigger value="lists">Danh sach</TabsTrigger>
          <TabsTrigger value="scheduled">Len lich</TabsTrigger>
          <TabsTrigger value="stats">Thong ke</TabsTrigger>
        </TabsList>

        <TabsContent value="compose"><ComposeTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="contacts"><ContactsTab /></TabsContent>
        <TabsContent value="lists"><ListsSection /></TabsContent>
        <TabsContent value="scheduled"><ScheduledTab /></TabsContent>
        <TabsContent value="stats"><StatsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
