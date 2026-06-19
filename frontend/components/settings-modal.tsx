"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects, useCreateProject } from "@/hooks/use-projects";
import { useProjectStore } from "@/store/project";
import { useBrandProfile, useUpsertBrand } from "@/hooks/use-brand";
import { useDocuments, useUploadDocument } from "@/hooks/use-documents";
import { useTemplate, useUpsertTemplate } from "@/hooks/use-template";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 1. Projects Component
function ProjectsTab() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const { activeProject, setActiveProject } = useProjectStore();
  const [name, setName] = useState("");

  // Auto-select valid project if activeProject is invalid or missing
  useEffect(() => {
    if (!isLoading && projects) {
      if (activeProject && !projects.find(p => p.id === activeProject.id)) {
        setActiveProject(projects.length > 0 ? projects[0] : null);
      } else if (!activeProject && projects.length > 0) {
        setActiveProject(projects[0]);
      }
    }
  }, [projects, isLoading, activeProject, setActiveProject]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const project = await createProject.mutateAsync(name.trim());
      setActiveProject(project);
      setName("");
      toast.success("Đã tạo dự án mới");
    } catch {
      toast.error("Tạo dự án thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted p-4 rounded-xl border border-border shadow-inner">
        <h3 className="text-sm font-semibold text-foreground mb-3">Tạo dự án mới</h3>
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            placeholder="Tên dự án..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-card border-border text-foreground focus-visible:ring-primary/50"
          />
          <button 
            type="submit" 
            disabled={createProject.isPending}
            className="px-4 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createProject.isPending ? "Đang tạo..." : "Tạo"}
          </button>
        </form>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : projects?.map((project) => (
          <div
            key={project.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
              activeProject?.id === project.id ? "bg-primary/10 border-primary/30 shadow-[inset_0_0_15px_rgba(255,213,74,0.1)]" : "bg-muted border-border hover:border-border"
            )}
          >
            <div>
              <p className={cn("text-sm font-medium transition-colors", activeProject?.id === project.id ? "text-primary" : "text-foreground")}>{project.name}</p>
              <p className="text-xs text-muted-foreground">{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
            {activeProject?.id === project.id ? (
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-primary/20 text-primary rounded-md border border-primary/20">Đang chọn</span>
            ) : (
              <button
                onClick={() => setActiveProject(project)}
                className="text-xs px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground hover:bg-accent rounded-md border border-border transition-colors"
              >
                Chọn
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. Brand Voice Component
function BrandVoiceTab() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: profile, isLoading } = useBrandProfile(activeProject?.id);
  const upsert = useUpsertBrand();

  const [brandName, setBrandName] = useState("");
  const [tone, setTone] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [preferredWords, setPreferredWords] = useState("");
  const [forbiddenWords, setForbiddenWords] = useState("");

  useEffect(() => {
    if (profile) {
      setBrandName(profile.brand_name);
      setTone(profile.tone);
      setWritingStyle(profile.writing_style);
      setPreferredWords(profile.preferred_words.join(", "));
      setForbiddenWords(profile.forbidden_words.join(", "));
    }
  }, [profile]);

  if (!activeProject) {
    return <p className="text-sm text-muted-foreground bg-muted p-4 rounded-xl border border-border">Vui lòng chọn một dự án ở tab "Dự án" trước khi cấu hình giọng điệu.</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsert.mutateAsync({
        project_id: activeProject.id,
        brand_name: brandName,
        tone,
        writing_style: writingStyle,
        preferred_words: preferredWords.split(",").map((w) => w.trim()).filter(Boolean),
        forbidden_words: forbiddenWords.split(",").map((w) => w.trim()).filter(Boolean),
      });
      toast.success("Đã lưu cấu hình giọng điệu");
    } catch {
      toast.error("Lưu cấu hình thất bại");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
      <div className="space-y-2">
        <Label className="text-muted-foreground">Tên thương hiệu</Label>
        <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="VD: Vitba AI" className="bg-muted border-border text-foreground focus-visible:ring-primary/50" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Giọng điệu (Tone)</Label>
        <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="VD: thân thiện, chuyên nghiệp" className="bg-muted border-border text-foreground focus-visible:ring-primary/50" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Phong cách viết (Style)</Label>
        <Input value={writingStyle} onChange={(e) => setWritingStyle(e.target.value)} placeholder="VD: trang trọng, ngắn gọn" className="bg-muted border-border text-foreground focus-visible:ring-primary/50" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Từ vựng ưu tiên (cách nhau bằng dấu phẩy)</Label>
        <Input value={preferredWords} onChange={(e) => setPreferredWords(e.target.value)} placeholder="VD: cao cấp, đột phá" className="bg-muted border-border text-foreground focus-visible:ring-primary/50" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Từ vựng cấm dùng (cách nhau bằng dấu phẩy)</Label>
        <Input value={forbiddenWords} onChange={(e) => setForbiddenWords(e.target.value)} placeholder="VD: giá rẻ, bình dân" className="bg-muted border-border text-foreground focus-visible:ring-primary/50" />
      </div>
      <button type="submit" disabled={upsert.isPending} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 mt-4 transition-all hover:scale-[1.02] active:scale-[0.98]">
        {upsert.isPending ? "Đang lưu..." : "Lưu giọng điệu"}
      </button>
    </form>
  );
}

// 3. Knowledge Base Component
function KnowledgeBaseTab() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: documents, isLoading } = useDocuments(activeProject?.id);
  const upload = useUploadDocument();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!activeProject) {
    return <p className="text-sm text-muted-foreground bg-muted p-4 rounded-xl border border-border">Vui lòng chọn một dự án ở tab "Dự án" trước khi tải tài liệu lên.</p>;
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await upload.mutateAsync({ projectId: activeProject.id, file });
      toast.success("Đã tải tài liệu lên thành công");
    } catch {
      toast.error("Tải tài liệu thất bại");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted p-6 rounded-xl border border-border text-center border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleUpload} />
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-primary transition-colors"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
        <h3 className="text-sm font-medium text-foreground">Tải tài liệu nền lên</h3>
        <p className="text-xs text-muted-foreground mt-1">Hỗ trợ PDF, DOCX, TXT. Nhấp để chọn file.</p>
        {upload.isPending && <p className="text-xs text-primary mt-3 font-semibold animate-pulse">Đang xử lý tải lên...</p>}
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">Tài liệu đã tải</h4>
        {isLoading && <p className="text-sm text-muted-foreground">Đang tải danh sách...</p>}
        {!isLoading && !documents?.length && <p className="text-sm text-muted-foreground italic">Chưa có tài liệu nào.</p>}
        {documents?.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between rounded-xl bg-muted border border-border p-3 hover:bg-accent transition-colors">
            <span className="text-sm text-foreground truncate max-w-[200px] font-medium">{doc.filename}</span>
            <span className={cn("text-[10px] uppercase font-bold px-2.5 py-1 rounded-md border", doc.status === "done" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border")}>
              {doc.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. Templates Component
const CONTENT_TYPES = [
  { value: "facebook_post", label: "Bài đăng Facebook" },
  { value: "seo_blog", label: "SEO Blog" },
  { value: "email", label: "Email Marketing" },
  { value: "landing_page", label: "Landing Page" },
  { value: "tiktok_script", label: "Kịch bản TikTok" },
];

function TemplatesTab() {
  const [contentType, setContentType] = useState("facebook_post");
  const [templateText, setTemplateText] = useState("");
  const { data: template, isLoading } = useTemplate(contentType);
  const upsert = useUpsertTemplate();

  useEffect(() => {
    if (template) {
      setTemplateText(template.template_text);
    } else if (!isLoading) {
      setTemplateText("");
    }
  }, [template, isLoading, contentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsert.mutateAsync({ content_type: contentType, template_text: templateText });
      toast.success("Đã lưu mẫu cấu trúc thành công");
    } catch {
      toast.error("Lưu cấu trúc thất bại");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-muted-foreground">Loại nội dung</Label>
        <Select value={contentType} onValueChange={setContentType}>
          <SelectTrigger className="bg-muted border-border text-foreground focus:ring-primary/50">
            <SelectValue placeholder="Chọn loại" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            {CONTENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value} className="focus:bg-muted focus:text-foreground cursor-pointer">
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Cấu trúc mẫu (Template Format)</Label>
        <Textarea
          value={templateText}
          onChange={(e) => setTemplateText(e.target.value)}
          placeholder={`Ví dụ:\n[Tiêu đề thu hút]\n- [Lợi ích 1]\n- [Lợi ích 2]\n\n[Kêu gọi hành động]`}
          className="min-h-[220px] bg-muted border-border text-foreground font-mono text-sm custom-scrollbar focus-visible:ring-primary/50"
        />
        <p className="text-[12px] text-muted-foreground mt-1">Dùng [Title] hoặc ngoặc vuông để thiết lập biến số khung sườn.</p>
      </div>
      <button type="submit" disabled={upsert.isPending || isLoading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 mt-2 transition-all hover:scale-[1.02] active:scale-[0.98]">
        {upsert.isPending ? "Đang lưu..." : "Lưu cấu trúc"}
      </button>
    </form>
  );
}

// 5. Account Component
function AccountTab({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const currentPlan: string = "lite";

  const planConfig: Record<string, { label: string; color: string; bg: string }> = {
    lite: { label: "Lite", color: "text-zinc-400", bg: "bg-zinc-500/15" },
    pro: { label: "Pro", color: "text-yellow-400", bg: "bg-yellow-500/15" },
    max: { label: "Max", color: "text-violet-400", bg: "bg-violet-500/15" },
  };
  const plan = planConfig[currentPlan];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted border border-border">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-950 text-xl font-bold shrink-0">
          {user?.name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-foreground truncate">{user?.name}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", plan.bg, plan.color)}>
              {plan.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground">Thông tin tài khoản</h4>
        <div className="space-y-2">
          {[
            { label: "Tên hiển thị", value: user?.name || "—" },
            { label: "Email", value: user?.email || "—" },
            { label: "Vai trò", value: user?.is_admin ? "Quản trị viên" : "Thành viên" },
            { label: "Gói hiện tại", value: plan.label },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-xl bg-muted border border-border px-4 py-3">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {currentPlan !== "max" && (
        <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Nâng cấp gói</p>
              <p className="text-xs text-muted-foreground mt-0.5">Mở khóa thêm tính năng và tăng giới hạn</p>
            </div>
            <button
              onClick={() => { onClose(); router.push("/pricing"); }}
              className="rounded-[12px] bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-xs font-bold text-amber-950 hover:from-yellow-300 hover:to-amber-400 transition-all"
            >
              Xem gói
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Modal Component
export function SettingsModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px] bg-[#0a0a0a]/95 backdrop-blur-3xl border-border text-foreground shadow-[0_0_80px_rgba(0,0,0,0.8)] p-0 overflow-hidden rounded-[24px]">
        <div className="flex h-[600px]">
          {/* Left Sidebar for Tabs */}
          <Tabs defaultValue="account" className="flex w-full h-full" orientation="vertical">
            <div className="w-[220px] border-r border-border bg-card/40 p-5 flex flex-col">
              <DialogHeader className="mb-6 text-left">
                <DialogTitle className="text-xl font-bold text-foreground tracking-tight">Cài đặt</DialogTitle>
              </DialogHeader>
              <TabsList className="flex flex-col h-auto bg-transparent space-y-1.5 p-0 items-stretch">
                <TabsTrigger value="account" className="justify-start px-3 py-2.5 text-[14px] font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-xl transition-all hover:bg-accent hover:text-muted-foreground data-[state=active]:hover:text-primary border border-transparent data-[state=active]:border-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Tài khoản
                </TabsTrigger>
                <TabsTrigger value="projects" className="justify-start px-3 py-2.5 text-[14px] font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-xl transition-all hover:bg-accent hover:text-muted-foreground data-[state=active]:hover:text-primary border border-transparent data-[state=active]:border-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  Dự án
                </TabsTrigger>
                <TabsTrigger value="brand" className="justify-start px-3 py-2.5 text-[14px] font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-xl transition-all hover:bg-accent hover:text-muted-foreground data-[state=active]:hover:text-primary border border-transparent data-[state=active]:border-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                  Giọng điệu
                </TabsTrigger>
                <TabsTrigger value="knowledge" className="justify-start px-3 py-2.5 text-[14px] font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-xl transition-all hover:bg-accent hover:text-muted-foreground data-[state=active]:hover:text-primary border border-transparent data-[state=active]:border-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                  Cơ sở kiến thức
                </TabsTrigger>
                <TabsTrigger value="templates" className="justify-start px-3 py-2.5 text-[14px] font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-xl transition-all hover:bg-accent hover:text-muted-foreground data-[state=active]:hover:text-primary border border-transparent data-[state=active]:border-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                  Mẫu Cấu trúc
                </TabsTrigger>
              </TabsList>
              
              {/* Decorative gradient overlay */}
              <div className="mt-auto h-24 bg-gradient-to-t from-card to-transparent pointer-events-none -mx-5 -mb-5" />
            </div>
            
            <div className="flex-1 p-8 bg-transparent overflow-y-auto">
              <TabsContent value="account" className="mt-0 h-full data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Tài khoản</h2>
                  <p className="text-[14px] text-muted-foreground mt-1">Thông tin cá nhân và gói đăng ký của bạn.</p>
                </div>
                <AccountTab onClose={() => setOpen(false)} />
              </TabsContent>
              <TabsContent value="projects" className="mt-0 h-full data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Quản lý Dự án</h2>
                  <p className="text-[14px] text-muted-foreground mt-1">Dự án là "thư mục" riêng biệt để chứa Giọng điệu, Tài liệu AI và Mẫu nội dung của từng chiến dịch.</p>
                </div>
                <ProjectsTab />
              </TabsContent>
              <TabsContent value="brand" className="mt-0 h-full data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Giọng điệu thương hiệu</h2>
                  <p className="text-[14px] text-muted-foreground mt-1">Định hình phong cách viết cho dự án hiện hành.</p>
                </div>
                <BrandVoiceTab />
              </TabsContent>
              <TabsContent value="knowledge" className="mt-0 h-full data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Cơ sở kiến thức (RAG)</h2>
                  <p className="text-[14px] text-muted-foreground mt-1">Cung cấp tài liệu (PDF, Word) để AI hiểu rõ ngữ cảnh dự án.</p>
                </div>
                <KnowledgeBaseTab />
              </TabsContent>
              <TabsContent value="templates" className="mt-0 h-full data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Mẫu Cấu trúc (Templates)</h2>
                  <p className="text-[14px] text-muted-foreground mt-1">Ép AI xuất ra kết quả theo đúng cấu trúc mẫu mà bạn yêu cầu.</p>
                </div>
                <TemplatesTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
