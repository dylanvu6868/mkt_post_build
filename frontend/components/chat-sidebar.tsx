"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/store/chat";
import { useAuthStore } from "@/store/auth";
import { normalizePlan, PLAN_META } from "@/lib/plan";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import { handleApiPlanError } from "@/lib/plan-errors";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsModal } from "./settings-modal";
import { ProjectModal } from "./project-modal";

export function ChatSidebar() {
  const { conversations, activeConversationId, loadConversations, createConversation, selectConversation, deleteConversation, renameConversation, pinConversation, sidebarWidth, leftSidebarCollapsed, toggleLeftSidebar, backgroundTasks } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const userPlan = normalizePlan(user?.plan);
  const planMeta = PLAN_META[userPlan];

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuId, setMenuId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    window.addEventListener("toggle-sidebar", toggle);
    return () => window.removeEventListener("toggle-sidebar", toggle);
  }, [toggle]);

  const filtered = search
    ? conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const pinned = filtered.filter((c) => c.is_pinned);
  const unpinned = filtered.filter((c) => !c.is_pinned);

  const handleRename = async (id: number) => {
    if (editTitle.trim()) {
      await renameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleSelect = (id: number) => {
    selectConversation(id);
    setOpen(false);
    if (window.location.pathname !== "/dashboard") router.push("/dashboard");
  };

  const handleCreate = async () => {
    try {
      await createConversation();
      setOpen(false);
      if (window.location.pathname !== "/dashboard") router.push("/dashboard");
    } catch (err) {
      handleApiPlanError(err, () => router.push("/pricing"), "Không thể tạo cuộc trò chuyện");
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" 
            onClick={() => setOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Floating toggle to re-open the sidebar once it's collapsed (desktop only) */}
      {leftSidebarCollapsed && (
        <button
          onClick={toggleLeftSidebar}
          title="Mở sidebar"
          className="hidden md:flex fixed left-3 top-3 z-50 h-9 w-9 items-center justify-center rounded-full border border-border bg-card/95 backdrop-blur-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>
        </button>
      )}

      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-background/95 backdrop-blur-2xl transition-[transform,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "fixed z-50 md:relative md:z-auto",
          leftSidebarCollapsed ? "overflow-hidden border-r-0" : "",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        )}
        style={{ width: leftSidebarCollapsed ? 0 : sidebarWidth }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <h1 className="flex items-center gap-2.5 text-[17px] font-bold text-foreground tracking-tight">
              <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
              Vitba.ai
            </h1>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleLeftSidebar}
              className="hidden md:flex rounded-full p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Đóng sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m15 15-3-3 3-3"/></svg>
            </button>
            <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-accent md:hidden text-muted-foreground hover:text-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div className="px-4 pb-3 space-y-2">
          <ProjectModal>
            <button
              data-tour="project-btn"
              className="flex w-full items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-[14px] font-medium text-primary hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.2)] group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              Dự án hóa
            </button>
          </ProjectModal>
          <button
            data-tour="hub-btn"
            onClick={() => router.push("/hub")}
            className="flex w-full items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-[14px] font-medium text-primary hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.2)] group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            Trung tâm Marketing
          </button>
          <button
            data-tour="new-conv-btn"
            onClick={handleCreate}
            className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-[14px] font-medium text-foreground hover:bg-accent hover:border-primary/50 transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.2)] group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary group-hover:scale-110 transition-transform"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Cuộc trò chuyện mới
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/30"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              data-tour="search-box"
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-card/50 pl-10 pr-4 py-2 text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-card focus:border-primary/30 transition-all shadow-inner text-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 no-scrollbar">
          <AnimatePresence initial={false}>
            {pinned.length > 0 && (
              <motion.div layout className="mb-4">
                <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground/30 mb-1">Đã ghim</p>
                <div className="space-y-0.5">
                  {pinned.map((conv) => (
                    <ConvItem key={conv.id} conv={conv} active={conv.id === activeConversationId} isRunning={!!backgroundTasks[conv.id] && backgroundTasks[conv.id].status === "running"} editing={editingId === conv.id} editTitle={editTitle} menuOpen={menuId === conv.id} onSelect={() => handleSelect(conv.id)} onMenuToggle={() => setMenuId(menuId === conv.id ? null : conv.id)} onStartRename={() => { setEditingId(conv.id); setEditTitle(conv.title); setMenuId(null); }} onRename={() => handleRename(conv.id)} onEditTitleChange={setEditTitle} onPin={() => { pinConversation(conv.id, !conv.is_pinned); setMenuId(null); }} onDelete={() => { deleteConversation(conv.id); setMenuId(null); }} />
                  ))}
                </div>
              </motion.div>
            )}
            {unpinned.length > 0 && (
              <motion.div layout>
                <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground/30 mb-1">Gần đây</p>
                <div className="space-y-0.5">
                  {unpinned.map((conv) => (
                    <ConvItem key={conv.id} conv={conv} active={conv.id === activeConversationId} isRunning={!!backgroundTasks[conv.id] && backgroundTasks[conv.id].status === "running"} editing={editingId === conv.id} editTitle={editTitle} menuOpen={menuId === conv.id} onSelect={() => handleSelect(conv.id)} onMenuToggle={() => setMenuId(menuId === conv.id ? null : conv.id)} onStartRename={() => { setEditingId(conv.id); setEditTitle(conv.title); setMenuId(null); }} onRename={() => handleRename(conv.id)} onEditTitleChange={setEditTitle} onPin={() => { pinConversation(conv.id, !conv.is_pinned); setMenuId(null); }} onDelete={() => { deleteConversation(conv.id); setMenuId(null); }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {filtered.length === 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-10 text-center text-[13px] text-muted-foreground">
              {search ? "Không tìm thấy kết quả" : "Chưa có cuộc trò chuyện"}
            </motion.p>
          )}
        </div>

        <div className="border-t border-border p-4 bg-gradient-to-t from-background to-transparent">
          {user?.is_admin && (
            <a href="/admin" className="mb-3 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-accent border border-border hover:border-border hover:text-foreground transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
              Admin Dashboard
            </a>
          )}
          <div data-tour="user-profile" className="flex items-center justify-between glass-card p-3 rounded-2xl shadow-none border-border hover:border-border group">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-950 text-[13px] font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-foreground">{user?.name}</span>
                  <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", planMeta.badgeBg, planMeta.badgeColor)}>
                    {planMeta.name}
                  </span>
                </div>
                <span className="truncate text-[11px] text-muted-foreground">{user?.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <SettingsModal>
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Cài đặt">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </SettingsModal>
              <button onClick={logout} className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Đăng xuất">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function ConvItem({ conv, active, isRunning, editing, editTitle, menuOpen, onSelect, onMenuToggle, onStartRename, onRename, onEditTitleChange, onPin, onDelete }: {
  conv: { id: number; title: string; is_pinned: boolean; last_message: string | null };
  active: boolean; isRunning: boolean; editing: boolean; editTitle: string; menuOpen: boolean;
  onSelect: () => void; onMenuToggle: () => void; onStartRename: () => void;
  onRename: () => void; onEditTitleChange: (v: string) => void; onPin: () => void; onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn("group relative rounded-xl transition-all duration-200", active ? "bg-primary/10 border border-primary/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "hover:bg-accent border border-transparent")}
    >
      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); onRename(); }} className="px-3 py-2">
          <input autoFocus value={editTitle} onChange={(e) => onEditTitleChange(e.target.value)} onBlur={onRename} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </form>
      ) : (
        <button onClick={onSelect} className="w-full px-3 py-2.5 text-left flex items-center gap-2">
          {isRunning && (
            <span className="shrink-0 h-3.5 w-3.5 rounded-full border-[1.5px] border-primary border-t-transparent animate-spin" />
          )}
          <p className={cn("truncate text-[13px] font-medium", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>{conv.title}</p>
        </button>
      )}
      {!editing && (
        <button onClick={(e) => { e.stopPropagation(); onMenuToggle(); }} className={cn("absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-all", menuOpen ? "opacity-100 bg-muted" : "opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground")}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      )}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-border bg-card/95 backdrop-blur-xl py-1.5 shadow-xl"
          >
            <button onClick={onStartRename} className="flex w-full items-center px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Đổi tên</button>
            <button onClick={onPin} className="flex w-full items-center px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">{conv.is_pinned ? "Bỏ ghim" : "Ghim"}</button>
            <button onClick={onDelete} className="flex w-full items-center px-4 py-2 text-[13px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 transition-colors">Xoá cuộc trò chuyện</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
