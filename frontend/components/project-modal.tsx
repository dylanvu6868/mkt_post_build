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
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { CONTENT_TYPE_LABELS, ALL_CONTENT_TYPES } from "@/lib/plan";
import { handleApiPlanError } from "@/lib/plan-errors";
import { PlanUsageBar, PlanUpgradeBanner } from "@/components/plan-usage-bar";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function ProjectsTab({ onUpgrade }: { onUpgrade: () => void }) {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const { activeProject, setActiveProject } = useProjectStore();
  const { data: planData } = usePlanLimits();
  const [name, setName] = useState("");

  const projectUsage = planData?.usage.projects;
  const atProjectLimit =
    projectUsage?.max !== null &&
    projectUsage !== undefined &&
    projectUsage.used >= projectUsage.max;

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
    if (!name.trim() || atProjectLimit) return;
    try {
      const project = await createProject.mutateAsync(name.trim());
      setActiveProject(project);
      setName("");
      toast.success("Tạo dự án mới thành công");
    } catch (err) {
      handleApiPlanError(err, onUpgrade, "Tạo dự án thất bại");
    }
  };

  return (
    <div className="space-y-6">
      {projectUsage && (
        <PlanUsageBar label="Dự án" item={projectUsage} />
      )}
      {atProjectLimit && (
        <PlanUpgradeBanner
          message={`Bạn đã dùng hết ${projectUsage?.max} dự án. Nâng cấp gói để tạo thêm.`}
          onUpgrade={onUpgrade}
        />
      )}
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
            disabled={createProject.isPending || atProjectLimit}
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

function BrandVoiceTab({ onUpgrade }: { onUpgrade: () => void }) {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: profile, isLoading } = useBrandProfile(activeProject?.id);
  const { data: planData } = usePlanLimits();
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
    return <p className="text-sm text-muted-foreground bg-muted p-4 rounded-xl border border-border">Vui lòng chọn một dự án ở tab &quot;Dự án&quot; trước khi cấu hình giọng điệu.</p>;
  }

  const brandUsage = planData?.usage.brand_profiles;
  const isNewProfile = !profile && !isLoading;
  const atBrandLimit =
    isNewProfile &&
    brandUsage?.max !== null &&
    brandUsage !== undefined &&
    brandUsage.used >= brandUsage.max;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (atBrandLimit) return;
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
    } catch (err) {
      handleApiPlanError(err, onUpgrade, "Lưu cấu hình thất bại");
    }
  };

  return (
    <div className="space-y-4">
      {brandUsage && <PlanUsageBar label="Brand Voice profiles" item={brandUsage} />}
      {atBrandLimit && (
        <PlanUpgradeBanner
          message={`Bạn đã dùng hết ${brandUsage?.max} Brand Voice. Nâng cấp gói để tạo thêm.`}
          onUpgrade={onUpgrade}
        />
      )}
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Tên thương hiệu</Label>
          <div className="relative">
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="VD: Vitba AI" className="bg-muted border-border text-foreground focus-visible:ring-primary/50 pr-8" />
            {brandName && <button type="button" onClick={() => setBrandName("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Giọng điệu (Tone)</Label>
          <div className="relative">
            <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="VD: thân thiện, chuyên nghiệp" className="bg-muted border-border text-foreground focus-visible:ring-primary/50 pr-8" />
            {tone && <button type="button" onClick={() => setTone("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Phong cách viết (Style)</Label>
          <div className="relative">
            <Input value={writingStyle} onChange={(e) => setWritingStyle(e.target.value)} placeholder="VD: trang trọng, ngắn gọn" className="bg-muted border-border text-foreground focus-visible:ring-primary/50 pr-8" />
            {writingStyle && <button type="button" onClick={() => setWritingStyle("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Từ vựng ưu tiên (cách nhau bằng dấu phẩy)</Label>
          <div className="relative">
            <Input value={preferredWords} onChange={(e) => setPreferredWords(e.target.value)} placeholder="VD: cao cấp, đột phá" className="bg-muted border-border text-foreground focus-visible:ring-primary/50 pr-8" />
            {preferredWords && <button type="button" onClick={() => setPreferredWords("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Từ vựng cấm dùng (cách nhau bằng dấu phẩy)</Label>
          <div className="relative">
            <Input value={forbiddenWords} onChange={(e) => setForbiddenWords(e.target.value)} placeholder="VD: giá rẻ, bình dân" className="bg-muted border-border text-foreground focus-visible:ring-primary/50 pr-8" />
            {forbiddenWords && <button type="button" onClick={() => setForbiddenWords("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
          </div>
        </div>
        <button type="submit" disabled={upsert.isPending || atBrandLimit} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 mt-4 transition-all hover:scale-[1.02] active:scale-[0.98]">
          {upsert.isPending ? "Đang lưu..." : "Lưu giọng điệu"}
        </button>
      </form>
    </div>
  );
}

function KnowledgeBaseTab({ onUpgrade }: { onUpgrade: () => void }) {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: documents, isLoading } = useDocuments(activeProject?.id);
  const { data: planData } = usePlanLimits();
  const upload = useUploadDocument();
  const fileRef = useRef<HTMLInputElement>(null);

  const kbUsage = planData?.usage.kb_files;
  const atKbLimit =
    kbUsage?.max !== null &&
    kbUsage !== undefined &&
    kbUsage.used >= kbUsage.max;

  if (!activeProject) {
    return <p className="text-sm text-muted-foreground bg-muted p-4 rounded-xl border border-border">Vui lòng chọn một dự án ở tab &quot;Dự án&quot; trước khi tải tài liệu lên.</p>;
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || atKbLimit) return;
    try {
      await upload.mutateAsync({ projectId: activeProject.id, file });
      toast.success("Đã tải tài liệu lên thành công");
    } catch (err) {
      handleApiPlanError(err, onUpgrade, "Tải tài liệu thất bại");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {kbUsage && <PlanUsageBar label="Tài liệu Knowledge Base" item={kbUsage} />}
      {atKbLimit && (
        <PlanUpgradeBanner
          message={`Bạn đã dùng hết ${kbUsage?.max} tài liệu KB. Nâng cấp gói để tải thêm.`}
          onUpgrade={onUpgrade}
        />
      )}
      <div
        className={cn(
          "bg-muted p-6 rounded-xl border border-border text-center border-dashed border-2 transition-colors group",
          atKbLimit ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 cursor-pointer",
        )}
        onClick={() => !atKbLimit && fileRef.current?.click()}
      >
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

function TemplatesTab({ onUpgrade }: { onUpgrade: () => void }) {
  const { data: planData } = usePlanLimits();
  const allowedTypes = planData?.limits.content_types ?? ["facebook_post", "email"];
  const [contentType, setContentType] = useState("facebook_post");
  const [templateText, setTemplateText] = useState("");
  const { data: template, isLoading } = useTemplate(contentType);
  const upsert = useUpsertTemplate();

  const templateOptions = ALL_CONTENT_TYPES.map((value) => ({
    value,
    label: CONTENT_TYPE_LABELS[value] ?? value,
    allowed: allowedTypes.includes(value),
  }));

  useEffect(() => {
    if (templateOptions.length > 0 && !allowedTypes.includes(contentType)) {
      setContentType(allowedTypes[0]);
    }
  }, [allowedTypes, contentType, templateOptions.length]);

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
            {templateOptions.map((type) => (
              <SelectItem
                key={type.value}
                value={type.value}
                disabled={!type.allowed}
                className="focus:bg-muted focus:text-foreground cursor-pointer"
              >
                {type.label}{!type.allowed ? " (Cần nâng gói)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {templateOptions.some((t) => !t.allowed) && (
          <p className="text-[11px] text-muted-foreground">
            Một số loại nội dung cần gói Pro/Max.{" "}
            <button type="button" onClick={onUpgrade} className="text-primary underline">
              Nâng cấp ngay
            </button>
          </p>
        )}
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

export function ProjectModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const goUpgrade = () => {
    setOpen(false);
    router.push("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px] bg-background/95 backdrop-blur-3xl border-border text-foreground shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_80px_rgba(0,0,0,0.8)] p-0 overflow-hidden rounded-3xl">
        <div className="flex h-[600px]">
          <Tabs defaultValue="projects" className="flex w-full h-full" orientation="vertical">
            <div className="w-[220px] border-r border-border bg-card/40 p-5 flex flex-col">
              <DialogHeader className="mb-6 text-left">
                <DialogTitle className="text-xl font-bold text-foreground tracking-tight">Dự án hóa</DialogTitle>
              </DialogHeader>
              <TabsList className="flex flex-col h-auto bg-transparent space-y-1.5 p-0 items-stretch">
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
              <div className="mt-auto h-24 bg-gradient-to-t from-card to-transparent pointer-events-none -mx-5 -mb-5" />
            </div>

            <div className="flex-1 p-8 bg-transparent overflow-y-auto">
              <TabsContent value="projects" className="mt-0 h-full data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Quản lý Dự án</h2>
                  <p className="text-[14px] text-muted-foreground mt-1">Dự án là &quot;thư mục&quot; riêng biệt để chứa Giọng điệu, Tài liệu AI và Mẫu nội dung của từng chiến dịch.</p>
                </div>
                <ProjectsTab onUpgrade={goUpgrade} />
              </TabsContent>
              <TabsContent value="brand" className="mt-0 h-full data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Giọng điệu thương hiệu</h2>
                  <p className="text-[14px] text-muted-foreground mt-1">Định hình phong cách viết cho dự án hiện hành.</p>
                </div>
                <BrandVoiceTab onUpgrade={goUpgrade} />
              </TabsContent>
              <TabsContent value="knowledge" className="mt-0 h-full data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Cơ sở kiến thức (RAG)</h2>
                  <p className="text-[14px] text-muted-foreground mt-1">Cung cấp tài liệu (PDF, Word) để AI hiểu rõ ngữ cảnh dự án.</p>
                </div>
                <KnowledgeBaseTab onUpgrade={goUpgrade} />
              </TabsContent>
              <TabsContent value="templates" className="mt-0 h-full data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Mẫu Cấu trúc (Templates)</h2>
                  <p className="text-[14px] text-muted-foreground mt-1">Ép AI xuất ra kết quả theo đúng cấu trúc mẫu mà bạn yêu cầu.</p>
                </div>
                <TemplatesTab onUpgrade={goUpgrade} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
