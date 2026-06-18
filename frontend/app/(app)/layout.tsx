"use client";

import { AuthGuard } from "@/components/auth-guard";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatPanel } from "@/components/chat-panel";
import { ContentPanel } from "@/components/content-panel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen">
        <ChatSidebar />
        <ChatPanel />
        <ContentPanel />
      </div>
    </AuthGuard>
  );
}
