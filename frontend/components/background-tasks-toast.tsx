"use client";

import { useChatStore } from "@/store/chat";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function BackgroundTasksToast() {
  const { backgroundTasks, dismissBackgroundTask, selectConversation } = useChatStore();
  const timeoutsRef = useRef<{ [key: number]: ReturnType<typeof setTimeout> }>({});
  const router = useRouter();

  const tasks = Object.values(backgroundTasks);
  if (tasks.length === 0) return null;

  const handleClick = (convId: number) => {
    if (timeoutsRef.current[convId]) {
      clearTimeout(timeoutsRef.current[convId]);
      delete timeoutsRef.current[convId];
    }
    dismissBackgroundTask(convId);
    selectConversation(convId);
    if (window.location.pathname !== "/dashboard") router.push("/dashboard");
  };

  useEffect(() => {
    tasks.forEach((task) => {
      if ((task.status === "done" || task.status === "error") && !timeoutsRef.current[task.convId]) {
        timeoutsRef.current[task.convId] = setTimeout(() => {
          dismissBackgroundTask(task.convId);
          delete timeoutsRef.current[task.convId];
        }, 5000);
      }
    });

    const currentTaskIds = tasks.map((t) => t.convId);
    Object.keys(timeoutsRef.current).forEach((key) => {
      const convId = parseInt(key, 10);
      if (!currentTaskIds.includes(convId)) {
        clearTimeout(timeoutsRef.current[convId]);
        delete timeoutsRef.current[convId];
      }
    });
  }, [tasks, dismissBackgroundTask]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2 items-center">
      <AnimatePresence>
        {tasks.map((task) => (
          <motion.div
            key={task.convId}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-xl cursor-pointer min-w-[280px] max-w-[400px]",
              task.status === "done"
                ? "bg-card/95 border-green-500/30 hover:border-green-500/50"
                : task.status === "error"
                ? "bg-card/95 border-red-500/30"
                : "bg-card/95 border-primary/20 hover:border-primary/40"
            )}
            onClick={() => handleClick(task.convId)}
          >
            {task.status === "running" && (
              <div className="shrink-0 h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
            {task.status === "done" && (
              <div className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            )}
            {task.status === "error" && (
              <div className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate">{task.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {task.status === "done" && "Hoàn thành! Nhấn để xem"}
                {task.status === "error" && "Lỗi xảy ra"}
                {task.status === "running" && (task.step ? task.step : task.type === "generation" ? "Đang tạo nội dung..." : "Đang trả lời...")}
              </p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); dismissBackgroundTask(task.convId); }}
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
