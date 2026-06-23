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
const btnSecondary =
  "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition disabled:opacity-50";
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
      const msg = e instanceof Error ? e.message : "Lỗi tải mẫu";
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
        setResult(`Đã gửi tới ${emails.length} địa chỉ!`);
      } else {
        const recipients = JSON.parse(batchData) as Record<string, string>[];
        if (!recipients.length || !subject || !html) return;
        await sendBatchEmail(recipients, subject, html);
        setResult(`Đã gửi batch tới ${recipients.length} người!`);
      }
      setTo("");
      setSubject("");
      setHtml("");
      setBatchData("");
      setSelectedTemplateId("");
      loadEmailStats();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi gửi email";
      setResult(`Lỗi: ${msg}`);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Gửi Email</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setMode("single")} className={mode === "single" ? btn : btn2}>Email đơn</button>
          <button onClick={() => setMode("batch")} className={mode === "batch" ? btn : btn2}>Hàng loạt</button>
        </div>

        {/* Chọn mẫu để điền sẵn */}
        <div>
          <label className="text-sm font-medium mb-1 block">Chọn mẫu (tùy chọn)</label>
          <select className={inp} value={selectedTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)}>
            <option value="">-- Không dùng mẫu --</option>
            {templates.map((t) => (
              <option key={t.id} value={String(t.id)}>{t.name}</option>
            ))}
          </select>
        </div>

        {mode === "single" ? (
          <input className={inp} placeholder="Địa chỉ email (phân cách bằng dấu phẩy)" value={to} onChange={(e) => setTo(e.target.value)} />
        ) : (
          <textarea
            className={ta}
            placeholder={'[\n  {"email":"a@b.com","name":"An"},\n  {"email":"c@d.com","name":"Bình"}\n]'}
            value={batchData}
            onChange={(e) => setBatchData(e.target.value)}
          />
        )}
        <input className={inp} placeholder="Tiêu đề email" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className={ta + " min-h-[200px]"} placeholder="Nội dung HTML (dùng {{name}} cho biến cá nhân hóa)" value={html} onChange={(e) => setHtml(e.target.value)} />
        <div className="flex items-center gap-3">
          <button onClick={handleSend} disabled={sending || !subject || !html} className={btn}>
            {sending ? "Đang gửi..." : "Gửi email"}
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
  const { templates, templatesLoading, loadTemplates, createTemplate, updateTemplate, deleteTemplate, getTemplate } = useMcpStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const openCreate = () => {
    setEditMode(false);
    setEditId(null);
    setName(""); setSubject(""); setHtmlBody(""); setCategory("");
    setDialogOpen(true);
  };

  const openEdit = async (id: number) => {
    try {
      const tpl = await getTemplate(id);
      setEditMode(true);
      setEditId(id);
      setName(tpl.name);
      setSubject(tpl.subject);
      setHtmlBody(tpl.html_body ?? "");
      setCategory(tpl.category ?? "");
      setDialogOpen(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi tải mẫu";
      toast.error(msg);
    }
  };

  const handleSave = async () => {
    if (!name || !subject || !htmlBody) return;
    try {
      if (editMode && editId !== null) {
        await updateTemplate(editId, { name, subject, html_body: htmlBody, category: category || undefined });
        toast.success("Đã cập nhật mẫu email!");
      } else {
        await createTemplate({ name, subject, html_body: htmlBody, category: category || undefined });
        toast.success("Đã tạo mẫu email!");
      }
      setDialogOpen(false);
      setName(""); setSubject(""); setHtmlBody(""); setCategory("");
      loadTemplates();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTemplate(id);
      toast.success("Đã xóa mẫu email!");
      loadTemplates();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi";
      toast.error(msg);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mẫu Email</CardTitle>
        <button className={btn} onClick={openCreate}>Tạo mẫu</button>
      </CardHeader>
      <CardContent>
        {templatesLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có mẫu nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Tên</th>
                  <th className="pb-2 font-medium">Tiêu đề</th>
                  <th className="pb-2 font-medium">Danh mục</th>
                  <th className="pb-2 font-medium">Ngày tạo</th>
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
                    <td className="py-2 flex gap-2">
                      <button className={btnSecondary} onClick={() => openEdit(t.id)}>Chỉnh sửa</button>
                      <button className={btnDanger} onClick={() => handleDelete(t.id)}>Xóa</button>
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
            <DialogTitle>{editMode ? "Chỉnh sửa mẫu email" : "Tạo mẫu email mới"}</DialogTitle>
            <DialogDescription>Điền thông tin mẫu email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input className={inp} placeholder="Tên mẫu" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inp} placeholder="Tiêu đề" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <textarea className={ta} placeholder="Nội dung HTML" value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} />
            <input className={inp} placeholder="Danh mục (tùy chọn)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <button className={btn} onClick={handleSave} disabled={!name || !subject || !htmlBody}>
              {editMode ? "Lưu thay đổi" : "Tạo"}
            </button>
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
  const {
    contacts, contactsLoading, loadContacts, createContact, updateContact, importContacts, deleteContact,
    lists, loadLists, addContactsToList,
  } = useMcpStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("active");
  const [filterTag, setFilterTag] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  /* Add-to-list state */
  const [addListDialogOpen, setAddListDialogOpen] = useState(false);
  const [addListContactId, setAddListContactId] = useState<number | null>(null);
  const [selectedListId, setSelectedListId] = useState("");

  useEffect(() => { loadContacts(); loadLists(); }, [loadContacts, loadLists]);

  const handleFilter = () => {
    loadContacts(filterTag || undefined, filterStatus || undefined);
  };

  const openCreate = () => {
    setEditMode(false);
    setEditId(null);
    setEmail(""); setName(""); setTags(""); setStatus("active");
    setDialogOpen(true);
  };

  const openEdit = (c: { id: number; email: string; name?: string; tags?: string[]; status: string }) => {
    setEditMode(true);
    setEditId(c.id);
    setEmail(c.email);
    setName(c.name ?? "");
    setTags(c.tags ? c.tags.join(", ") : "");
    setStatus(c.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editMode && editId !== null) {
        await updateContact(editId, {
          name: name || undefined,
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
          status,
        });
        toast.success("Đã cập nhật liên hệ!");
      } else {
        if (!email) return;
        await createContact({
          email,
          name: name || undefined,
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        });
        toast.success("Đã thêm liên hệ!");
      }
      setDialogOpen(false);
      setEmail(""); setName(""); setTags(""); setStatus("active");
      loadContacts(filterTag || undefined, filterStatus || undefined);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi";
      toast.error(msg);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importContacts(file);
      toast.success(`Đã nhập ${res.imported} liên hệ!`);
      loadContacts(filterTag || undefined, filterStatus || undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi nhập dữ liệu";
      toast.error(msg);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteContact(id);
      toast.success("Đã xóa liên hệ!");
      loadContacts(filterTag || undefined, filterStatus || undefined);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi";
      toast.error(msg);
    }
  };

  const openAddToList = (contactId: number) => {
    setAddListContactId(contactId);
    setSelectedListId("");
    setAddListDialogOpen(true);
  };

  const handleAddToList = async () => {
    if (!addListContactId || !selectedListId) return;
    try {
      await addContactsToList(Number(selectedListId), [addListContactId]);
      toast.success("Đã thêm liên hệ vào danh sách!");
      setAddListDialogOpen(false);
      loadLists();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi";
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
        <CardTitle>Liên hệ</CardTitle>
        <div className="flex gap-2 flex-wrap">
          <button className={btn} onClick={openCreate}>Thêm liên hệ</button>
          <label className={btn2 + " cursor-pointer"}>
            Nhập CSV
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bộ lọc */}
        <div className="flex gap-2 flex-wrap">
          <input className={inp + " max-w-[200px]"} placeholder="Lọc theo nhãn" value={filterTag} onChange={(e) => setFilterTag(e.target.value)} />
          <select className={inp + " max-w-[180px]"} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="subscribed">Đã đăng ký</option>
            <option value="unsubscribed">Đã hủy đăng ký</option>
          </select>
          <button className={btn2} onClick={handleFilter}>Lọc</button>
        </div>

        {contactsLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có liên hệ nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Tên</th>
                  <th className="pb-2 font-medium">Nhãn</th>
                  <th className="pb-2 font-medium">Trạng thái</th>
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
                    <td className="py-2 flex gap-2">
                      <button className={btnSecondary} onClick={() => openEdit(c)}>Chỉnh sửa</button>
                      <button className={btnSecondary} onClick={() => openAddToList(c.id)}>Thêm vào DS</button>
                      <button className={btnDanger} onClick={() => handleDelete(c.id)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Dialog tạo/chỉnh sửa liên hệ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMode ? "Chỉnh sửa liên hệ" : "Thêm liên hệ mới"}</DialogTitle>
            <DialogDescription>Nhập thông tin liên hệ.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!editMode && (
              <input className={inp} placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} />
            )}
            <input className={inp} placeholder="Tên (tùy chọn)" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inp} placeholder="Nhãn (phân cách bằng dấu phẩy)" value={tags} onChange={(e) => setTags(e.target.value)} />
            {editMode && (
              <select className={inp} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Đang hoạt động</option>
                <option value="unsubscribed">Đã hủy đăng ký</option>
                <option value="bounced">Bounce</option>
              </select>
            )}
            <button className={btn} onClick={handleSave} disabled={!editMode && !email}>
              {editMode ? "Lưu thay đổi" : "Thêm"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog thêm vào danh sách */}
      <Dialog open={addListDialogOpen} onOpenChange={setAddListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm vào danh sách gửi</DialogTitle>
            <DialogDescription>Chọn danh sách để thêm liên hệ này vào.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <select className={inp} value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}>
              <option value="">-- Chọn danh sách --</option>
              {lists.map((l) => (
                <option key={l.id} value={String(l.id)}>{l.name} ({l.contact_count} liên hệ)</option>
              ))}
            </select>
            <button className={btn} onClick={handleAddToList} disabled={!selectedListId}>Thêm vào danh sách</button>
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
      toast.success("Đã lên lịch gửi email!");
      setTemplateId(""); setListId(""); setScheduledAt("");
      loadScheduled();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelSchedule(id);
      toast.success("Đã hủy lịch gửi!");
      loadScheduled();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi";
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
      <CardHeader><CardTitle>Lên lịch gửi email</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {/* Form lên lịch */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Mẫu email</label>
            <select className={inp} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">-- Chọn --</option>
              {templates.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Danh sách</label>
            <select className={inp} value={listId} onChange={(e) => setListId(e.target.value)}>
              <option value="">-- Chọn --</option>
              {lists.map((l) => <option key={l.id} value={String(l.id)}>{l.name} ({l.contact_count})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Thời gian gửi</label>
            <input type="datetime-local" className={inp} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button className={btn} onClick={handleSchedule} disabled={submitting || !templateId || !listId || !scheduledAt}>
              {submitting ? "Đang lên lịch..." : "Lên lịch"}
            </button>
          </div>
        </div>

        {/* Danh sách lịch gửi */}
        {scheduledLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có lịch gửi nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Mẫu email</th>
                  <th className="pb-2 font-medium">Danh sách</th>
                  <th className="pb-2 font-medium">Thời gian gửi</th>
                  <th className="pb-2 font-medium">Trạng thái</th>
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
                        <button className={btnDanger} onClick={() => handleCancel(s.id)}>Hủy</button>
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
      <CardHeader><CardTitle className="text-sm">Thống kê Email</CardTitle></CardHeader>
      <CardContent>
        {emailStatsLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
        ) : emailStats ? (
          <div className="space-y-4">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Chiến dịch</span><span className="text-sm font-medium">{emailStats.campaigns}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Tổng gửi</span><span className="text-sm font-medium">{emailStats.total_sent}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Đã mở</span><span className="text-sm font-medium">{emailStats.total_opened} ({emailStats.open_rate}%)</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Đã nhấp</span><span className="text-sm font-medium">{emailStats.total_clicked} ({emailStats.click_rate}%)</span></div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Tỉ lệ mở</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(emailStats.open_rate, 100)}%` }} /></div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tỉ lệ nhấp</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(emailStats.click_rate, 100)}%` }} /></div>
            </div>
          </div>
        ) : <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>}
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
      toast.success("Đã tạo danh sách!");
      setDialogOpen(false);
      setName(""); setDescription("");
      loadLists();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteList(id);
      toast.success("Đã xóa danh sách!");
      loadLists();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi";
      toast.error(msg);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Danh sách gửi</CardTitle>
        <button className={btn} onClick={() => setDialogOpen(true)}>Tạo danh sách</button>
      </CardHeader>
      <CardContent>
        {listsLoading ? (
          <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có danh sách nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Tên</th>
                  <th className="pb-2 font-medium">Mô tả</th>
                  <th className="pb-2 font-medium">Số liên hệ</th>
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
                      <button className={btnDanger} onClick={() => handleDelete(l.id)}>Xóa</button>
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
            <DialogTitle>Tạo danh sách mới</DialogTitle>
            <DialogDescription>Nhập thông tin danh sách gửi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input className={inp} placeholder="Tên danh sách *" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inp} placeholder="Mô tả (tùy chọn)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <button className={btn} onClick={handleCreate} disabled={!name}>Tạo</button>
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
          <TabsTrigger value="compose">Gửi email</TabsTrigger>
          <TabsTrigger value="templates">Mẫu email</TabsTrigger>
          <TabsTrigger value="contacts">Liên hệ</TabsTrigger>
          <TabsTrigger value="lists">Danh sách</TabsTrigger>
          <TabsTrigger value="scheduled">Lên lịch</TabsTrigger>
          <TabsTrigger value="stats">Thống kê</TabsTrigger>
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
