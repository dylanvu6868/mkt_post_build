"use client";

import { AuthGuard } from "@/components/auth-guard";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatPanel } from "@/components/chat-panel";
import { SuggestionPanel } from "@/components/suggestion-panel";
import { BackgroundTasksToast } from "@/components/background-tasks-toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen">
        <ChatSidebar />
        <ChatPanel />
      </div>
      <SuggestionPanel />
      <BackgroundTasksToast />
    </AuthGuard>
  );
}
