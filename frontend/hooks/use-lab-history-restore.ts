"use client";

import { useEffect, useRef } from "react";
import { api } from "@/services/api";

export interface LabHistoryItem {
  id: string;
  tool_name: string;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Khi trang được mở với ?hist={id} (từ trang Lịch sử), tải bản ghi lab_history
 * tương ứng và gọi callback để trang đổ lại cả input lẫn kết quả đã lưu.
 */
export function useLabHistoryRestore(onRestore: (item: LabHistoryItem) => void) {
  const restoredRef = useRef(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  useEffect(() => {
    if (restoredRef.current) return;
    const histId = new URLSearchParams(window.location.search).get("hist");
    if (!histId) return;
    restoredRef.current = true;
    api
      .get<LabHistoryItem>(`/api/lab/history/${histId}`)
      .then((item) => onRestoreRef.current(item))
      .catch(() => {
        /* bản ghi không còn — bỏ qua */
      });
  }, []);
}
