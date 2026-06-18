"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/store/chat";
import { useAuthStore } from "@/store/auth";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

export function ChatSidebar() {
  const { conversations, activeConversationId, loadConversations, createConversation, selectConversation, deleteConversation, renameConversation, pinConversation } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuId, setMenuId] = useState<number | null>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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

  return (
    <aside className="flex h-screen w-72 flex-col border-r bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-lg font-bold">AI Marketing</h1>
        <ThemeToggle />
      </div>

      <div className="p-3">
        <button
          onClick={() => createConversation()}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New conversation
        </button>
      </div>

      <div className="px-3 pb-2">
        <input
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {pinned.length > 0 && (
          <>
            <p className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Pinned</p>
            {pinned.map((conv) => (
              <ConvItem key={conv.id} conv={conv} active={conv.id === activeConversationId} editing={editingId === conv.id} editTitle={editTitle} menuOpen={menuId === conv.id} onSelect={() => selectConversation(conv.id)} onMenuToggle={() => setMenuId(menuId === conv.id ? null : conv.id)} onStartRename={() => { setEditingId(conv.id); setEditTitle(conv.title); setMenuId(null); }} onRename={() => handleRename(conv.id)} onEditTitleChange={setEditTitle} onPin={() => { pinConversation(conv.id, !conv.is_pinned); setMenuId(null); }} onDelete={() => { deleteConversation(conv.id); setMenuId(null); }} />
            ))}
          </>
        )}
        {unpinned.length > 0 && (
          <>
            {pinned.length > 0 && <p className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground mt-2">Recent</p>}
            {unpinned.map((conv) => (
              <ConvItem key={conv.id} conv={conv} active={conv.id === activeConversationId} editing={editingId === conv.id} editTitle={editTitle} menuOpen={menuId === conv.id} onSelect={() => selectConversation(conv.id)} onMenuToggle={() => setMenuId(menuId === conv.id ? null : conv.id)} onStartRename={() => { setEditingId(conv.id); setEditTitle(conv.title); setMenuId(null); }} onRename={() => handleRename(conv.id)} onEditTitleChange={setEditTitle} onPin={() => { pinConversation(conv.id, !conv.is_pinned); setMenuId(null); }} onDelete={() => { deleteConversation(conv.id); setMenuId(null); }} />
            ))}
          </>
        )}
        {filtered.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {search ? "No results" : "No conversations yet"}
          </p>
        )}
      </div>

      <div className="border-t p-3">
        {user?.is_admin && (
          <a href="/admin" className="mb-2 block rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
            Admin Dashboard
          </a>
        )}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <button onClick={logout} className="ml-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Logout">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

function ConvItem({ conv, active, editing, editTitle, menuOpen, onSelect, onMenuToggle, onStartRename, onRename, onEditTitleChange, onPin, onDelete }: {
  conv: { id: number; title: string; is_pinned: boolean; last_message: string | null };
  active: boolean; editing: boolean; editTitle: string; menuOpen: boolean;
  onSelect: () => void; onMenuToggle: () => void; onStartRename: () => void;
  onRename: () => void; onEditTitleChange: (v: string) => void; onPin: () => void; onDelete: () => void;
}) {
  return (
    <div className={cn("group relative my-0.5 rounded-lg transition-colors", active ? "bg-muted" : "hover:bg-muted/50")}>
      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); onRename(); }} className="px-3 py-2">
          <input autoFocus value={editTitle} onChange={(e) => onEditTitleChange(e.target.value)} onBlur={onRename} className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </form>
      ) : (
        <button onClick={onSelect} className="w-full px-3 py-2 text-left">
          <p className="truncate text-sm">{conv.title}</p>
          {conv.last_message && <p className="mt-0.5 truncate text-xs text-muted-foreground">{conv.last_message}</p>}
        </button>
      )}
      {!editing && (
        <button onClick={(e) => { e.stopPropagation(); onMenuToggle(); }} className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      )}
      {menuOpen && (
        <div className="absolute right-0 top-full z-10 w-36 rounded-md border bg-popover py-1 shadow-md">
          <button onClick={onStartRename} className="flex w-full items-center px-3 py-1.5 text-sm hover:bg-muted">Rename</button>
          <button onClick={onPin} className="flex w-full items-center px-3 py-1.5 text-sm hover:bg-muted">{conv.is_pinned ? "Unpin" : "Pin"}</button>
          <button onClick={onDelete} className="flex w-full items-center px-3 py-1.5 text-sm text-destructive hover:bg-muted">Delete</button>
        </div>
      )}
    </div>
  );
}
